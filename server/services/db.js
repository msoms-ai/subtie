import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SUBTITLES_DIR = path.join(DATA_DIR, 'subtitles');

if (!fs.existsSync(SUBTITLES_DIR)) {
  fs.mkdirSync(SUBTITLES_DIR, { recursive: true });
}

// In-memory cache for ultra-fast (0ms) non-blocking access
let projectsCache = null;
let usersCache = null;
let settingsCache = null;
let saveDebounceTimer = null;

// Initialize & load caches
export function initDb() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
      projectsCache = JSON.parse(raw);
    } else {
      projectsCache = {};
    }
  } catch (err) {
    console.error('[DB Service] Error loading projects.json:', err.message);
    projectsCache = {};
  }

  try {
    if (fs.existsSync(USERS_FILE)) {
      usersCache = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } else {
      usersCache = {};
    }
  } catch (err) {
    usersCache = {};
  }

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settingsCache = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } else {
      settingsCache = {};
    }
  } catch (err) {
    settingsCache = {};
  }

  console.log(`[DB Service] Initialized in-memory cache: ${Object.keys(projectsCache).length} projects, ${Object.keys(usersCache).length} users.`);
}

// Safe synchronous read from in-memory cache (Drop-in replacement for readProjects)
export function readProjects() {
  if (!projectsCache) initDb();
  return projectsCache;
}

// Persist projects metadata atomically
export function writeProjects(data) {
  if (data && typeof data === 'object') {
    projectsCache = data;
  }
  
  // Debounce disk writes if rapid successive writes occur, but write quickly
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      const tmpFile = `${PROJECTS_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(projectsCache, null, 2), 'utf8');
      fs.renameSync(tmpFile, PROJECTS_FILE);
    } catch (err) {
      console.error('[DB Service] Write error to projects.json:', err.message);
    }
  }, 100);
}

// Flush immediately when needed
export function flushProjectsSync() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  if (!projectsCache) return;
  try {
    const tmpFile = `${PROJECTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(projectsCache, null, 2), 'utf8');
    fs.renameSync(tmpFile, PROJECTS_FILE);
  } catch (err) {
    console.error('[DB Service] Flush error to projects.json:', err.message);
  }
}

// Load subtitles for a specific project on-demand
export function getProjectSubtitles(projectId) {
  if (!projectId) return [];
  const subFile = path.join(SUBTITLES_DIR, `${projectId}.json`);
  if (fs.existsSync(subFile)) {
    try {
      return JSON.parse(fs.readFileSync(subFile, 'utf8'));
    } catch (e) {
      console.warn(`[DB Service] Failed to read subtitle file for ${projectId}:`, e.message);
    }
  }
  
  // Fallback to in-memory project.subtitles if present
  if (projectsCache && projectsCache[projectId] && Array.isArray(projectsCache[projectId].subtitles) && projectsCache[projectId].subtitles.length > 0) {
    return projectsCache[projectId].subtitles;
  }
  return [];
}

// Save subtitles for a specific project independently (never touches the rest of the 123 projects!)
export function saveProjectSubtitles(projectId, subtitles) {
  if (!projectId || !Array.isArray(subtitles)) return;
  try {
    const subFile = path.join(SUBTITLES_DIR, `${projectId}.json`);
    const tmpFile = `${subFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(subtitles), 'utf8');
    fs.renameSync(tmpFile, subFile);

    // Update in-memory metadata count
    if (projectsCache && projectsCache[projectId]) {
      projectsCache[projectId].subtitlesCount = subtitles.length;
      projectsCache[projectId].updatedAt = new Date().toISOString();
      writeProjects(projectsCache);
    }
  } catch (err) {
    console.error(`[DB Service] Error saving subtitles for ${projectId}:`, err.message);
  }
}

// Get full project including subtitles (Used when opening Editor)
export function getFullProject(projectId) {
  if (!projectsCache) initDb();
  const proj = projectsCache[projectId];
  if (!proj) return null;
  const subs = getProjectSubtitles(projectId);
  return {
    ...proj,
    subtitles: subs,
    subtitlesCount: subs.length
  };
}

// Fast summary list for ProjectsGallery (Never leaks full subtitles across network)
export function getProjectsSummaryList(userId, userRole = 'User') {
  if (!projectsCache) initDb();
  if (!usersCache) usersCache = readUsers();

  const allProjects = Object.values(projectsCache);
  const list = [];

  for (const p of allProjects) {
    // Permission filter
    if (userRole !== 'Admin') {
      const isOwner = p.ownerId === userId;
      const isAuditor = p.auditorId === userId;
      if (!isOwner && !isAuditor) continue;
    }

    const ownerId = p.ownerId || 'usr_admin_msoms1';
    const owner = usersCache[ownerId] || (ownerId === 'usr_guest' ? { firstName: 'Guest', lastName: 'User', email: 'guest@msoms.ai' } : null);
    const resolvedOwnerName = p.ownerName || (owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : (ownerId || 'Unknown'));
    const resolvedOwnerEmail = owner ? owner.email : (p.ownerEmail || '');

    // Return project metadata without full subtitles array
    const { subtitles, ...summary } = p;
    list.push({
      ...summary,
      subtitles: [], // Always empty array in list view to protect bandwidth
      subtitlesCount: p.subtitlesCount || (Array.isArray(subtitles) ? subtitles.length : 0),
      ownerId,
      ownerName: resolvedOwnerName,
      ownerEmail: resolvedOwnerEmail
    });
  }

  return list;
}

// Ultra-fast unread count (Responds in <0.1ms for header badges)
export function getUnreadProjectsCount(userId, userRole = 'User', viewedIds = []) {
  if (!projectsCache) initDb();
  const viewedSet = new Set(Array.isArray(viewedIds) ? viewedIds : []);
  let unread = 0;

  for (const p of Object.values(projectsCache)) {
    if (userRole !== 'Admin') {
      if (p.ownerId !== userId && p.auditorId !== userId) continue;
    }
    const isDone = p.processingProgress === 100 || p.status === 'ready' || p.status === 'Completed';
    if (isDone && !viewedSet.has(p.id)) {
      unread++;
    }
  }
  return unread;
}

// User CRUD
export function readUsers() {
  if (!usersCache) initDb();
  return usersCache;
}

export function writeUsers(data) {
  usersCache = data;
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB Service] Error saving users.json:', err.message);
  }
}

// Settings CRUD
export function readSettings() {
  if (!settingsCache) initDb();
  return settingsCache;
}

export function writeSettings(data) {
  settingsCache = data;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB Service] Error saving settings.json:', err.message);
  }
}

// Initialize on module load
initDb();

export default {
  initDb,
  readProjects,
  writeProjects,
  flushProjectsSync,
  getProjectSubtitles,
  saveProjectSubtitles,
  getFullProject,
  getProjectsSummaryList,
  getUnreadProjectsCount,
  readUsers,
  writeUsers,
  readSettings,
  writeSettings
};
