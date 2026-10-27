import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const COVERS_FILE = path.join(DATA_DIR, 'folder_covers.json');
const COVERS_DIR = path.join(__dirname, '..', 'uploads', 'folder_covers');

if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

function readFolderCovers() {
  try {
    if (!fs.existsSync(COVERS_FILE)) {
      fs.writeFileSync(COVERS_FILE, '{}', 'utf8');
      return {};
    }
    return JSON.parse(fs.readFileSync(COVERS_FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

function writeFolderCovers(data) {
  try {
    fs.writeFileSync(COVERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[FolderCoverService] Error writing covers file:', err);
  }
}

export function getAllFolderCovers() {
  return readFolderCovers();
}

export async function generateFolderCover(folderName, geminiPool, options = {}) {
  if (!folderName || !folderName.trim()) {
    throw new Error('Folder name is required');
  }

  const cleanFolderName = folderName.trim();
  const safeFolderName = cleanFolderName.replace(/[\/\\?%*:|"<>]/g, '_').trim();
  const localFileName = `${safeFolderName}.jpg`;
  const localFilePath = path.join(COVERS_DIR, localFileName);
  const { force = false } = options;

  // If already generated and file exists on disk, reuse immediately without re-promoting
  const existingCovers = readFolderCovers();
  if (!force && existingCovers[cleanFolderName] && fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 2000) {
    console.log(`⚡ [FolderCoverService] Reusing existing cached cover for "${cleanFolderName}"`);
    return {
      success: true,
      folderName: cleanFolderName,
      coverUrl: existingCovers[cleanFolderName],
      cached: true
    };
  }

  // 1. Craft an intelligent, genre-aware anime art prompt with Gemini
  let artPrompt = `${cleanFolderName} anime scenic landscape, vibrant colors, dramatic anime sky, Makoto Shinkai aesthetic, high detail cinematic anime background, 8k`;

  if (geminiPool) {
    let keyInfo = null;
    try {
      keyInfo = geminiPool.acquireKey();
      const apiKey = keyInfo.rawKey || process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = keyInfo.client || new GoogleGenAI({ apiKey });
        const promptRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an elite anime art director. Analyze the anime series title "${cleanFolderName}".
1. Identify the anime series, its mood, setting, atmosphere, and genre (e.g. supernatural action shonen, fantasy isekai adventure, psychological thriller, modern slice of life, sci-fi cyberpunk, historical romance).
2. Write a single, highly descriptive prompt for a stunning, panoramic anime landscape or iconic scenic background representing this specific series.
3. Include rich vibrant colors, volumetric lighting, dramatic anime sky, studio quality (Makoto Shinkai / Ufotable aesthetic), highly detailed anime background art, 8k wallpaper.
4. STRICT REQUIREMENT: Absolutely NO text, NO typography, NO watermark, NO logo, NO characters in closeup.
Output ONLY the final raw prompt sentence, nothing else.`
            }]
          }],
          config: {
            temperature: 0.4,
            maxOutputTokens: 120
          }
        });

        if (keyInfo.keyId) {
          geminiPool.releaseKey(keyInfo.keyId, true);
        }

        const generatedText = (promptRes.text || '').replace(/[\r\n"']/g, ' ').trim();
        if (generatedText && generatedText.length > 15) {
          artPrompt = generatedText;
          console.log(`🎨 [FolderCoverService] Intelligent prompt for "${cleanFolderName}": ${artPrompt}`);
        }
      }
    } catch (gErr) {
      if (keyInfo && keyInfo.keyId) {
        geminiPool.releaseKey(keyInfo.keyId, false, gErr.message);
      }
      console.warn(`[FolderCoverService] Prompt generation fallback for ${cleanFolderName}:`, gErr.message);
    }
  }

  // 2. Fetch image with retry and fallback
  const encodedPrompt = encodeURIComponent(artPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=960&height=540&nologo=true&seed=${seed}`;

  console.log(`🖼️ [FolderCoverService] Generating AI cover for "${cleanFolderName}"...`);

  let buffer = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const imageRes = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Subtie-AI-Cover/1.0' },
        signal: AbortSignal.timeout(20000)
      });
      if (imageRes.ok) {
        const ab = await imageRes.arrayBuffer();
        if (ab.byteLength > 2000) {
          buffer = Buffer.from(ab);
          break;
        }
      } else {
        console.warn(`[FolderCoverService] Attempt ${attempt} returned HTTP ${imageRes.status}`);
      }
    } catch (fetchErr) {
      console.warn(`[FolderCoverService] Attempt ${attempt} failed:`, fetchErr.message);
    }
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Fallback: If AI generation rate limits, fetch from scenic anime curated collection or SVG
  if (!buffer) {
    console.log(`🖼️ [FolderCoverService] Using high-res scenic anime fallback for "${cleanFolderName}"`);
    try {
      const fallbackUrl = `https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=960&h=540&q=80`;
      const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
      if (fallbackRes.ok) {
        const ab = await fallbackRes.arrayBuffer();
        buffer = Buffer.from(ab);
      }
    } catch (e) {
      console.warn('[FolderCoverService] Fallback fetch failed:', e.message);
    }
  }

  if (buffer) {
    fs.writeFileSync(localFilePath, buffer);
    console.log(`💾 [FolderCoverService] Saved cover to: ${localFilePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  const publicUrl = `/uploads/folder_covers/${encodeURIComponent(localFileName)}?v=${Date.now()}`;
  const covers = readFolderCovers();
  covers[cleanFolderName] = publicUrl;
  writeFolderCovers(covers);

  return {
    success: true,
    folderName: cleanFolderName,
    coverUrl: publicUrl,
    prompt: artPrompt
  };
}

export default {
  getAllFolderCovers,
  generateFolderCover
};
