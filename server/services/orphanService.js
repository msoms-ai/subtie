import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SUBTITLES_DIR = path.join(DATA_DIR, 'subtitles');

function readProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function getDirectorySize(dirPath) {
  let total = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const f of files) {
      const full = path.join(dirPath, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        total += getDirectorySize(full);
      } else {
        total += stat.size;
      }
    }
  } catch (_) {}
  return total;
}

export function scanOrphans() {
  const projects = readProjects();
  const projectIds = new Set(Object.keys(projects));

  const chunks = [];
  const unlinkedDirs = [];
  const orphanSubtitles = [];
  const tempFiles = [];

  // 1. Scan for Audio Chunks of completed projects
  if (fs.existsSync(UPLOADS_DIR)) {
    try {
      const users = fs.readdirSync(UPLOADS_DIR);
      for (const u of users) {
        const userDir = path.join(UPLOADS_DIR, u);
        if (!fs.statSync(userDir).isDirectory() || u.startsWith('.')) continue;

        const folders = fs.readdirSync(userDir);
        for (const fld of folders) {
          const folderDir = path.join(userDir, fld);
          if (!fs.statSync(folderDir).isDirectory() || fld.startsWith('.')) continue;

          const pDirs = fs.readdirSync(folderDir);
          for (const p of pDirs) {
            const pPath = path.join(folderDir, p);
            if (!fs.statSync(pPath).isDirectory()) continue;

            // Check if directory is unlinked (not in projects.json)
            if (!projectIds.has(p) && p.startsWith('subtie_')) {
              const size = getDirectorySize(pPath);
              unlinkedDirs.push({
                type: 'unlinked_dir',
                path: pPath,
                relativePath: `uploads/${u}/${fld}/${p}`,
                projectId: p,
                size,
                reason: 'Folder exists on disk but has no record in database'
              });
              continue;
            }

            // If project is completed, check if chunks folder remains
            const proj = projects[p];
            if (proj && (proj.status === 'ready' || proj.processingProgress === 100)) {
              const chunksDir = path.join(pPath, 'chunks');
              if (fs.existsSync(chunksDir)) {
                const chunkFiles = fs.readdirSync(chunksDir);
                let chunkTotalSize = 0;
                for (const cf of chunkFiles) {
                  try {
                    chunkTotalSize += fs.statSync(path.join(chunksDir, cf)).size;
                  } catch (_) {}
                }
                if (chunkFiles.length > 0) {
                  chunks.push({
                    type: 'audio_chunks',
                    path: chunksDir,
                    relativePath: `uploads/${u}/${fld}/${p}/chunks`,
                    projectId: p,
                    projectName: proj.projectName,
                    filesCount: chunkFiles.length,
                    size: chunkTotalSize,
                    reason: 'Residual 120s audio chunks for completed project'
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[OrphanService] Uploads scan error:', err.message);
    }
  }

  // 2. Scan for Orphan Subtitle JSON files
  if (fs.existsSync(SUBTITLES_DIR)) {
    try {
      const subFiles = fs.readdirSync(SUBTITLES_DIR);
      for (const sf of subFiles) {
        if (!sf.endsWith('.json')) continue;
        const pId = sf.replace('.json', '');
        if (!projectIds.has(pId)) {
          const sfPath = path.join(SUBTITLES_DIR, sf);
          const size = fs.statSync(sfPath).size;
          orphanSubtitles.push({
            type: 'orphan_subtitle',
            path: sfPath,
            relativePath: `data/subtitles/${sf}`,
            projectId: pId,
            size,
            reason: 'Subtitle file exists but parent project was deleted'
          });
        }
      }
    } catch (err) {
      console.warn('[OrphanService] Subtitles scan error:', err.message);
    }
  }

  // 3. Scan for stale temporary files (.tmp.* older than 1 hour)
  try {
    const dataFiles = fs.readdirSync(DATA_DIR);
    const oneHourAgo = Date.now() - 3600000;
    for (const df of dataFiles) {
      if (df.includes('.tmp.')) {
        const dfPath = path.join(DATA_DIR, df);
        const stat = fs.statSync(dfPath);
        if (stat.mtimeMs < oneHourAgo) {
          tempFiles.push({
            type: 'temp_file',
            path: dfPath,
            relativePath: `data/${df}`,
            size: stat.size,
            reason: 'Stale atomic temp file'
          });
        }
      }
    }
  } catch (_) {}

  const allOrphans = [...chunks, ...unlinkedDirs, ...orphanSubtitles, ...tempFiles];
  const totalBytes = allOrphans.reduce((sum, o) => sum + (o.size || 0), 0);

  return {
    scannedAt: new Date().toISOString(),
    totalBytes,
    totalCount: allOrphans.length,
    categories: {
      audioChunks: { count: chunks.length, bytes: chunks.reduce((s, c) => s + c.size, 0), items: chunks },
      unlinkedDirs: { count: unlinkedDirs.length, bytes: unlinkedDirs.reduce((s, u) => s + u.size, 0), items: unlinkedDirs },
      orphanSubtitles: { count: orphanSubtitles.length, bytes: orphanSubtitles.reduce((s, o) => s + o.size, 0), items: orphanSubtitles },
      tempFiles: { count: tempFiles.length, bytes: tempFiles.reduce((s, t) => s + t.size, 0), items: tempFiles }
    }
  };
}

export function cleanOrphans(itemPaths = []) {
  const scan = scanOrphans();
  const allItems = [
    ...scan.categories.audioChunks.items,
    ...scan.categories.unlinkedDirs.items,
    ...scan.categories.orphanSubtitles.items,
    ...scan.categories.tempFiles.items
  ];

  const allowedPathSet = new Set(allItems.map(i => i.path));
  const pathsToClean = (Array.isArray(itemPaths) && itemPaths.length > 0)
    ? itemPaths.filter(p => allowedPathSet.has(p))
    : allItems.map(i => i.path);

  let cleanedBytes = 0;
  let cleanedCount = 0;
  const errors = [];

  for (const target of pathsToClean) {
    try {
      if (fs.existsSync(target)) {
        const stat = fs.statSync(target);
        const size = stat.isDirectory() ? getDirectorySize(target) : stat.size;
        if (stat.isDirectory()) {
          fs.rmSync(target, { recursive: true, force: true });
        } else {
          fs.unlinkSync(target);
        }
        cleanedBytes += size;
        cleanedCount++;
      }
    } catch (e) {
      errors.push({ path: target, error: e.message });
    }
  }

  return {
    success: true,
    cleanedBytes,
    cleanedCount,
    errors
  };
}

export default {
  scanOrphans,
  cleanOrphans
};
