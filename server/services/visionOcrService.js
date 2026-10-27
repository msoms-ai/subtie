import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { GoogleGenAI } from '@google/genai';

/**
 * Extracts candidate frames from a video file at strategic intervals.
 *
 * @param {string} videoPath - Full path to video file
 * @param {string} outputDir - Directory to store candidate frames
 * @param {number} intervalSeconds - Interval between sampled frames (default: 15s)
 * @returns {Promise<Array<{ framePath: string, timestampSeconds: number }>>}
 */
export async function extractCandidateFrames(videoPath, outputDir, intervalSeconds = 15) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get video duration using ffprobe
  const duration = await new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        resolve(1200); // Fallback: 20 minutes
      } else {
        resolve(metadata.format.duration);
      }
    });
  });

  const timestamps = [];
  // Sample frames: Start at 30 seconds (skip black intro), sample up to duration - 30 seconds
  const startSec = 15;
  const endSec = Math.max(startSec + 30, duration - 15);
  for (let s = startSec; s < endSec; s += intervalSeconds) {
    timestamps.push(Math.round(s));
  }

  // Limit max candidate frames to 60 per video to keep API calls ultra-fast and within token limits
  const sampledTimestamps = timestamps.length > 60
    ? timestamps.filter((_, idx) => idx % Math.ceil(timestamps.length / 60) === 0)
    : timestamps;

  console.log(`📸 [VisionOCR] Sampling ${sampledTimestamps.length} candidate frames from ${Math.round(duration)}s video...`);

  const extractedFrames = [];

  for (let i = 0; i < sampledTimestamps.length; i++) {
    const sec = sampledTimestamps[i];
    const frameName = `cand_${String(i).padStart(4, '0')}_${sec}s.jpg`;
    const framePath = path.join(outputDir, frameName);

    try {
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(sec)
          .outputOptions(['-vframes 1', '-vf scale=640:-1', '-q:v 3'])
          .output(framePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      if (fs.existsSync(framePath) && fs.statSync(framePath).size > 1000) {
        extractedFrames.push({
          framePath,
          timestampSeconds: sec,
        });
      }
    } catch (e) {
      // Continue sampling even if a single frame seek fails
    }
  }

  return extractedFrames;
}

/**
 * Format seconds to standard ASS/SRT timestamp (00:03:15,200)
 */
function formatSecondsToTimestamp(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Runs Gemini Vision to detect and translate on-screen Japanese signs, titles, letters, and locations.
 *
 * @param {string} videoPath
 * @param {Object} geminiPool
 * @param {Object} options
 * @returns {Promise<Array<Object>>} List of detected visual signs
 */
export async function detectVisualSignsFromVideo(videoPath, geminiPool, options = {}) {
  const {
    signsDir,
    urlPrefix = '',
    modelName = 'gemini-3.8-flash',
  } = options;

  if (signsDir && !fs.existsSync(signsDir)) {
    fs.mkdirSync(signsDir, { recursive: true });
  }

  const tempCandidatesDir = path.join(
    signsDir || path.dirname(videoPath),
    '_temp_candidates'
  );

  try {
    const candidateFrames = await extractCandidateFrames(videoPath, tempCandidatesDir, 20);
    if (candidateFrames.length === 0) {
      console.warn('⚠️ [VisionOCR] No candidate frames could be extracted.');
      return [];
    }

    console.log(`👁️ [VisionOCR] Submitting ${candidateFrames.length} candidate frames to Gemini Vision (${modelName})...`);

    // Group frames into batches of 6 frames per Gemini call to maximize efficiency
    const BATCH_SIZE = 6;
    const detectedSigns = [];
    let signGlobalId = 1;

    for (let b = 0; b < candidateFrames.length; b += BATCH_SIZE) {
      const batch = candidateFrames.slice(b, b + BATCH_SIZE);

      // Acquire Gemini Client
      let keyInfo;
      try {
        keyInfo = geminiPool.acquireKey();
      } catch (e) {
        const fallbackKey = process.env.GEMINI_API_KEY || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
        if (!fallbackKey) throw new Error('No Gemini API key available for Vision OCR');
        keyInfo = {
          keyId: 'fallback',
          maskedKey: 'fallback',
          rawKey: fallbackKey,
          client: new GoogleGenAI({ apiKey: fallbackKey }),
        };
      }

      const ai = keyInfo.client;

      try {
        const parts = [];

        // Add prompt
        parts.push({
          text: `You are an elite anime visual OCR and translation AI specialist.
Analyze the following batch of anime frames.
Your mission is to detect, transcribe, and translate ONLY IN-UNIVERSE WRITTEN JAPANESE TEXT.

STRICT EXCLUSION RULES (CRITICAL - DO NOT DETECT THESE):
1. IGNORE ALL OPENING (OP) AND ENDING (ED) SONG LYRICS (Romaji, Kanji lyrics, karaoke text).
2. IGNORE ALL PRODUCTION CREDITS & STAFF ROLLS:
   - Voice actors / Cast (CV / 声優 / 出演)
   - Directors, animators, producers (監督 / 作画監督 / 演出 / 制作)
   - Studio names, sponsor cards (提供 / この番組は...), production committees (製作委員会).
3. IGNORE TV BROADCAST LOGOS, station watermarks (e.g. TOKYO MX, BS11, AT-X, TV Tokyo) and warning/clock overlays.
4. IGNORE existing English fansub dialogue subtitles at the bottom.

WHAT YOU MUST CONCENTRATE ON (STRICT INCLUSION):
1. Episode Title Cards & Chapter Titles (e.g. 第1話「始まりの街」, タイトル)
2. Character Identification Cards, Name/Profile intro banners, Bounties, or Stat boxes
3. In-universe signage: Store banners, street signs, billboards, classroom boards, warning posters (e.g. 居酒屋, 立ち入り禁止, 指名手配)
4. In-scene written materials: Handwritten letters, diary entries, smartphone/PC screens, notes, newspapers, books
5. In-universe location stamps & time stamps (e.g. 翌朝, 3日後, 帝都・中央広場)

FOR EACH DETECTED ITEM, OUTPUT A JSON OBJECT:
- "frameIndex": integer index matching the frame (0 to ${batch.length - 1})
- "category": one of ["title", "character_card", "sign", "letter", "screen", "location"]
- "japaneseText": original Japanese text as written on screen
- "englishText": accurate, contextual English translation
- "arabicText": natural and professional Arabic fansub translation (ترجمة إمسومس احترافية)
- "assPosition": recommended ASS screen alignment tag:
  - "\\an8" (Top Center - for episode titles and top banners)
  - "\\an7" (Top Left - for location stamps and notes)
  - "\\an9" (Top Right - for timestamps or episode numbers)
  - "\\an5" (Center - for central letters, character cards, fullscreen text)
  - "\\an2" (Bottom Center - only if clearly positioned near bottom)
- "displayDurationSeconds": realistic on-screen duration in seconds (typically 3 to 6 seconds)

If no valid in-universe written text is found in a frame, do not include an object for it.
Return ONLY a valid JSON array of objects. Example:
[
  {
    "frameIndex": 0,
    "category": "title",
    "japaneseText": "ルフィの最高地点",
    "englishText": "Luffy's Peak",
    "arabicText": "ذروة لوفي",
    "assPosition": "\\\\an8",
    "displayDurationSeconds": 4
  }
]`,
        });

        // Add inline images for each frame in the batch
        for (let i = 0; i < batch.length; i++) {
          const frameBuffer = fs.readFileSync(batch[i].framePath);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: frameBuffer.toString('base64'),
            },
          });
        }

        const targetModel = modelName || 'gemini-3.8-flash';
        const fallbackModel = 'gemini-2.5-flash';

        let res;
        try {
          res = await ai.models.generateContent({
            model: targetModel,
            contents: [{ role: 'user', parts }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
        } catch (callErr) {
          console.warn(`[VisionOCR] Call failed with ${targetModel}: ${callErr.message}. Trying ${fallbackModel}...`);
          res = await ai.models.generateContent({
            model: fallbackModel,
            contents: [{ role: 'user', parts }],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
        }

        if (keyInfo.keyId !== 'fallback') {
          geminiPool.releaseKey(keyInfo.keyId, true);
        }

        let rawJson = (res.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        let items = [];
        try {
          items = JSON.parse(rawJson);
        } catch (pErr) {
          console.warn('[VisionOCR] Failed to parse batch JSON response');
        }

        if (Array.isArray(items)) {
          for (const item of items) {
            const frameIdx = typeof item.frameIndex === 'number' ? item.frameIndex : 0;
            const refFrame = batch[frameIdx] || batch[0];
            const startSec = refFrame.timestampSeconds;
            const dur = item.displayDurationSeconds || 4;
            const endSec = startSec + dur;

            const signId = `sign_${signGlobalId++}`;
            const permanentThumbnailName = `${signId}.jpg`;
            const permanentThumbnailPath = signsDir
              ? path.join(signsDir, permanentThumbnailName)
              : null;

            // Copy frame to permanent visual_signs directory
            let thumbnailUrl = '';
            if (permanentThumbnailPath && fs.existsSync(refFrame.framePath)) {
              fs.copyFileSync(refFrame.framePath, permanentThumbnailPath);
              thumbnailUrl = `${urlPrefix}/visual_signs/${permanentThumbnailName}`;
            }

            detectedSigns.push({
              id: signId,
              startSeconds: startSec,
              endSeconds: endSec,
              startTime: formatSecondsToTimestamp(startSec),
              endTime: formatSecondsToTimestamp(endSec),
              category: item.category || 'sign',
              japaneseText: item.japaneseText || '',
              englishText: item.englishText || '',
              arabicText: item.arabicText || '',
              assPosition: item.assPosition || '\\an8',
              thumbnailUrl,
              addedToSubtitles: false,
            });
          }
        }
      } catch (batchErr) {
        if (keyInfo && keyInfo.keyId !== 'fallback') {
          geminiPool.releaseKey(keyInfo.keyId, false, batchErr);
        }
        console.warn(`[VisionOCR] Batch ${b} failed:`, batchErr.message);
      }
    }

    console.log(`✨ [VisionOCR] Successfully identified ${detectedSigns.length} on-screen visual signs!`);
    return detectedSigns;
  } finally {
    // Cleanup temporary candidate frames
    if (fs.existsSync(tempCandidatesDir)) {
      try {
        fs.rmSync(tempCandidatesDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

export default {
  detectVisualSignsFromVideo,
  extractCandidateFrames,
};
