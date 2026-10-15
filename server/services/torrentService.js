import WebTorrent from 'webtorrent';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import socketService from './socket.js';

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

class TorrentService {
  constructor() {
    this.client = new WebTorrent({
      maxConns: 55,
      dht: true,
      tracker: true,
    });

    this.activeJobs = new Map(); // projectId -> jobData

    this.client.on('error', (err) => {
      console.error('⚠️ [TorrentService Client Error]:', err.message);
    });

    // Run periodic stalled seeders watchdog every 30 seconds
    setInterval(() => this.checkStalledTorrents(), 30000);
  }

  /**
   * Starts ingestion of a torrent from a .torrent buffer/file path or magnet URI.
   *
   * @param {Object} params
   * @param {string} params.projectId
   * @param {string} params.userId
   * @param {string|Buffer} params.torrentSource - Magnet URI string or Buffer of .torrent file
   * @param {Object} params.projectMeta - Project metadata (title, name, type)
   * @param {Function} params.onSuccess - Callback when video is fully downloaded and moved
   * @param {Function} params.onFail - Callback when torrent fails or is rejected
   */
  async ingestTorrent({ projectId, userId, torrentSource, projectMeta = {}, onSuccess, onFail }) {
    if (this.activeJobs.has(projectId)) {
      throw new Error('A torrent download is already active for this project.');
    }

    const downloadDir = path.join(TORRENTS_BASE_DIR, projectId);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
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
    };

    this.activeJobs.set(projectId, jobData);

    console.log(`🧲 [TorrentService] Adding torrent for project ${projectId}...`);

    socketService.emitProgress(projectId, {
      stage: 'torrent_connecting',
      progress: 0,
      message: 'Connecting to torrent swarm and fetching metadata...',
      status: 'fetching_metadata',
    });

    try {
      this.client.add(
        torrentSource,
        {
          path: downloadDir,
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

    socketService.emitProgress(projectId, {
      stage: 'torrent_downloading',
      progress: 0,
      fileName: targetVideo.name,
      totalBytes: targetVideo.length,
      message: `بدء تحميل الفيديو: ${targetVideo.name} (${(targetVideo.length / (1024 * 1024)).toFixed(1)} MB)`,
      status: 'downloading',
    });

    // Listen for download progress
    torrent.on('download', () => {
      this.handleTorrentProgress(jobData, torrent);
    });

    // Listen for completion
    torrent.on('done', () => {
      this.handleTorrentCompleted(jobData, torrent);
    });

    torrent.on('error', (err) => {
      console.error(`⚠️ [TorrentService] Torrent error on project ${projectId}:`, err.message);
      this.failJob(projectId, err.message, 'download_error');
    });
  }

  /**
   * Throttled progress telemetry handler
   */
  handleTorrentProgress(jobData, torrent) {
    const { projectId, videoFile } = jobData;
    const now = Date.now();

    // Check seeders
    const numPeers = torrent.numPeers || 0;
    jobData.numPeers = numPeers;

    if (numPeers === 0) {
      if (!jobData.zeroSeedsStartTime) {
        jobData.zeroSeedsStartTime = now;
      }
    } else {
      jobData.zeroSeedsStartTime = null; // Reset stall timer when peers are active
    }

    // Throttle socket emissions to once every 800ms
    if (now - jobData.lastEmitTime < 800) return;
    jobData.lastEmitTime = now;

    const downloaded = torrent.downloaded;
    const total = videoFile ? videoFile.length : torrent.length;
    const pct = total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 0;
    const speed = torrent.downloadSpeed || 0; // bytes/sec

    jobData.progress = pct;
    jobData.downloadedBytes = downloaded;
    jobData.downloadSpeed = speed;

    socketService.emitProgress(projectId, {
      stage: 'torrent_downloading',
      progress: pct,
      downloadedBytes: downloaded,
      totalBytes: total,
      downloadSpeed: speed,
      numPeers,
      fileName: videoFile?.name || '',
      message: `جاري تحميل التورنت: ${pct}% (${(downloaded / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB)`,
      status: 'downloading',
    });
  }

  /**
   * Finalizes the downloaded video file and triggers pipeline
   */
  async handleTorrentCompleted(jobData, torrent) {
    const { projectId, userId, downloadDir, videoFile, onSuccess } = jobData;
    console.log(`✅ [TorrentService] Project ${projectId} finished downloading "${videoFile.name}"!`);

    jobData.status = 'completed';
    jobData.progress = 100;

    socketService.emitProgress(projectId, {
      stage: 'torrent_completed',
      progress: 100,
      message: 'اكتمل تحميل ملف الفيديو بنجاح! جاري النقل وبدء المعالجة الذكية...',
      status: 'completed',
    });

    try {
      // Find downloaded file on disk
      const sourceVideoPath = path.join(downloadDir, videoFile.path);

      // Target project dir: server/uploads/{userId}/{projectId}
      const projectTargetDir = path.join(__dirname, '..', 'uploads', userId || 'guest', projectId);
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
          videoPath: finalVideoPath,
          videoFileName: targetFileName,
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
    const job = this.activeJobs.get(projectId);
    if (!job) return null;

    return {
      projectId: job.projectId,
      status: job.status,
      progress: job.progress,
      downloadSpeed: job.downloadSpeed,
      downloadedBytes: job.downloadedBytes,
      totalBytes: job.totalBytes,
      numPeers: job.numPeers,
      videoFileName: job.videoFile?.name || '',
    };
  }

  cleanupJob(projectId, removeFiles = false) {
    const job = this.activeJobs.get(projectId);
    if (removeFiles && job?.downloadDir && fs.existsSync(job.downloadDir)) {
      try {
        fs.rmSync(job.downloadDir, { recursive: true, force: true });
      } catch (e) {}
    }
    this.activeJobs.delete(projectId);
  }
}

export const torrentService = new TorrentService();
export default torrentService;
