import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_FILE = path.join(DATA_DIR, 'system_logs.json');

const MAX_LOG_ENTRIES = 500;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readSystemLogs() {
  ensureDataDir();
  try {
    if (!fs.existsSync(LOGS_FILE)) {
      fs.writeFileSync(LOGS_FILE, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(LOGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[LogService] Error reading logs:', err.message);
    return [];
  }
}

export function writeSystemLogs(logs) {
  ensureDataDir();
  try {
    const trimmed = logs.slice(0, MAX_LOG_ENTRIES);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (err) {
    console.error('[LogService] Error writing logs:', err.message);
  }
}

/**
 * Record a system event log
 * @param {'error' | 'warning' | 'stalled' | 'info'} level
 * @param {'gemini_api' | 'torrent' | 'video_proc' | 'auth' | 'system' | 'redis'} category
 * @param {string} message
 * @param {object} [meta]
 */
export function logSystemEvent(level, category, message, meta = {}) {
  try {
    const logs = readSystemLogs();
    const entry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      level: level || 'info',
      category: category || 'system',
      message: String(message || '').substring(0, 1000),
      meta: typeof meta === 'object' ? meta : { detail: String(meta) }
    };

    logs.unshift(entry); // newest first
    writeSystemLogs(logs);
    return entry;
  } catch (err) {
    console.error('[LogService] Failed to record event:', err.message);
  }
}

export function clearSystemLogs() {
  writeSystemLogs([]);
  return true;
}

export default {
  readSystemLogs,
  writeSystemLogs,
  logSystemEvent,
  clearSystemLogs
};
