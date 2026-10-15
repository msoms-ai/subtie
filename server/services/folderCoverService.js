import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

export async function generateFolderCover(folderName, geminiPool) {
  if (!folderName || !folderName.trim()) {
    throw new Error('Folder name is required');
  }

  const cleanFolderName = folderName.trim();
  const safeFolderName = cleanFolderName.replace(/[\/\\?%*:|"<>]/g, '_').trim();
  const localFileName = `${safeFolderName}.jpg`;
  const localFilePath = path.join(COVERS_DIR, localFileName);

  // 1. Craft an Anime Art prompt with Gemini
  let artPrompt = `${cleanFolderName} anime, scenic background wallpaper, dramatic anime atmosphere, vibrant colors, Makoto Shinkai style, 8k anime art`;

  if (geminiPool) {
    try {
      const apiKeyInfo = geminiPool.acquireKey();
      if (apiKeyInfo?.key) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeyInfo.key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are an anime art director. For the anime title "${cleanFolderName}", generate a detailed 1-sentence prompt to create a stunning, cinematic anime landscape or key visual background without text/logos. Describe atmospheric scenery, lighting, and anime aesthetic. Output ONLY the raw prompt string, nothing else.`
                }]
              }]
            })
          }
        );
        const gData = await geminiRes.json();
        const generatedText = gData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (generatedText && generatedText.length > 10) {
          artPrompt = generatedText.replace(/[\r\n"']/g, ' ');
          console.log(`🎨 [FolderCoverService] Gemini crafted prompt for "${cleanFolderName}": ${artPrompt}`);
        }
      }
    } catch (gErr) {
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
