import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { GoogleGenAI } from '@google/genai';
import geminiPool from './geminiPool.js';
import cloudStorage from './storage.js';
import { ensureWebCompatibleVideo } from './videoService.js';
import { detectCharactersFromSubtitles } from './characterService.js';
import { detectVisualSignsFromVideo } from './visionOcrService.js';
import db from './db.js';
import { logSystemEvent } from './logService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// Resolve FFmpeg path dynamically
let resolvedFfmpegPath = ffmpegInstaller?.path;
if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
  resolvedFfmpegPath = process.env.FFMPEG_PATH;
} else if (!resolvedFfmpegPath || !fs.existsSync(resolvedFfmpegPath)) {
  if (fs.existsSync('/usr/bin/ffmpeg')) resolvedFfmpegPath = '/usr/bin/ffmpeg';
  else if (fs.existsSync('/usr/local/bin/ffmpeg')) resolvedFfmpegPath = '/usr/local/bin/ffmpeg';
}
if (resolvedFfmpegPath) ffmpeg.setFfmpegPath(resolvedFfmpegPath);

export function sanitizeGeminiModel(modelName) {
  if (!modelName || typeof modelName !== 'string') return 'gemini-3.8-flash';
  let cleaned = modelName.trim().replace(/^models\//, '');
  if (cleaned.includes('1.5-flash')) return 'gemini-3.8-flash';
  if (cleaned.includes('1.5-pro')) return 'gemini-pro-latest';
  return cleaned || 'gemini-3.8-flash';
}

export function parseTimestampToSeconds(ts) {
  try {
    const parts = ts.replace('.', ',').split(',');
    const timeParts = parts[0].split(':');
    let hours = 0, minutes = 0, seconds = 0;
    if (timeParts.length === 3) {
      hours = parseInt(timeParts[0], 10) || 0;
      minutes = parseInt(timeParts[1], 10) || 0;
      seconds = parseInt(timeParts[2], 10) || 0;
    } else if (timeParts.length === 2) {
      hours = 0;
      minutes = parseInt(timeParts[0], 10) || 0;
      seconds = parseInt(timeParts[1], 10) || 0;
    } else if (timeParts.length === 1) {
      seconds = parseInt(timeParts[0], 10) || 0;
    }
    const millis = parseInt(parts[1], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds + millis / 1000;
  } catch (e) {
    return 0;
  }
}

export function formatSecondsToTimestamp(secs) {
  const safeSecs = Math.max(0, Number(secs) || 0);
  const hours = Math.floor(safeSecs / 3600);
  const minutes = Math.floor((safeSecs % 3600) / 60);
  const seconds = Math.floor(safeSecs % 60);
  const millis = Math.round((safeSecs - Math.floor(safeSecs)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function findProjectDirectories(userId, projectName, projectId, explicitVideoUrl = null) {
  const safeFolderName = projectName ? projectName.replace(/[\/\\?%*:|"<>]/g, '_').trim() : 'Uncategorized';
  const isVideoExt = (f) => f.startsWith('video.') || /\.(mp4|mkv|avi|mov|webm|flv|ts|wmv|m4v)$/i.test(f);

  if (explicitVideoUrl && typeof explicitVideoUrl === 'string' && !explicitVideoUrl.startsWith('http')) {
    const cleanUrl = explicitVideoUrl.startsWith('/') ? explicitVideoUrl.slice(1) : explicitVideoUrl;
    const candidates = [
      path.join(__dirname, '..', cleanUrl),
      path.join(UPLOADS_DIR, cleanUrl.replace(/^uploads\/?/, ''))
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        const dir = path.dirname(cand);
        const dirFiles = fs.readdirSync(dir).filter(isVideoExt);
        const urlPrefix = path.dirname(explicitVideoUrl);
        return {
          targetDir: dir,
          urlPrefix: urlPrefix.startsWith('/') ? urlPrefix : `/${urlPrefix}`,
          safeFolderName,
          videoFiles: dirFiles.length > 0 ? dirFiles : [path.basename(cand)]
        };
      }
    }
  }

  const candidateDirs = [
    { dir: path.join(UPLOADS_DIR, userId, safeFolderName, projectId), prefix: `/uploads/${userId}/${safeFolderName}/${projectId}` },
    { dir: path.join(UPLOADS_DIR, userId, projectName || 'Uncategorized', projectId), prefix: `/uploads/${userId}/${projectName || 'Uncategorized'}/${projectId}` },
    { dir: path.join(UPLOADS_DIR, userId, 'Uncategorized', projectId), prefix: `/uploads/${userId}/Uncategorized/${projectId}` },
    { dir: path.join(UPLOADS_DIR, userId, projectId), prefix: `/uploads/${userId}/${projectId}` },
    { dir: path.join(UPLOADS_DIR, projectId), prefix: `/uploads/${projectId}` }
  ];

  for (const cand of candidateDirs) {
    if (fs.existsSync(cand.dir)) {
      const files = fs.readdirSync(cand.dir).filter(isVideoExt);
      if (files.length > 0) {
        return { targetDir: cand.dir, urlPrefix: cand.prefix, safeFolderName, videoFiles: files };
      }
    }
  }

  const defaultTargetDir = path.join(UPLOADS_DIR, userId, safeFolderName, projectId);
  const defaultUrlPrefix = `/uploads/${userId}/${safeFolderName}/${projectId}`;
  const defaultVideoFiles = fs.existsSync(defaultTargetDir) ? fs.readdirSync(defaultTargetDir).filter(isVideoExt) : [];

  return { targetDir: defaultTargetDir, urlPrefix: defaultUrlPrefix, safeFolderName, videoFiles: defaultVideoFiles };
}

export function probeVideoDuration(videoPath) {
  return new Promise((resolve) => {
    try {
      if (!resolvedFfmpegPath || !fs.existsSync(resolvedFfmpegPath)) return resolve(0);
      execFile(resolvedFfmpegPath, ['-i', videoPath], (err, stdout, stderr) => {
        const match = (stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
        if (match) {
          const secs = Math.round(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
          return resolve(Math.max(1, secs));
        }
        resolve(0);
      });
    } catch (_) {
      resolve(0);
    }
  });
}

export function extractAudioTrack(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`[Audio Extractor] Extracting audio track: ${videoPath} -> ${audioPath}`);
    ffmpeg(videoPath)
      .output(audioPath)
      .outputOptions(['-y', '-vn', '-acodec libmp3lame', '-ab 128k', '-ar 44100', '-ac 2', '-map 0:a:0?'])
      .on('end', () => {
        try {
          const stats = fs.statSync(audioPath);
          if (stats.size < 100) return reject(new Error(`Extracted audio file is empty or corrupted (${stats.size} bytes)`));
          console.log(`[Audio Extractor] Extraction completed: ${audioPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
          resolve(audioPath);
        } catch (statErr) {
          reject(statErr);
        }
      })
      .on('error', (err) => reject(new Error(`Audio extraction error: ${err.message}`)))
      .run();
  });
}

export async function prepareAudioPartForGemini(ai, chunkPath, strategy = 'file_api') {
  const chunkStats = fs.existsSync(chunkPath) ? fs.statSync(chunkPath) : null;
  const chunkSizeMb = chunkStats ? chunkStats.size / (1024 * 1024) : 0;

  if (strategy === 'inline_base64' || chunkSizeMb <= 15) {
    const base64Data = fs.readFileSync(chunkPath).toString('base64');
    return { inlineData: { data: base64Data, mimeType: 'audio/mp3' }, mode: 'inline' };
  }

  try {
    const uploadResult = await ai.files.upload({ file: chunkPath, mimeType: 'audio/mpeg' });
    await new Promise(r => setTimeout(r, 1500));
    const mime = uploadResult.mimeType || 'audio/mpeg';
    return { fileData: { fileUri: uploadResult.uri, mimeType: mime }, mode: 'file_api', fileUri: uploadResult.uri };
  } catch (uploadErr) {
    const base64Data = fs.readFileSync(chunkPath).toString('base64');
    return { inlineData: { data: base64Data, mimeType: 'audio/mp3' }, mode: 'inline_fallback' };
  }
}

export async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Full Pipeline Execution (Web Remuxing, Audio Extraction, Parallel Chunks, Gemini Translation, Vision OCR, Characters, DB persistence)
 */
export async function processVideoJob(jobData, progressCallback = null) {
  const { projectId, videoDurationSecs, userId: explicitUserId } = jobData;
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Valid projectId string is required');
  }

  const project = db.getProject ? db.getProject(projectId) : db.readProjects(true)[projectId];
  if (!project) throw new Error(`Project not found: ${projectId}`);

  // Return cached result if already completed
  if (project.processingProgress === 100 && project.status === 'ready') {
    const fullProj = db.getFullProject(projectId);
    if (fullProj && fullProj.subtitles && fullProj.subtitles.length > 0) {
      return { success: true, projectId, project: fullProj };
    }
  }

  const userId = explicitUserId || project.ownerId || 'usr_guest';
  const { targetDir, urlPrefix, safeFolderName, videoFiles } = findProjectDirectories(userId, project.projectName, projectId, project.videoUrl);

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  let foundVideoFile = videoFiles.length > 0 ? videoFiles[0] : null;
  if (!foundVideoFile && fs.existsSync(targetDir)) {
    const allFiles = fs.readdirSync(targetDir);
    foundVideoFile = allFiles.find(f => /\.(mp4|mkv|avi|mov|webm|flv|ts|wmv|m4v)$/i.test(f) || f.startsWith('video.'));
  }

  if (!foundVideoFile) throw new Error(`Video file not found for project ${projectId} in ${targetDir}`);

  let videoPath = path.join(targetDir, foundVideoFile);
  const audioPath = path.join(targetDir, 'audio.mp3');
  const srtPath = path.join(targetDir, 'subtitle.srt');

  // Remux to web-compatible MP4 if MKV
  if (path.extname(foundVideoFile).toLowerCase() !== '.mp4') {
    try {
      const webRes = await ensureWebCompatibleVideo(videoPath, targetDir);
      if (webRes && webRes.converted) {
        videoPath = webRes.mp4Path;
        project.videoUrl = `${urlPrefix}/${webRes.fileName}`;
      }
    } catch (convErr) {
      console.warn('⚠️ [Process] Web conversion warning:', convErr.message);
    }
  }

  let finalDurationSecs = Number(videoDurationSecs) || 0;
  if (finalDurationSecs <= 0) {
    finalDurationSecs = await probeVideoDuration(videoPath);
  }

  const emit = (extract, transcode, translate, status, overall, stage = 'processing') => {
    const freshDb = db.readProjects();
    if (freshDb[projectId]) {
      if (extract !== undefined) freshDb[projectId].progressExtract = extract;
      if (transcode !== undefined) freshDb[projectId].progressTranscode = transcode;
      if (translate !== undefined) freshDb[projectId].progressTranslate = translate;
      if (status !== undefined) freshDb[projectId].processingStatus = status;
      if (overall !== undefined) freshDb[projectId].processingProgress = overall;
      freshDb[projectId].processingStage = stage;
      freshDb[projectId].status = overall === 100 ? 'ready' : 'processing';
      freshDb[projectId].updatedAt = new Date().toISOString();
      db.writeProjects(freshDb);
    }
    if (progressCallback) {
      progressCallback(extract, transcode, translate, status, overall, stage);
    }
  };

  logSystemEvent('info', 'video_proc', `Started AI pipeline for "${project.projectName}" (${projectId})`, {
    projectId,
    durationSecs: finalDurationSecs
  });

  // Step 1: Extract Audio
  emit(25, 0, 0, 'Extracting Japanese audio track...', 10, 'audio_extraction');
  await extractAudioTrack(videoPath, audioPath);
  emit(100, 0, 0, 'Audio extraction complete.', 25, 'audio_extraction');

  project.audioUrl = `${urlPrefix}/audio.mp3`;

  // Asynchronous Cloudflare R2 Archival (runs in background without slowing down AI pipeline)
  let r2UploadPromise = null;
  if (cloudStorage.isConfigured() && !project.videoUrl?.startsWith('http')) {
    const r2Key = `uploads/${userId}/${safeFolderName}/${projectId}/${path.basename(videoPath)}`;
    r2UploadPromise = cloudStorage.uploadFile(videoPath, r2Key, 'video/mp4')
      .then(uploadRes => {
        if (uploadRes && uploadRes.publicUrl) {
          console.log(`☁️ [Cloudflare R2] Video synced to CDN: ${uploadRes.publicUrl}`);
          project.videoUrl = uploadRes.publicUrl;
          project.r2Uploaded = true;
          const freshDb = db.readProjects();
          if (freshDb[projectId]) {
            freshDb[projectId].videoUrl = uploadRes.publicUrl;
            freshDb[projectId].r2Uploaded = true;
            db.writeProjects(freshDb);
          }
        }
      })
      .catch(r2Err => {
        console.warn(`⚠️ [Cloudflare R2] Background video sync warning:`, r2Err.message);
      });
  }

  // Step 2: Split Audio into 120-second Chunks
  const settings = db.readSettings();
  const chunkDuration = Number(settings.audioChunkDurationSec) || 120;
  const chunksDir = path.join(targetDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    try { fs.rmSync(chunksDir, { recursive: true, force: true }); } catch (_) {}
  }
  fs.mkdirSync(chunksDir, { recursive: true });

  emit(100, 10, 0, 'Splitting audio into chunks...', 28, 'audio_splitting');
  await new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .outputOptions(['-y', '-f segment', `-segment_time ${chunkDuration}`, '-c copy'])
      .output(path.join(chunksDir, 'chunk_%03d.mp3'))
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  let chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.mp3')).sort();
  if (chunkFiles.length === 0 && fs.existsSync(audioPath)) {
    fs.copyFileSync(audioPath, path.join(chunksDir, 'chunk_000.mp3'));
    chunkFiles = ['chunk_000.mp3'];
  }

  console.log(`[VideoPipeline] Segmented into ${chunkFiles.length} chunk(s) for ${projectId}. Starting parallel processing...`);

  // Step 3: Parallel Chunk Processing (Concurrency: 3)
  const targetModel = sanitizeGeminiModel(settings.geminiModel || 'gemini-3.8-flash');
  const fallbackModel = sanitizeGeminiModel(settings.fallbackModel1 || 'gemini-flash-latest');
  const secondaryFallbackModel = sanitizeGeminiModel(settings.fallbackModel2 || 'gemini-pro-latest');
  let completedChunksCount = 0;

  const chunkResults = await mapConcurrent(chunkFiles, 3, async (chunkFile, i) => {
    const chunkPath = path.join(chunksDir, chunkFile);
    let chunkKeyInfo = null;
    try {
      chunkKeyInfo = geminiPool.acquireKey();
    } catch (e) {
      const fallbackKey = process.env.GEMINI_API_KEY || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
      if (fallbackKey) {
        chunkKeyInfo = { keyId: 'fallback', maskedKey: 'fallback', rawKey: fallbackKey, client: new GoogleGenAI({ apiKey: fallbackKey }) };
      } else {
        throw e;
      }
    }

    const ai = chunkKeyInfo.client;
    try {
      const strategy = settings.apiIngestionStrategy || 'file_api';
      const audioPart = await prepareAudioPartForGemini(ai, chunkPath, strategy);

      // Stage 1: Japanese ASR
      const promptStage1 = `You are an expert anime Japanese ASR engine.
Analyze the provided Japanese audio track carefully and TRANSCRIBE EVERY SINGLE SPOKEN DIALOGUE LINE and AUDIBLE SONG VOCAL from the very first second to the absolute end of the audio file. DO NOT stop early!

CRITICAL RULES:
1. COMPLETE COVERAGE: Transcribe every spoken word and audible song vocal up to the final second.
2. DUAL-TRACK SIMULTANEOUS AUDIO RULE:
   - When a character speaks while an insert song or background song has audible singing/lyrics:
     You MUST transcribe BOTH events as separate objects!
     - Set "track": "dialogue" for the character's speech.
     - Set "track": "song" for song lyrics, and prefix/suffix with musical notes (e.g. '♪ [Lyrics] ♪').
3. MAXIMUM DURATION: A single subtitle block must NOT exceed 5 seconds of screen time.
4. ZERO-BASED TIMESTAMPS: Start timestamps from 00:00:00,000 for this chunk.
Return ONLY a valid JSON array of objects with keys: "id", "startTime", "endTime", "japaneseText", "track".`;

      const stage1Config = {
        contents: [{ role: 'user', parts: [audioPart, { text: promptStage1 }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
      };

      let response1;
      try {
        response1 = await ai.models.generateContent({ model: targetModel, ...stage1Config });
      } catch (err) {
        try { response1 = await ai.models.generateContent({ model: fallbackModel, ...stage1Config }); }
        catch (_) { response1 = await ai.models.generateContent({ model: secondaryFallbackModel, ...stage1Config }); }
      }

      let jpSubtitles = [];
      try {
        const rawText1 = (response1?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        jpSubtitles = JSON.parse(rawText1);
      } catch (_) {
        jpSubtitles = [];
      }

      if (!Array.isArray(jpSubtitles) || jpSubtitles.length === 0) {
        if (chunkKeyInfo.keyId !== 'fallback') geminiPool.releaseKey(chunkKeyInfo.keyId, true);
        return [];
      }

      // Stage 2: Translation to Arabic & English
      const promptStage2 = `You are an expert anime subtitle translator for MSOMS-Anime.
Translate each line into English and fluent Arabic (فصحى احترافية).
Input JSON:
${JSON.stringify(jpSubtitles)}
Return ONLY the updated valid JSON array with keys: "id", "startTime", "endTime", "track", "japaneseText", "englishText", "arabicText".`;

      const stage2Config = {
        contents: [{ role: 'user', parts: [{ text: promptStage2 }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
      };

      let response2;
      try {
        response2 = await ai.models.generateContent({ model: targetModel, ...stage2Config });
      } catch (_) {
        try { response2 = await ai.models.generateContent({ model: fallbackModel, ...stage2Config }); }
        catch (_) { response2 = await ai.models.generateContent({ model: secondaryFallbackModel, ...stage2Config }); }
      }

      let translatedSubtitles = [];
      try {
        const rawText2 = (response2?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        translatedSubtitles = JSON.parse(rawText2);
      } catch (_) {
        translatedSubtitles = jpSubtitles;
      }

      if (chunkKeyInfo.keyId !== 'fallback') geminiPool.releaseKey(chunkKeyInfo.keyId, true);

      // Add timestamp offsets
      const offsetSeconds = i * chunkDuration;
      const parsedChunkSubs = (translatedSubtitles || []).map(sub => {
        const sSec = parseTimestampToSeconds(sub.startTime || '00:00:00,000') + offsetSeconds;
        const eSec = parseTimestampToSeconds(sub.endTime || '00:00:02,000') + offsetSeconds;
        return {
          startTime: formatSecondsToTimestamp(sSec),
          endTime: formatSecondsToTimestamp(eSec),
          startSeconds: sSec,
          endSeconds: eSec,
          track: sub.track || 'dialogue',
          japaneseText: sub.japaneseText || '',
          englishText: sub.englishText || '',
          arabicText: sub.arabicText || '',
          approved: false,
          auditNotes: ''
        };
      });

      completedChunksCount++;
      const currentPct = Math.round(30 + (completedChunksCount / chunkFiles.length) * 50);
      emit(100, Math.round((completedChunksCount / chunkFiles.length) * 100), Math.round((completedChunksCount / chunkFiles.length) * 100), `Transcribing & translating chunks (${completedChunksCount}/${chunkFiles.length})...`, currentPct, 'translating');

      return parsedChunkSubs;
    } catch (err) {
      if (chunkKeyInfo && chunkKeyInfo.keyId !== 'fallback') geminiPool.releaseKey(chunkKeyInfo.keyId, false, err);
      console.warn(`[Chunk Error] Chunk ${i + 1} error: ${err.message}`);
      return [];
    }
  });

  const allParsedSubtitles = chunkResults.flat();
  allParsedSubtitles.sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));
  allParsedSubtitles.forEach((s, idx) => { s.id = idx + 1; });

  // Stage 4: Detect Characters
  emit(100, 100, 100, 'فحص شخصيات الأنمي وبطاقات التعريف...', 85, 'characters');
  try {
    const charactersDir = path.join(targetDir, 'characters');
    const detectedCharacters = await detectCharactersFromSubtitles(allParsedSubtitles, geminiPool, {
      videoPath,
      charactersDir,
      urlPrefix
    });
    project.characters = detectedCharacters;
  } catch (charErr) {
    project.characters = [];
  }

  // Stage 5: Vision OCR
  emit(100, 100, 100, 'فحص اللوحات والنصوص في الفيديو (Vision OCR)...', 93, 'vision_ocr');
  try {
    const signsDir = path.join(targetDir, 'visual_signs');
    const detectedSigns = await detectVisualSignsFromVideo(videoPath, geminiPool, {
      signsDir,
      urlPrefix,
      modelName: settings.visionOcrModel || 'gemini-3.8-flash'
    });
    project.visualSigns = detectedSigns;
  } catch (visErr) {
    project.visualSigns = [];
  }

  // Write SRT File
  let srtContent = '';
  allParsedSubtitles.forEach((sub, idx) => {
    srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.arabicText || sub.englishText}\n\n`;
  });
  fs.writeFileSync(srtPath, srtContent, 'utf8');
  project.srtUrl = `${urlPrefix}/subtitle.srt`;
  project.updatedAt = new Date().toISOString();
  project.processingProgress = 100;
  project.processingStatus = "Completed";
  project.status = "ready";
  project.isUnread = true;
  project.subtitlesCount = allParsedSubtitles.length;

  // Save individual subtitle file & metadata
  db.saveProjectSubtitles(projectId, allParsedSubtitles);

  if (r2UploadPromise) {
    try {
      // Allow up to 8s for background R2 sync before finishing project
      await Promise.race([
        r2UploadPromise,
        new Promise(resolve => setTimeout(resolve, 8000))
      ]);
    } catch (_) {}
  }

  const freshDb = db.readProjects();
  freshDb[projectId] = {
    ...(freshDb[projectId] || {}),
    ...project,
    subtitles: []
  };
  db.writeProjects(freshDb);

  emit(100, 100, 100, 'اكتملت جميع مراحل المعالجة بنجاح!', 100, 'ready');

  logSystemEvent('info', 'video_proc', `Completed AI processing for "${project.projectName}" (${projectId}): ${allParsedSubtitles.length} lines.`, {
    projectId,
    linesCount: allParsedSubtitles.length
  });

  return {
    success: true,
    projectId,
    subtitlesCount: allParsedSubtitles.length,
    srtUrl: project.srtUrl,
    audioUrl: project.audioUrl
  };
}

export default {
  processVideoJob,
  findProjectDirectories,
  probeVideoDuration,
  extractAudioTrack,
  prepareAudioPartForGemini,
  mapConcurrent,
  parseTimestampToSeconds,
  formatSecondsToTimestamp,
  sanitizeGeminiModel
};
