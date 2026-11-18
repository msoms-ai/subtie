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

let projectsCache = null;
let usersCache = null;
let settingsCache = null;
let lastProjectsMtime = 0;
let lastUsersMtime = 0;
let lastSettingsMtime = 0;

// Initialize & load caches
export function initDb() {
  readProjects(true);
  readUsers(true);
  readSettings(true);
  console.log(`[DB Service] Initialized in-memory cache: ${Object.keys(projectsCache || {}).length} projects, ${Object.keys(usersCache || {}).length} users.`);
}

// Multi-process resilient read from in-memory cache with automatic disk sync
export function readProjects(force = false) {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const stats = fs.statSync(PROJECTS_FILE);
      if (force || !projectsCache || stats.mtimeMs > lastProjectsMtime) {
        const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
        projectsCache = JSON.parse(raw);
        lastProjectsMtime = stats.mtimeMs;
      }
    } else {
      if (!projectsCache) projectsCache = {};
    }
  } catch (err) {
    if (!projectsCache) projectsCache = {};
  }
  return projectsCache;
}

// Guaranteed single project retrieval across processes
export function getProject(projectId) {
  if (!projectId) return null;
  const current = readProjects(false);
  if (current && current[projectId]) return current[projectId];
  // Force disk reload if not found in memory (written by another process)
  const fresh = readProjects(true);
  return (fresh && fresh[projectId]) ? fresh[projectId] : null;
}

// Persist projects metadata atomically without delay
export function writeProjects(data) {
  if (data && typeof data === 'object') {
    projectsCache = data;
  }
  try {
    const tmpFile = `${PROJECTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(projectsCache, null, 2), 'utf8');
    fs.renameSync(tmpFile, PROJECTS_FILE);
    const stats = fs.statSync(PROJECTS_FILE);
    lastProjectsMtime = stats.mtimeMs;
  } catch (err) {
    console.error('[DB Service] Write error to projects.json:', err.message);
  }
}

export function flushProjectsSync() {
  if (!projectsCache) return;
  try {
    const tmpFile = `${PROJECTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(projectsCache, null, 2), 'utf8');
    fs.renameSync(tmpFile, PROJECTS_FILE);
    const stats = fs.statSync(PROJECTS_FILE);
    lastProjectsMtime = stats.mtimeMs;
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
  
  if (projectsCache && projectsCache[projectId] && Array.isArray(projectsCache[projectId].subtitles) && projectsCache[projectId].subtitles.length > 0) {
    return projectsCache[projectId].subtitles;
  }
  return [];
}

// Save subtitles for a specific project independently
export function saveProjectSubtitles(projectId, subtitles) {
  if (!projectId || !Array.isArray(subtitles)) return;
  try {
    const subFile = path.join(SUBTITLES_DIR, `${projectId}.json`);
    const tmpFile = `${subFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(subtitles), 'utf8');
    fs.renameSync(tmpFile, subFile);

    // Update in-memory metadata count
    const fresh = readProjects();
    if (fresh && fresh[projectId]) {
      fresh[projectId].subtitlesCount = subtitles.length;
      fresh[projectId].updatedAt = new Date().toISOString();
      writeProjects(fresh);
    }
  } catch (err) {
    console.error(`[DB Service] Error saving subtitles for ${projectId}:`, err.message);
  }
}

// Get full project including subtitles (Used when opening Editor)
export function getFullProject(projectId) {
  const proj = getProject(projectId);
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
  const allProjects = Object.values(readProjects());
  const users = readUsers();

  const list = [];

  for (const p of allProjects) {
    if (userRole !== 'Admin') {
      const isOwner = p.ownerId === userId;
      const isAuditor = p.auditorId === userId;
      if (!isOwner && !isAuditor) continue;
    }

    const ownerId = p.ownerId || 'usr_admin_msoms1';
    const owner = users[ownerId] || (ownerId === 'usr_guest' ? { firstName: 'Guest', lastName: 'User', email: 'guest@msoms.ai' } : null);
    const resolvedOwnerName = p.ownerName || (owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : (ownerId || 'Unknown'));
    const resolvedOwnerEmail = owner ? owner.email : (p.ownerEmail || '');

    const { subtitles, ...summary } = p;
    list.push({
      ...summary,
      subtitles: [],
      subtitlesCount: p.subtitlesCount || (Array.isArray(subtitles) ? subtitles.length : 0),
      ownerId,
      ownerName: resolvedOwnerName,
      ownerEmail: resolvedOwnerEmail
    });
  }

  return list;
}

// Ultra-fast unread count
export function getUnreadProjectsCount(userId, userRole = 'User', viewedIds = []) {
  const projects = readProjects();
  const viewedSet = new Set(Array.isArray(viewedIds) ? viewedIds : []);
  let unread = 0;

  for (const p of Object.values(projects)) {
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

// User CRUD with disk mtime sync
export function readUsers(force = false) {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const stats = fs.statSync(USERS_FILE);
      if (force || !usersCache || stats.mtimeMs > lastUsersMtime) {
        usersCache = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        lastUsersMtime = stats.mtimeMs;
      }
    } else {
      if (!usersCache) usersCache = {};
    }
  } catch (err) {
    if (!usersCache) usersCache = {};
  }
  return usersCache;
}

export function writeUsers(data) {
  usersCache = data;
  try {
    const tmp = `${USERS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, USERS_FILE);
    const stats = fs.statSync(USERS_FILE);
    lastUsersMtime = stats.mtimeMs;
  } catch (err) {
    console.error('[DB Service] Error saving users.json:', err.message);
  }
}

// Settings CRUD with disk mtime sync
export function readSettings(force = false) {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const stats = fs.statSync(SETTINGS_FILE);
      if (force || !settingsCache || stats.mtimeMs > lastSettingsMtime) {
        settingsCache = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        lastSettingsMtime = stats.mtimeMs;
      }
    } else {
      if (!settingsCache) settingsCache = {};
    }
  } catch (err) {
    if (!settingsCache) settingsCache = {};
  }
  return settingsCache;
}

export function writeSettings(data) {
  settingsCache = data;
  try {
    const tmp = `${SETTINGS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, SETTINGS_FILE);
    const stats = fs.statSync(SETTINGS_FILE);
    lastSettingsMtime = stats.mtimeMs;
  } catch (err) {
    console.error('[DB Service] Error saving settings.json:', err.message);
  }
}

initDb();

export default {
  initDb,
  readProjects,
  getProject,
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
