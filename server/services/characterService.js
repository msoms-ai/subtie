import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { GoogleGenAI } from '@google/genai';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Extracts a square video frame thumbnail at a given timestamp for character avatar
 */
export function extractCharacterThumbnail(videoPath, timestampSecs, outputPath) {
  return new Promise((resolve) => {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return resolve(null);
    }
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const safeTime = Math.max(0, Number(timestampSecs) || 1);

    ffmpeg(videoPath)
      .seekInput(safeTime)
      .frames(1)
      .outputOptions(['-vf', 'scale=256:256:force_original_aspect_ratio=increase,crop=256:256'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.warn(`[CharacterService] Thumbnail capture error at ${safeTime}s:`, err.message);
        resolve(null);
      })
      .run();
  });
}

/**
 * Uses Gemini AI to analyze subtitles and detect all recurring anime characters
 */
export async function detectCharactersFromSubtitles(subtitles, geminiPool, options = {}) {
  const { videoPath, charactersDir, urlPrefix } = options;

  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return [];
  }

  // Sample dialogue lines to fit comfortably within prompt tokens
  const sampleLines = subtitles.map((s, idx) => ({
    id: idx + 1,
    time: s.startTime,
    sec: Math.round(s.startSeconds || 0),
    ja: s.japaneseText || '',
    en: s.englishText || '',
    ar: s.arabicText || ''
  })).slice(0, 300); // Up to 300 lines for comprehensive detection

  const prompt = `You are an expert anime character identification and fansub terminology system for MSOMS-Anime.
Analyze the following subtitle dialogue from an anime episode.
Identify all distinct anime characters who speak, are named, or are addressed in the dialogue.

Subtitle Sample:
${JSON.stringify(sampleLines)}

For each character found:
1. "id": "char_1", "char_2", etc.
2. "japaneseName": Standard Japanese Kanji/Kana name (e.g., "まる子", "さくらももこ", "コナン", "江戸川コナン").
3. "englishName": Official English/Romaji name (e.g., "Maruko", "Momoko Sakura", "Conan", "Conan Edogawa").
4. "arabicName": Standard Arabic transliterated name as used in Arabic anime fansubbing (e.g., "ماروكو", "موموكو ساكورا", "كونان").
5. "firstSpokenSeconds": Integer seconds when this character speaks or is first mentioned in the lines above.
6. "mentionsCount": Approximate number of lines where this character appears or speaks.

CRITICAL INSTRUCTIONS:
- Identify genuine named characters/people only. Do NOT include common objects, locations, or attack names.
- Output ONLY a valid JSON array of objects. Do not include markdown codeblocks or explanation.`;

  let keyInfo = null;
  try {
    try {
      keyInfo = geminiPool.acquireKey();
    } catch (e) {
      const fallbackKey = process.env.GEMINI_API_KEY || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
      if (fallbackKey) {
        keyInfo = {
          keyId: 'fallback',
          maskedKey: 'fallback',
          rawKey: fallbackKey,
          client: new GoogleGenAI({ apiKey: fallbackKey })
        };
      } else {
        throw e;
      }
    }

    const ai = keyInfo.client;

    // Read configured model from settings.json or env, default to active gemini-3.8-flash
    let configuredModel = 'gemini-3.8-flash';
    try {
      const settingsPath = path.resolve('server', 'data', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (s.geminiModel && !s.geminiModel.includes('1.5') && !s.geminiModel.includes('2.5')) {
          configuredModel = s.geminiModel.trim();
        }
      }
    } catch (e) {}

    const targetModel = (process.env.GEMINI_MODEL || configuredModel || 'gemini-3.8-flash').trim();
    const fallbackModel = 'gemini-3.5-flash';

    const reqConfig = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
      }
    };

    let response;
    try {
      response = await ai.models.generateContent({ model: targetModel, ...reqConfig });
    } catch (err) {
      console.warn(`[CharacterService] Stage 1 failed with ${targetModel}: ${err.message}. Trying ${fallbackModel}...`);
      try {
        response = await ai.models.generateContent({ model: fallbackModel, ...reqConfig });
      } catch (err2) {
        console.warn(`[CharacterService] Fallback to ${fallbackModel} failed: ${err2.message}. Trying gemini-flash-latest...`);
        response = await ai.models.generateContent({ model: 'gemini-flash-latest', ...reqConfig });
      }
    }

    if (keyInfo.keyId !== 'fallback') {
      geminiPool.releaseKey(keyInfo.keyId, true);
    }

    const rawText = (response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    let characters = [];
    try {
      characters = JSON.parse(rawText);
    } catch (e) {
      const lastIndex = rawText.lastIndexOf('}');
      if (lastIndex !== -1) {
        characters = JSON.parse(rawText.substring(0, lastIndex + 1) + ']');
      }
    }

    if (!Array.isArray(characters)) return [];

    // Extract thumbnails if videoPath is available
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      char.id = char.id || `char_${i + 1}`;
      
      if (videoPath && charactersDir) {
        const thumbName = `${char.id}.jpg`;
        const thumbPath = path.join(charactersDir, thumbName);
        const result = await extractCharacterThumbnail(videoPath, char.firstSpokenSeconds || (i * 30 + 10), thumbPath);
        if (result && fs.existsSync(thumbPath)) {
          char.avatarUrl = urlPrefix ? `${urlPrefix}/characters/${thumbName}` : thumbPath;
        }
      }
    }

    return characters;
  } catch (err) {
    if (keyInfo) geminiPool.releaseKey(keyInfo.keyId, false, err);
    console.error('[CharacterService] Detection error:', err.message);
    return [];
  }
}

/**
 * Performs a global case-insensitive search and replace of a character's names across all subtitle lines
 */
export function replaceCharacterNamesInSubtitles(subtitles, oldNames = {}, newNames = {}) {
  if (!Array.isArray(subtitles)) return { subtitles: [], updatedCount: 0 };

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const oldJa = (oldNames.japanese || oldNames.japaneseName || '').trim();
  const oldEn = (oldNames.english || oldNames.englishName || '').trim();
  const oldAr = (oldNames.arabic || oldNames.arabicName || '').trim();

  const newJa = (newNames.japanese || newNames.japaneseName || '').trim();
  const newEn = (newNames.english || newNames.englishName || '').trim();
  const newAr = (newNames.arabic || newNames.arabicName || '').trim();

  let updatedCount = 0;

  const updatedSubtitles = subtitles.map(sub => {
    let changed = false;
    let ja = sub.japaneseText || '';
    let en = sub.englishText || '';
    let ar = sub.arabicText || '';

    if (oldJa && newJa && oldJa !== newJa && ja.includes(oldJa)) {
      const reJa = new RegExp(escapeRegExp(oldJa), 'g');
      ja = ja.replace(reJa, newJa);
      changed = true;
    }

    if (oldEn && newEn && oldEn !== newEn) {
      const reEn = new RegExp(`\\b${escapeRegExp(oldEn)}\\b`, 'gi');
      if (reEn.test(en)) {
        en = en.replace(reEn, newEn);
        changed = true;
      }
    }

    if (oldAr && newAr && oldAr !== newAr && ar.includes(oldAr)) {
      const reAr = new RegExp(escapeRegExp(oldAr), 'g');
      ar = ar.replace(reAr, newAr);
      changed = true;
    }

    if (changed) {
      updatedCount += 1;
      return {
        ...sub,
        japaneseText: ja,
        englishText: en,
        arabicText: ar,
      };
    }
    return sub;
  });

  return { updatedSubtitles, updatedCount };
}
