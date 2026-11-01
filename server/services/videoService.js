import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize FFmpeg path with system fallbacks
let resolvedFfmpegPath = ffmpegInstaller?.path;
try {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    resolvedFfmpegPath = process.env.FFMPEG_PATH;
  } else if (!resolvedFfmpegPath || !fs.existsSync(resolvedFfmpegPath)) {
    if (fs.existsSync('/usr/bin/ffmpeg')) resolvedFfmpegPath = '/usr/bin/ffmpeg';
    else if (fs.existsSync('/usr/local/bin/ffmpeg')) resolvedFfmpegPath = '/usr/local/bin/ffmpeg';
  }
  if (resolvedFfmpegPath && fs.existsSync(resolvedFfmpegPath)) {
    try { fs.chmodSync(resolvedFfmpegPath, 0o755); } catch (_) {}
    ffmpeg.setFfmpegPath(resolvedFfmpegPath);
  }
} catch (ffErr) {
  console.warn('⚠️ [VideoService FFmpeg Warning]:', ffErr.message);
}

/**
 * Ensures that a video file is formatted as web-compatible MP4 (H.264/AAC).
 * If the source is MKV, AVI, etc., it remuxes or converts it to video.mp4.
 * 
 * @param {string} sourcePath - Absolute path to original video file
 * @param {string} targetDir - Directory where web-compatible video.mp4 should reside
 * @returns {Promise<{ mp4Path: string, fileName: string, converted: boolean }>}
 */
export async function ensureWebCompatibleVideo(sourcePath, targetDir) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(`Source video not found: ${sourcePath}`);
  }

  const ext = path.extname(sourcePath).toLowerCase();
  const targetMp4Path = path.join(targetDir, 'video.mp4');

  // If already MP4 and located in targetDir, nothing to do
  if (ext === '.mp4' && path.resolve(sourcePath) === path.resolve(targetMp4Path)) {
    return { mp4Path: targetMp4Path, fileName: 'video.mp4', converted: false };
  }

  // If a valid converted MP4 already exists in targetDir, use it and clean up source MKV
  if (fs.existsSync(targetMp4Path)) {
    try {
      const stats = fs.statSync(targetMp4Path);
      if (stats.size > 1000) { // Valid non-empty file
        if (ext !== '.mp4' && path.resolve(sourcePath) !== path.resolve(targetMp4Path) && fs.existsSync(sourcePath)) {
          try {
            fs.unlinkSync(sourcePath);
            console.log(`🗑️ [VideoService] Cleaned up original source "${path.basename(sourcePath)}" since valid video.mp4 already exists.`);
          } catch (delErr) {
            console.warn('⚠️ [VideoService] Cleanup warning:', delErr.message);
          }
        }
        return { mp4Path: targetMp4Path, fileName: 'video.mp4', converted: true };
      }
    } catch (_) {}
  }

  console.log(`🎬 [VideoService] Converting/Remuxing video to web-ready MP4: "${path.basename(sourcePath)}" -> "video.mp4"...`);

  // Attempt 1: Fast stream copy (takes ~0.2s if codecs are H.264 + AAC)
  try {
    await new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .output(targetMp4Path)
        .outputOptions([
          '-c copy',
          '-movflags +faststart',
          '-y'
        ])
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    console.log(`✅ [VideoService] Fast stream remux successful: ${targetMp4Path}`);

    // Automatic MKV cleanup: remove original source file once MP4 is confirmed
    if (ext !== '.mp4' && path.resolve(sourcePath) !== path.resolve(targetMp4Path) && fs.existsSync(targetMp4Path)) {
      try {
        const stats = fs.statSync(targetMp4Path);
        if (stats.size > 0 && fs.existsSync(sourcePath)) {
          fs.unlinkSync(sourcePath);
          console.log(`🗑️ [VideoService] Reclaimed disk space: deleted original MKV/source file "${path.basename(sourcePath)}"`);
        }
      } catch (delErr) {
        console.warn('⚠️ [VideoService] Could not remove original source file:', delErr.message);
      }
    }

    return { mp4Path: targetMp4Path, fileName: 'video.mp4', converted: true };
  } catch (copyErr) {
    console.warn(`⚠️ [VideoService] Fast stream copy failed (${copyErr.message}). Falling back to ultrafast H.264/AAC transcode...`);
  }

  // Attempt 2: Ultrafast H.264 + AAC transcode fallback
  try {
    await new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .output(targetMp4Path)
        .outputOptions([
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-y'
        ])
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    console.log(`✅ [VideoService] Transcoding to MP4 successful: ${targetMp4Path}`);

    // Automatic MKV cleanup: remove original source file once MP4 is confirmed
    if (ext !== '.mp4' && path.resolve(sourcePath) !== path.resolve(targetMp4Path) && fs.existsSync(targetMp4Path)) {
      try {
        const stats = fs.statSync(targetMp4Path);
        if (stats.size > 0 && fs.existsSync(sourcePath)) {
          fs.unlinkSync(sourcePath);
          console.log(`🗑️ [VideoService] Reclaimed disk space: deleted original MKV/source file "${path.basename(sourcePath)}"`);
        }
      } catch (delErr) {
        console.warn('⚠️ [VideoService] Could not remove original source file:', delErr.message);
      }
    }

    return { mp4Path: targetMp4Path, fileName: 'video.mp4', converted: true };
  } catch (transcodeErr) {
    console.error(`❌ [VideoService] Transcode failed:`, transcodeErr.message);
    // If conversion completely fails, return original file as last resort
    return { mp4Path: sourcePath, fileName: path.basename(sourcePath), converted: false };
  }
}

export default {
  ensureWebCompatibleVideo
};
