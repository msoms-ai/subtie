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

// Diverse, high-resolution scenic anime wallpapers pool for offline/generic fallbacks
const CURATED_SCENIC_ANIME_WALLPAPERS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1280&h=720&q=85', // Tokyo Neo-Night Neon City
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1280&h=720&q=85', // Shinjuku Tokyo Twilight Tower
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1280&h=720&q=85', // Kyoto Japanese Autumn Shrine
  'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=1280&h=720&q=85', // Mount Fuji Sunset Sakura
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&h=720&q=85', // Starry Night Galaxy Sky
  'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1280&h=720&q=85', // Shibuya Crossing Dramatic Lights
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&h=720&q=85', // Tropical Ocean Blue Sky Horizon
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1280&h=720&q=85', // Snowy Alpine Winter Mountains
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&h=720&q=85', // Atmospheric Dark Purple Galaxy
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1280&h=720&q=85', // Cyberpunk Rain Reflections City
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1280&h=720&q=85', // Golden Sunset Golden Hour Forest
  'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=1280&h=720&q=85'  // Kyoto Cherry Blossom Spring Stream
];

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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

/**
 * Queries AniList GraphQL and Kitsu for authentic anime banners / key visuals
 */
async function fetchAnimeDatabaseArtwork(searchTitle) {
  if (!searchTitle || !searchTitle.trim()) return null;
  const cleanTitle = searchTitle.replace(/^(مسلسل|فيلم|حلقة|انمي|أنمي)\s+/gi, '').trim();

  // 1. Try AniList GraphQL
  try {
    const query = `
      query ($search: String) {
        Media (search: $search, type: ANIME) {
          id
          title { romaji english native }
          bannerImage
          coverImage { extraLarge large }
          genres
        }
      }
    `;
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables: { search: cleanTitle } }),
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      const media = data?.data?.Media;
      const imageUrl = media?.bannerImage || media?.coverImage?.extraLarge || media?.coverImage?.large;
      if (imageUrl) {
        console.log(`✨ [FolderCoverService] Found official AniList artwork for "${cleanTitle}": ${imageUrl}`);
        return { imageUrl, source: 'AniList', genres: media.genres || [] };
      }
    }
  } catch (e) {
    console.warn(`[FolderCoverService] AniList lookup failed for "${cleanTitle}":`, e.message);
  }

  // 2. Try Kitsu API
  try {
    const kRes = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(cleanTitle)}&page[limit]=1`, {
      signal: AbortSignal.timeout(6000)
    });
    if (kRes.ok) {
      const kData = await kRes.json();
      const anime = kData?.data?.[0]?.attributes;
      const imageUrl = anime?.coverImage?.original || anime?.coverImage?.large || anime?.posterImage?.original || anime?.posterImage?.large;
      if (imageUrl) {
        console.log(`✨ [FolderCoverService] Found official Kitsu artwork for "${cleanTitle}": ${imageUrl}`);
        return { imageUrl, source: 'Kitsu' };
      }
    }
  } catch (e) {
    console.warn(`[FolderCoverService] Kitsu lookup failed for "${cleanTitle}":`, e.message);
  }

  return null;
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

  // Check if current cached file is the stale 65632-byte fallback
  const isStaleFallback = fs.existsSync(localFilePath) && fs.statSync(localFilePath).size === 65632;

  // If already generated and valid on disk, reuse immediately unless force=true or stale fallback
  const existingCovers = readFolderCovers();
  if (!force && !isStaleFallback && existingCovers[cleanFolderName] && fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 2000) {
    console.log(`⚡ [FolderCoverService] Reusing existing cached cover for "${cleanFolderName}"`);
    return {
      success: true,
      folderName: cleanFolderName,
      coverUrl: existingCovers[cleanFolderName],
      cached: true
    };
  }

  // 1. Analyze Title with Gemini 3.8 Flash to get canonical franchise name & scenic prompt
  let artPrompt = `${cleanFolderName} anime scenic landscape, vibrant colors, dramatic anime sky, Makoto Shinkai aesthetic, high detail cinematic anime background, 8k`;
  let canonicalSearchTitle = cleanFolderName;
  let keyInfoUsed = null;

  if (geminiPool) {
    try {
      keyInfoUsed = geminiPool.acquireKey();
      const apiKey = keyInfoUsed.rawKey || process.env.GEMINI_API_KEY;
      if (apiKey) {
        console.log(`🔑 [FolderCoverService] Gemini Key Used: ${keyInfoUsed.keyId} (${keyInfoUsed.maskedKey})`);
        const ai = keyInfoUsed.client || new GoogleGenAI({ apiKey });
        const promptRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an elite anime art director. Analyze the anime project folder name "${cleanFolderName}".
1. Extract the canonical anime franchise title in English or Romaji (e.g. for "مسلسل Hamidashi Creative" -> "Hamidashi Creative", for "Demon Slayer Highlights" -> "Demon Slayer: Kimetsu no Yaiba", for "Detective Conan Movie 2026" -> "Detective Conan").
2. Write a single, highly descriptive prompt for a stunning, panoramic anime landscape or iconic scenic background representing this specific series. Include rich vibrant colors, volumetric lighting, dramatic anime sky, studio quality (Makoto Shinkai / Ufotable aesthetic), 8k wallpaper. Strictly NO text, NO logos.
Return a valid JSON object:
{
  "canonicalTitle": "clean official title",
  "prompt": "detailed scenic background prompt"
}`
            }]
          }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 250
          }
        });

        if (keyInfoUsed.keyId) {
          geminiPool.releaseKey(keyInfoUsed.keyId, true);
        }

        try {
          const cleanJson = (promptRes.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson || '{}');
          if (parsed.canonicalTitle) canonicalSearchTitle = parsed.canonicalTitle;
          if (parsed.prompt && parsed.prompt.length > 15) artPrompt = parsed.prompt;
          console.log(`🎨 [FolderCoverService] Analyzed "${cleanFolderName}": canonicalTitle="${canonicalSearchTitle}"`);
          console.log(`🎨 [FolderCoverService] Gemini 3.8 Flash Prompt: "${artPrompt}"`);
        } catch (pe) {
          console.warn('[FolderCoverService] Failed to parse JSON prompt response:', pe.message);
        }
      }
    } catch (gErr) {
      if (keyInfoUsed && keyInfoUsed.keyId) {
        geminiPool.releaseKey(keyInfoUsed.keyId, false, gErr.message);
      }
      console.warn(`[FolderCoverService] Gemini 3.8 Flash analysis fallback for "${cleanFolderName}":`, gErr.message);
    }
  }

  let buffer = null;
  let usedSource = 'AI Generated';

  // 2. First Priority: Check AniList and Kitsu for authentic official anime artwork
  try {
    const officialArt = await fetchAnimeDatabaseArtwork(canonicalSearchTitle);
    if (officialArt?.imageUrl) {
      console.log(`📥 [FolderCoverService] Downloading official ${officialArt.source} artwork for "${cleanFolderName}"...`);
      const dlRes = await fetch(officialArt.imageUrl, {
        headers: { 'User-Agent': 'Subtie-App/2.2' },
        signal: AbortSignal.timeout(12000)
      });
      if (dlRes.ok) {
        const ab = await dlRes.arrayBuffer();
        if (ab.byteLength > 5000) {
          buffer = Buffer.from(ab);
          usedSource = officialArt.source;
          console.log(`✅ [FolderCoverService] Successfully fetched official ${officialArt.source} cover (${(buffer.length / 1024).toFixed(1)} KB)`);
        }
      }
    }
  } catch (dlErr) {
    console.warn(`[FolderCoverService] Failed downloading official artwork for "${cleanFolderName}":`, dlErr.message);
  }

  // 3. Second Priority: AI Generation via Pollinations (with safe timeouts)
  if (!buffer) {
    const encodedPrompt = encodeURIComponent(artPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=960&height=540&nologo=true&seed=${seed}`;
    console.log(`🖼️ [FolderCoverService] Attempting Pollinations AI cover generation for "${cleanFolderName}"...`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const imageRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Subtie-AI-Cover/1.0' },
          signal: AbortSignal.timeout(12000)
        });
        if (imageRes.ok) {
          const ab = await imageRes.arrayBuffer();
          if (ab.byteLength > 5000) {
            buffer = Buffer.from(ab);
            usedSource = 'Pollinations AI';
            break;
          }
        } else {
          console.warn(`[FolderCoverService] Pollinations attempt ${attempt} returned HTTP ${imageRes.status}`);
        }
      } catch (fetchErr) {
        console.warn(`[FolderCoverService] Pollinations attempt ${attempt} failed:`, fetchErr.message);
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
    }
  }

  // 4. Diverse High-Res Fallback (Deteriministic Hash: NEVER identical images across different folders!)
  if (!buffer) {
    const hashIndex = stringHash(cleanFolderName) % CURATED_SCENIC_ANIME_WALLPAPERS.length;
    const fallbackUrl = CURATED_SCENIC_ANIME_WALLPAPERS[hashIndex];
    console.log(`🖼️ [FolderCoverService] Using distinct curated 8K anime wallpaper #${hashIndex} for "${cleanFolderName}"`);
    try {
      const fallbackRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
      if (fallbackRes.ok) {
        const ab = await fallbackRes.arrayBuffer();
        buffer = Buffer.from(ab);
        usedSource = `Curated Wallpaper #${hashIndex + 1}`;
      }
    } catch (e) {
      console.warn('[FolderCoverService] Fallback wallpaper fetch failed:', e.message);
    }
  }

  if (buffer) {
    fs.writeFileSync(localFilePath, buffer);
    console.log(`💾 [FolderCoverService] Saved cover to: ${localFilePath} (${(buffer.length / 1024).toFixed(1)} KB) [Source: ${usedSource}]`);
  }

  const publicUrl = `/uploads/folder_covers/${encodeURIComponent(localFileName)}?v=${Date.now()}`;
  const covers = readFolderCovers();
  covers[cleanFolderName] = publicUrl;
  writeFolderCovers(covers);

  return {
    success: true,
    folderName: cleanFolderName,
    coverUrl: publicUrl,
    prompt: artPrompt,
    canonicalTitle: canonicalSearchTitle,
    source: usedSource,
    apiKeyUsed: keyInfoUsed ? `${keyInfoUsed.keyId} (${keyInfoUsed.maskedKey})` : 'GEMINI_API_KEYS pool'
  };
}

export default {
  getAllFolderCovers,
  generateFolderCover
};
