import WebTorrent from 'webtorrent';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import socketService from './socket.js';
import { ensureWebCompatibleVideo } from './videoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where temporary torrent chunks are kept during active download
const TORRENTS_BASE_DIR = path.join(__dirname, '..', 'uploads', 'torrents');
if (!fs.existsSync(TORRENTS_BASE_DIR)) {
  fs.mkdirSync(TORRENTS_BASE_DIR, { recursive: true });
}

// 2 GB limit in bytes
const MAX_TORRENT_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
// 30-minute stalled limit in milliseconds
const STALLED_SEED_TIMEOUT_MS = 30 * 60 * 1000;

// High-speed public BitTorrent trackers
const HIGH_SPEED_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://explodie.org:6969/announce',
  'http://nyaa.tracker.wf:7777/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

function formatEta(ms) {
  if (!ms || ms === Infinity || isNaN(ms) || ms < 0) return '--';
  const totalSecs = Math.round(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }
  return `${m}m ${s}s`;
}

class TorrentService {
  constructor() {
    this.client = new WebTorrent({
      maxConns: 55,
      dht: true,
      tracker: true,
    });

    this.activeJobs = new Map(); // projectId -> jobData
    this.completedJobsCache = new Map(); // projectId -> cached status with timestamp

    this.client.on('error', (err) => {
      console.error('⚠️ [TorrentService Client Error]:', err.message);
    });

    // Run periodic stalled seeders watchdog every 30 seconds
    setInterval(() => this.checkStalledTorrents(), 30000);
  }

  /**
   * Starts ingestion of a torrent from a .torrent buffer/file path or magnet URI.
   */
  async ingestTorrent({ projectId, userId, torrentSource, projectMeta = {}, onSuccess, onFail }) {
    if (this.activeJobs.has(projectId)) {
      throw new Error('A torrent download is already active for this project.');
    }

    const downloadDir = path.join(TORRENTS_BASE_DIR, projectId);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Safeguard: Check if this torrent is already active in WebTorrent client to prevent duplicate error
    try {
      const existing = this.client.get(torrentSource);
      if (existing) {
        console.log(`♻️ [TorrentService] Removing pre-existing torrent instance (${existing.infoHash}) before re-adding...`);
        existing.destroy({ destroyStore: false });
      }
    } catch (e) {
      // Ignored
    }

    const jobData = {
      projectId,
      userId,
      downloadDir,
      status: 'fetching_metadata',
      zeroSeedsStartTime: null,
      videoFile: null,
      progress: 0,
      downloadSpeed: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      numPeers: 0,
      onSuccess,
      onFail,
      projectMeta,
      createdAt: Date.now(),
      lastEmitTime: 0,
      telemetryInterval: null,
    };

    this.activeJobs.set(projectId, jobData);

    console.log(`🧲 [TorrentService] Adding torrent for project ${projectId}...`);

    // Immediate initial telemetry emission
    socketService.emitProgress(projectId, {
      stage: 'torrent_connecting',
      progress: 0,
      downloadSpeed: '0.00',
      downloadedMb: '0.0',
      totalMb: '...',
      numPeers: 0,
      numSeeds: 0,
      eta: '--',
      message: 'Connecting to BitTorrent swarm and finding seeds...',
      status: 'fetching_metadata',
    });

    // Start 1-second continuous telemetry heartbeat
    jobData.telemetryInterval = setInterval(() => {
      this.emitTelemetryUpdate(jobData);
    }, 1000);

    try {
      this.client.add(
        torrentSource,
        {
          path: downloadDir,
          announce: HIGH_SPEED_TRACKERS,
          destroyStoreOnDestroy: true,
        },
        (torrent) => {
          jobData.torrent = torrent;
          this.handleTorrentReady(jobData, torrent);
        }
      );
    } catch (err) {
      this.cleanupJob(projectId, true);
      throw err;
    }

    return { success: true, projectId, status: 'fetching_metadata' };
  }

  /**
   * Continuous live telemetry broadcaster (every 1 second)
   */
  emitTelemetryUpdate(jobData) {
    const { projectId, videoFile, torrent } = jobData;
    if (!torrent) {
      socketService.emitProgress(projectId, {
        stage: 'torrent_connecting',
        progress: 0,
        downloadSpeed: '0.00',
        downloadedMb: '0.0',
        totalMb: '...',
        numPeers: 0,
        numSeeds: 0,
        eta: '--',
        message: 'Connecting to BitTorrent swarm and discovering seeds...',
        status: 'fetching_metadata',
      });
      return;
    }

    const numPeers = torrent.numPeers || 0;
    jobData.numPeers = numPeers;

    // Track zero-seeds stall watchdog
    const now = Date.now();
    if (numPeers === 0) {
      if (!jobData.zeroSeedsStartTime) {
        jobData.zeroSeedsStartTime = now;
      }
    } else {
      jobData.zeroSeedsStartTime = null;
    }

    const downloaded = torrent.downloaded || 0;
    const total = videoFile ? videoFile.length : (torrent.length || 0);

    // Precise completion check: either video file reached length, or overall progress completed
    const isVideoDone = (videoFile && (videoFile.done || (videoFile.downloaded !== undefined && videoFile.downloaded >= videoFile.length))) ||
                        (total > 0 && downloaded >= total) ||
                        (torrent.progress >= 0.999 && total > 0) ||
                        (total > 0 && (downloaded / total) >= 0.995);

    const rawPct = total > 0 ? Math.round((downloaded / total) * 100) : (jobData.progress || 0);
    const pct = isVideoDone ? 100 : Math.min(99, Math.max(jobData.progress || 0, rawPct));
    const speedBytes = torrent.downloadSpeed || 0;
    const speedMb = (speedBytes / (1024 * 1024)).toFixed(2);
    const downloadedMb = (downloaded / (1024 * 1024)).toFixed(1);
    const totalMb = total > 0 ? (total / (1024 * 1024)).toFixed(1) : '...';

    const etaFormatted = isVideoDone ? '0m 0s' : formatEta(torrent.timeRemaining);
    const numSeeds = numPeers; // in webtorrent, numPeers is total active peers in swarm

    jobData.progress = pct;
    jobData.downloadedBytes = downloaded;
    jobData.downloadSpeed = speedBytes;

    if (isVideoDone && !jobData.isCompleting) {
      jobData.isCompleting = true;
      jobData.status = 'completed';
      jobData.progress = 100;
      console.log(`🎬 [TorrentService] Video download 100% reached for project ${projectId}! Finalizing...`);
      
      this.completedJobsCache.set(projectId, {
        projectId,
        status: 'completed',
        progress: 100,
        downloadSpeed: '0.00',
        downloadedMb: totalMb,
        totalMb,
        numPeers,
        numSeeds,
        eta: '0m 0s',
        fileName: videoFile?.name || '',
        projectName: jobData.projectMeta?.projectName || '',
        mediaTitle: jobData.projectMeta?.mediaTitle || '',
        message: 'اكتمل تحميل ملف الفيديو بنجاح! جاري النقل وبدء المعالجة الذكية...',
        timestamp: Date.now()
      });

      socketService.emitProgress(projectId, {
        stage: 'torrent_completed',
        progress: 100,
        downloadSpeed: '0.00',
        downloadedMb: totalMb,
        totalMb,
        numPeers,
        numSeeds,
        eta: '0m 0s',
        fileName: videoFile?.name || '',
        message: 'اكتمل تحميل ملف الفيديو بنجاح! جاري النقل وبدء المعالجة الذكية...',
        status: 'completed',
      });
      setTimeout(() => {
        this.handleTorrentCompleted(jobData, torrent);
      }, 300);
      return;
    }

    socketService.emitProgress(projectId, {
      stage: jobData.status === 'fetching_metadata' ? 'torrent_connecting' : 'torrent_downloading',
      progress: pct,
      downloadedBytes: downloaded,
      totalBytes: total,
      downloadedMb,
      totalMb,
      downloadSpeed: speedMb,
      numPeers,
      numSeeds,
      eta: etaFormatted,
      fileName: videoFile?.name || '',
      message: jobData.status === 'fetching_metadata'
        ? `جاري الاتصال بالسرب وجلب بيانات الملف (${numPeers} متصلين)...`
        : `جاري تحميل التورنت: ${pct}% (${downloadedMb} / ${totalMb} MB) بسرعة ${speedMb} MB/s`,
      status: jobData.status,
    });
  }

  /**
   * Validates metadata once received and starts selective downloading
   */
  handleTorrentReady(jobData, torrent) {
    const { projectId } = jobData;

    console.log(`🧲 [TorrentService] Metadata received for project ${projectId}. Total files: ${torrent.files.length}`);

    // Inspect files
    const videoFiles = torrent.files.filter((f) =>
      /\.(mp4|mkv|avi|mov|webm|m4v)$/i.test(f.name)
    );

    // Rule 1: Single Video File Enforcement
    if (videoFiles.length === 0) {
      const errMsg = 'لم يتم العثور على أي ملف فيديو صالح في ملف التورنت. يرجى توفير تورنت يحتوي على حلقة فيديو بصيغة مدعومة (MP4, MKV, AVI).';
      console.warn(`❌ [TorrentService] ${projectId}: No video files found.`);
      this.failJob(projectId, errMsg, 'no_video_files');
      return;
    }

    if (videoFiles.length > 1) {
      const errMsg = 'حزم التورنت المتعددة غير مسموحة. يرجى توفير تورنت يحتوي على حلقة فيديو واحدة فقط وليس حزمة حلقات متعددة.';
      console.warn(`❌ [TorrentService] ${projectId}: Multiple videos (${videoFiles.length}) rejected.`);
      this.failJob(projectId, errMsg, 'multiple_videos_rejected');
      return;
    }

    const targetVideo = videoFiles[0];

    // Rule 2: Maximum File Size Limit (2 GB)
    if (targetVideo.length > MAX_TORRENT_VIDEO_BYTES) {
      const sizeMb = (targetVideo.length / (1024 * 1024)).toFixed(1);
      const errMsg = `حجم ملف الفيديو (${sizeMb} MB) يتجاوز الحد الأقصى المسموح به وهو 2 جيجابايت.`;
      console.warn(`❌ [TorrentService] ${projectId}: File size (${sizeMb} MB) exceeds 2GB limit.`);
      this.failJob(projectId, errMsg, 'size_exceeded');
      return;
    }

    // Rule 3: Selective Download - deselect everything except the video file
    torrent.files.forEach((file) => {
      if (file !== targetVideo) {
        file.deselect();
      }
    });
    targetVideo.select();

    jobData.videoFile = targetVideo;
    jobData.totalBytes = targetVideo.length;
    jobData.status = 'downloading';

    console.log(`🎬 [TorrentService] Selected single video: "${targetVideo.name}" (${(targetVideo.length / (1024 * 1024)).toFixed(1)} MB)`);

    // Force immediate telemetry refresh
    this.emitTelemetryUpdate(jobData);

    // Listen for completion
    if (targetVideo && typeof targetVideo.on === 'function') {
      targetVideo.on('done', () => {
        if (!jobData.isCompleting) {
          jobData.isCompleting = true;
          this.handleTorrentCompleted(jobData, torrent);
        }
      });
    }

    torrent.on('done', () => {
      if (!jobData.isCompleting) {
        jobData.isCompleting = true;
        this.handleTorrentCompleted(jobData, torrent);
      }
    });

    torrent.on('error', (err) => {
      console.error(`⚠️ [TorrentService] Torrent error on project ${projectId}:`, err.message);
      this.failJob(projectId, err.message, 'download_error');
    });
  }

  /**
   * Finalizes the downloaded video file and triggers pipeline
   */
  async handleTorrentCompleted(jobData, torrent) {
    const { projectId, userId, downloadDir, videoFile, onSuccess } = jobData;
    console.log(`✅ [TorrentService] Project ${projectId} finished downloading "${videoFile.name}"!`);

    if (jobData.telemetryInterval) {
      clearInterval(jobData.telemetryInterval);
      jobData.telemetryInterval = null;
    }

    jobData.status = 'completed';
    jobData.progress = 100;

    const totalMb = videoFile ? (videoFile.length / (1024 * 1024)).toFixed(1) : '...';
    this.completedJobsCache.set(projectId, {
      projectId,
      status: 'completed',
      progress: 100,
      downloadSpeed: '0.00',
      downloadedMb: totalMb,
      totalMb: totalMb,
      numPeers: torrent.numPeers || 0,
      numSeeds: torrent.numPeers || 0,
      eta: '0m 0s',
      videoFileName: videoFile?.name || '',
      projectName: jobData.projectMeta?.projectName || '',
      mediaTitle: jobData.projectMeta?.mediaTitle || '',
      projectType: jobData.projectMeta?.projectType || 'episode',
      userId: userId || 'usr_guest',
      createdAt: jobData.createdAt || Date.now(),
      timestamp: Date.now(),
    });

    socketService.emitProgress(projectId, {
      stage: 'torrent_completed',
      progress: 100,
      downloadSpeed: '0.00',
      downloadedMb: (videoFile.length / (1024 * 1024)).toFixed(1),
      totalMb: (videoFile.length / (1024 * 1024)).toFixed(1),
      numPeers: torrent.numPeers || 0,
      numSeeds: torrent.numPeers || 0,
      eta: '0m 0s',
      message: 'اكتمل تحميل ملف الفيديو بنجاح! جاري النقل وبدء المعالجة الذكية...',
      status: 'completed',
    });

    try {
      // Find downloaded file on disk
      const sourceVideoPath = path.join(downloadDir, videoFile.path);

      // Target project dir: server/uploads/{userId}/{safeFolderName}/{projectId}
      const safeFolderName = (jobData.projectMeta?.safeFolderName || jobData.projectMeta?.projectName || 'Uncategorized').replace(/[/\\?%*:|"<>]/g, '_').trim();
      const projectTargetDir = path.join(__dirname, '..', 'uploads', userId || 'guest', safeFolderName, projectId);
      if (!fs.existsSync(projectTargetDir)) {
        fs.mkdirSync(projectTargetDir, { recursive: true });
      }

      // Preserve original extension or normalize to mp4/mkv
      const ext = path.extname(videoFile.name) || '.mp4';
      const targetFileName = `video${ext}`;
      const finalVideoPath = path.join(projectTargetDir, targetFileName);

      // Copy/Move video file
      fs.copyFileSync(sourceVideoPath, finalVideoPath);
      console.log(`📦 [TorrentService] Moved completed video to: ${finalVideoPath}`);

      let effectiveVideoFileName = targetFileName;
      let effectiveVideoPath = finalVideoPath;

      // Ensure MKV is automatically remuxed into a web-compatible MP4
      if (ext.toLowerCase() !== '.mp4') {
        try {
          console.log(`🎬 [TorrentService] Automatically ensuring web compatibility for ${targetFileName}...`);
          const webRes = await ensureWebCompatibleVideo(finalVideoPath, projectTargetDir);
          if (webRes && webRes.converted) {
            effectiveVideoFileName = webRes.fileName;
            effectiveVideoPath = webRes.mp4Path;
            console.log(`✅ [TorrentService] Web-compatible MP4 created: ${effectiveVideoPath}`);
          }
        } catch (convErr) {
          console.warn(`⚠️ [TorrentService] Automatic web conversion warning:`, convErr.message);
        }
      }

      // Destroy torrent cleanly to release memory and lock
      torrent.destroy({ destroyStore: true }, () => {
        // Clean up temporary torrent chunks dir
        if (fs.existsSync(downloadDir)) {
          fs.rmSync(downloadDir, { recursive: true, force: true });
        }
      });

      this.activeJobs.delete(projectId);

      // Call onSuccess callback
      if (typeof onSuccess === 'function') {
        onSuccess({
          projectId,
          userId,
          videoPath: effectiveVideoPath,
          videoFileName: effectiveVideoFileName,
          originalName: videoFile.name,
          fileSize: videoFile.length,
          projectTargetDir,
        });
      }
    } catch (err) {
      console.error(`❌ [TorrentService] Failed to finalize video file for ${projectId}:`, err);
      this.failJob(projectId, 'فشل نقل ملف الفيديو المكتمل: ' + err.message, 'finalize_error');
    }
  }

  /**
   * Stalled Watchdog: Checks if any torrent has had 0 seeds for > 30 minutes
   */
  checkStalledTorrents() {
    const now = Date.now();

    for (const [projectId, job] of this.activeJobs.entries()) {
      if (job.status === 'downloading' && job.zeroSeedsStartTime) {
        const stalledDuration = now - job.zeroSeedsStartTime;
        if (stalledDuration >= STALLED_SEED_TIMEOUT_MS) {
          console.warn(`⏰ [TorrentService] Project ${projectId} stalled with 0 seeders for 30 minutes. Aborting.`);
          const errMsg = 'تعذر إكمال تحميل ملف التورنت لعدم توفر متصلين (Seeds) لأكثر من 30 دقيقة.';
          this.failJob(projectId, errMsg, 'failed_no_seeds');
        }
      }
    }
  }

  /**
   * Fails and cleans up a torrent job
   */
  failJob(projectId, errorMessage, reasonCode = 'failed') {
    const jobData = this.activeJobs.get(projectId);
    if (!jobData) return;

    if (jobData.telemetryInterval) {
      clearInterval(jobData.telemetryInterval);
      jobData.telemetryInterval = null;
    }

    jobData.status = 'failed';

    socketService.emitProgress(projectId, {
      stage: 'torrent_failed',
      progress: 0,
      error: errorMessage,
      reasonCode,
      message: errorMessage,
      status: 'failed',
    });

    if (jobData.torrent) {
      try {
        jobData.torrent.destroy({ destroyStore: true }, () => {});
      } catch (e) {}
    }

    this.cleanupJob(projectId, true);

    if (typeof jobData.onFail === 'function') {
      jobData.onFail(new Error(errorMessage), reasonCode);
    }
  }

  /**
   * Cancel an active torrent on user demand
   */
  cancelJob(projectId) {
    const job = this.activeJobs.get(projectId);
    if (!job) return false;

    console.log(`🛑 [TorrentService] Cancelling torrent for project ${projectId} on user request.`);
    if (job.telemetryInterval) {
      clearInterval(job.telemetryInterval);
      job.telemetryInterval = null;
    }

    if (job.torrent) {
      try {
        job.torrent.destroy({ destroyStore: true }, () => {});
      } catch (e) {}
    }

    this.cleanupJob(projectId, true);
    return true;
  }

  /**
   * Get active status of a job
   */
  getJobStatus(projectId) {
    const now = Date.now();
    // Clean up cache older than 10 minutes
    for (const [id, entry] of this.completedJobsCache.entries()) {
      if (now - (entry.timestamp || 0) > 10 * 60 * 1000) {
        this.completedJobsCache.delete(id);
      }
    }

    const job = this.activeJobs.get(projectId);
    if (!job) {
      const cached = this.completedJobsCache.get(projectId);
      if (cached) return cached;
      return null;
    }

    const torrent = job.torrent;
    const numPeers = torrent?.numPeers || job.numPeers || 0;
    const downloaded = torrent?.downloaded || job.downloadedBytes || 0;
    const total = job.videoFile ? job.videoFile.length : (torrent?.length || job.totalBytes || 0);
    const speedBytes = torrent?.downloadSpeed || job.downloadSpeed || 0;

    const isVideoDone = (job.videoFile && (job.videoFile.done || (job.videoFile.downloaded !== undefined && job.videoFile.downloaded >= job.videoFile.length))) ||
                        (total > 0 && downloaded >= total) ||
                        (torrent && torrent.progress >= 0.999 && total > 0) ||
                        (total > 0 && (downloaded / total) >= 0.995) ||
                        job.progress === 100 ||
                        job.status === 'completed';

    const rawPct = total > 0 ? Math.round((downloaded / total) * 100) : (job.progress || 0);
    const pct = isVideoDone ? 100 : Math.min(99, Math.max(job.progress || 0, rawPct));
    const speedMb = (speedBytes / (1024 * 1024)).toFixed(2);
    const downloadedMb = (downloaded / (1024 * 1024)).toFixed(1);
    const totalMb = total > 0 ? (total / (1024 * 1024)).toFixed(1) : '...';

    const statusObj = {
      projectId: job.projectId,
      status: isVideoDone ? 'completed' : job.status,
      progress: pct,
      downloadSpeed: speedMb,
      downloadedMb,
      totalMb,
      numPeers,
      numSeeds: numPeers,
      eta: isVideoDone ? '0m 0s' : formatEta(torrent?.timeRemaining),
      videoFileName: job.videoFile?.name || '',
      projectName: job.projectMeta?.projectName || '',
      mediaTitle: job.projectMeta?.mediaTitle || '',
      projectType: job.projectMeta?.projectType || 'episode',
      userId: job.userId || 'usr_guest',
      createdAt: job.createdAt || now,
    };

    if (isVideoDone) {
      this.completedJobsCache.set(projectId, { ...statusObj, timestamp: now });
    }

    return statusObj;
  }

  /**
   * Get all active and recently completed torrent jobs for background tasks monitor
   */
  getAllActiveJobs() {
    const list = [];
    const seen = new Set();

    for (const [projectId] of this.activeJobs.entries()) {
      const st = this.getJobStatus(projectId);
      if (st) {
        list.push(st);
        seen.add(projectId);
      }
    }

    const now = Date.now();
    for (const [projectId, entry] of this.completedJobsCache.entries()) {
      if (!seen.has(projectId) && (now - (entry.timestamp || 0) < 5 * 60 * 1000)) {
        list.push(entry);
        seen.add(projectId);
      }
    }

    return list;
  }

  cleanupJob(projectId, removeFiles = false) {
    const job = this.activeJobs.get(projectId);
    if (job?.telemetryInterval) {
      clearInterval(job.telemetryInterval);
      job.telemetryInterval = null;
    }
    if (removeFiles && job?.downloadDir && fs.existsSync(job.downloadDir)) {
      try {
        fs.rmSync(job.downloadDir, { recursive: true, force: true });
      } catch (e) {}
    }
    this.activeJobs.delete(projectId);
    this.completedJobsCache.delete(projectId);
  }
}

export const torrentService = new TorrentService();
export default torrentService;
