import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { GoogleGenAI } from '@google/genai';

import queueService, { subtitleQueue, redisConnection } from '../services/queue.js';
import geminiPool from '../services/geminiPool.js';
import cloudStorage from '../services/storage.js';
import torrentService from '../services/torrentService.js';
import orphanService from '../services/orphanService.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SUBTITLES_DIR = path.join(DATA_DIR, 'subtitles');
const SQLITE_FILE = path.join(DATA_DIR, 'subtie.sqlite');

const router = express.Router();

// Helper to read projects safely
function readProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeProjects(data) {
  const tmp = `${PROJECTS_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, PROJECTS_FILE);
}

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeUsers(data) {
  const tmp = `${USERS_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, USERS_FILE);
}

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeSettings(data) {
  const tmp = `${SETTINGS_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, SETTINGS_FILE);
}

// -------------------------------------------------------------
// MODULE 1: 3D ISOMETRIC TOPOLOGY & SYSTEM HEARTBEAT
// -------------------------------------------------------------
router.get('/topology', async (req, res) => {
  try {
    // 1. Gateway Status
    const gateway = {
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      port: process.env.PORT || 3001,
      status: 'online'
    };

    // 2. Redis Metrics
    let redisInfo = { status: 'offline', host: '127.0.0.1:6380' };
    try {
      if (redisConnection.status === 'ready' || redisConnection.status === 'connect') {
        const rawInfo = await redisConnection.info();
        const parseKey = (k) => {
          const match = rawInfo.match(new RegExp(`^${k}:(.*)$`, 'm'));
          return match ? match[1].trim() : null;
        };
        redisInfo = {
          status: 'online',
          host: '127.0.0.1:6380',
          redisVersion: parseKey('redis_version') || '7.2',
          usedMemoryHuman: parseKey('used_memory_human') || '—',
          connectedClients: Number(parseKey('connected_clients')) || 0,
          uptimeDays: Number(parseKey('uptime_in_days')) || 0,
          opsPerSec: Number(parseKey('instantaneous_ops_per_sec')) || 0
        };
      }
    } catch (_) {}

    // 3. BullMQ Worker Pool Status via PM2 and Queue
    let workerInfo = { status: 'unknown', concurrency: Number(process.env.WORKER_CONCURRENCY) || 2 };
    let watchdogInfo = { status: 'unknown' };
    try {
      const { stdout } = await execAsync('npx pm2 jlist');
      const pm2List = JSON.parse(stdout);
      const workerProc = pm2List.find(p => p.name === 'subtie-worker');
      const watchdogProc = pm2List.find(p => p.name === 'subtie-watchdog');
      const gatewayProc = pm2List.find(p => p.name === 'subtie');

      if (workerProc) {
        workerInfo = {
          pid: workerProc.pid,
          status: workerProc.pm2_env?.status || 'online',
          memoryBytes: workerProc.monit?.memory || 0,
          cpuPercent: workerProc.monit?.cpu || 0,
          uptimeSecs: Math.round((Date.now() - (workerProc.pm2_env?.pm_uptime || Date.now())) / 1000),
          restarts: workerProc.pm2_env?.restart_time || 0,
          concurrency: Number(workerProc.pm2_env?.env?.WORKER_CONCURRENCY) || 2
        };
      }
      if (watchdogProc) {
        watchdogInfo = {
          pid: watchdogProc.pid,
          status: watchdogProc.pm2_env?.status || 'online',
          memoryBytes: watchdogProc.monit?.memory || 0,
          uptimeSecs: Math.round((Date.now() - (watchdogProc.pm2_env?.pm_uptime || Date.now())) / 1000),
          restarts: watchdogProc.pm2_env?.restart_time || 0
        };
      }
      if (gatewayProc) {
        gateway.pm2Status = gatewayProc.pm2_env?.status || 'online';
        gateway.restarts = gatewayProc.pm2_env?.restart_time || 0;
        gateway.monitMemory = gatewayProc.monit?.memory || 0;
        gateway.monitCpu = gatewayProc.monit?.cpu || 0;
      }
    } catch (pm2Err) {
      workerInfo.pm2Error = pm2Err.message;
    }

    // 4. Gemini Pool Status
    const apiPool = geminiPool.getPoolStatus();

    // 5. Cloudflare R2 Status
    const r2Status = cloudStorage.getStatus();

    // 6. Persistence & SQLite Metrics
    const projects = readProjects();
    const projCount = Object.keys(projects).length;
    let projectsFileSize = 0;
    try { projectsFileSize = fs.statSync(PROJECTS_FILE).size; } catch (_) {}

    let sqliteMetrics = { fileSizeBytes: 0, exists: false };
    try {
      if (fs.existsSync(SQLITE_FILE)) {
        sqliteMetrics.fileSizeBytes = fs.statSync(SQLITE_FILE).size;
        sqliteMetrics.exists = true;
      }
    } catch (_) {}

    let subFilesCount = 0;
    let subFilesSizeBytes = 0;
    try {
      if (fs.existsSync(SUBTITLES_DIR)) {
        const subs = fs.readdirSync(SUBTITLES_DIR);
        subFilesCount = subs.filter(f => f.endsWith('.json')).length;
      }
    } catch (_) {}

    // 7. Queue Counts
    let queueMetrics = { waiting: 0, active: 0, completed: 0, failed: 0 };
    try {
      queueMetrics = await queueService.getMetrics();
    } catch (_) {}

    // 8. Active torrents & AI jobs
    const activeTorrents = torrentService.getAllActiveJobs().filter(j => j.status === 'downloading').length;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      nodes: {
        edgeProxy: { status: 'online', protocol: 'HTTPS / WSS', domain: 'subtie.msoms.ai' },
        gateway,
        redis: redisInfo,
        worker: workerInfo,
        watchdog: watchdogInfo,
        geminiPool: {
          status: 'online',
          totalKeys: apiPool.totalKeys,
          activeKeys: apiPool.keys.filter(k => k.status === 'active').length,
          cooldownKeys: apiPool.keys.filter(k => k.cooldownSecondsRemaining > 0).length,
          model: apiPool.detectedEnvNames
        },
        storageR2: r2Status,
        database: {
          projectsCount: projCount,
          projectsFileSize,
          sqliteMetrics,
          subtitlesFilesCount: subFilesCount
        }
      },
      workload: {
        queue: queueMetrics,
        activeTorrents,
        activeWorkers: (queueMetrics.active || 0) + activeTorrents
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 2: BULLMQ & REDIS QUEUE MANAGER
// -------------------------------------------------------------
router.get('/queue/jobs', async (req, res) => {
  try {
    const isPaused = await subtitleQueue.isPaused();
    const counts = await subtitleQueue.getJobCounts();

    const [activeJobs, waitingJobs, failedJobs, completedJobs] = await Promise.all([
      subtitleQueue.getActive(0, 20),
      subtitleQueue.getWaiting(0, 50),
      subtitleQueue.getFailed(0, 30),
      subtitleQueue.getCompleted(0, 30)
    ]);

    const formatJob = (job) => ({
      id: job.id,
      name: job.name,
      projectId: job.data?.projectId,
      projectName: job.data?.projectName || 'Untitled',
      userId: job.data?.userId,
      progress: job.progress || 0,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      opts: { attempts: job.opts?.attempts }
    });

    res.json({
      success: true,
      isPaused,
      counts,
      active: activeJobs.map(formatJob),
      waiting: waitingJobs.map(formatJob),
      failed: failedJobs.map(formatJob),
      completed: completedJobs.map(formatJob)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/queue/job/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'retry' | 'remove' | 'promote'
  try {
    const job = await subtitleQueue.getJob(id);
    if (!job) return res.status(404).json({ error: `Job ${id} not found in BullMQ` });

    if (action === 'retry') {
      await job.retry();
      return res.json({ success: true, message: `Job ${id} re-enqueued for execution` });
    } else if (action === 'remove') {
      await job.remove();
      return res.json({ success: true, message: `Job ${id} removed from queue` });
    } else if (action === 'promote') {
      await job.promote();
      return res.json({ success: true, message: `Job ${id} promoted to head of queue` });
    }
    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/queue/pause', async (req, res) => {
  try {
    await subtitleQueue.pause();
    res.json({ success: true, isPaused: true, message: 'Queue paused successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/queue/resume', async (req, res) => {
  try {
    await subtitleQueue.resume();
    res.json({ success: true, isPaused: false, message: 'Queue resumed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/queue/clean', async (req, res) => {
  const { type = 'completed' } = req.body; // 'completed' | 'failed'
  try {
    const cleaned = await subtitleQueue.clean(0, 1000, type);
    res.json({ success: true, cleanedCount: cleaned.length, type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 3: ACTIVITIES & STUCK TASKS SENTINEL
// -------------------------------------------------------------
router.get('/sentinel/stuck-tasks', (req, res) => {
  try {
    const projects = readProjects();
    const now = Date.now();
    const stuckThresholdMs = 5 * 60 * 1000; // 5 minutes without update
    const stuckProjects = [];

    for (const [id, p] of Object.entries(projects)) {
      const isProcessing = p.status === 'processing' || p.status === 'queued';
      if (!isProcessing) continue;

      const lastUpdate = new Date(p.updatedAt || p.createdAt || 0).getTime();
      const stalledForMs = now - lastUpdate;

      if (stalledForMs > stuckThresholdMs) {
        stuckProjects.push({
          projectId: id,
          projectName: p.projectName || 'Untitled',
          status: p.status,
          processingStatus: p.processingStatus,
          processingProgress: p.processingProgress || 0,
          updatedAt: p.updatedAt,
          stalledDurationSeconds: Math.round(stalledForMs / 1000),
          ownerId: p.ownerId,
          type: 'ai_pipeline'
        });
      }
    }

    // Check stalled torrents
    const torrentJobs = torrentService.getAllActiveJobs();
    const stuckTorrents = [];
    for (const t of torrentJobs) {
      if (t.status === 'downloading' && t.zeroSeedsStartTime && (now - t.zeroSeedsStartTime > 15 * 60 * 1000)) {
        stuckTorrents.push({
          projectId: t.projectId,
          projectName: t.projectName,
          status: 'downloading',
          progress: t.progress,
          numSeeds: t.numSeeds,
          numPeers: t.numPeers,
          stalledDurationSeconds: Math.round((now - t.zeroSeedsStartTime) / 1000),
          type: 'torrent'
        });
      }
    }

    res.json({
      success: true,
      totalStuck: stuckProjects.length + stuckTorrents.length,
      stuckProjects,
      stuckTorrents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sentinel/action', async (req, res) => {
  const { projectId, action } = req.body; // 'restart' | 'force_fail' | 'delete' | 'heal_all'
  try {
    const projects = readProjects();

    if (action === 'heal_all') {
      const now = Date.now();
      let healedCount = 0;
      for (const [id, p] of Object.entries(projects)) {
        if ((p.status === 'processing' || p.status === 'queued') && (now - new Date(p.updatedAt || 0).getTime() > 5 * 60 * 1000)) {
          // Re-enqueue
          try {
            await queueService.addJob({ projectId: id, videoDurationSecs: 0, userId: p.ownerId, projectName: p.projectName });
            p.status = 'queued';
            p.processingStatus = 'Auto-healed and re-enqueued by Sentinel';
            p.updatedAt = new Date().toISOString();
            healedCount++;
          } catch (_) {}
        }
      }
      writeProjects(projects);
      return res.json({ success: true, healedCount, message: `Auto-healed ${healedCount} stuck tasks` });
    }

    const project = projects[projectId];
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (action === 'restart') {
      project.status = 'queued';
      project.processingStatus = 'Re-enqueued by Admin Sentinel';
      project.processingProgress = 5;
      project.updatedAt = new Date().toISOString();
      writeProjects(projects);

      await queueService.addJob({ projectId, videoDurationSecs: 0, userId: project.ownerId, projectName: project.projectName });
      return res.json({ success: true, message: `Project ${projectId} re-enqueued successfully` });
    } else if (action === 'force_fail') {
      project.status = 'failed';
      project.processingStatus = 'Terminated manually by Administrator Sentinel';
      project.error = 'Manually terminated';
      project.updatedAt = new Date().toISOString();
      writeProjects(projects);

      try {
        const job = await subtitleQueue.getJob(projectId);
        if (job) await job.remove();
      } catch (_) {}
      return res.json({ success: true, message: `Project ${projectId} marked as failed` });
    }
    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 4: GEMINI AI POOL & KEY TESTER
// -------------------------------------------------------------
router.get('/gemini/keys', (req, res) => {
  try {
    const status = geminiPool.getPoolStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gemini/keys/:id/test', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = geminiPool.getPoolStatus();
    const keyEntry = geminiPool.keys?.find(k => k.id === id);
    if (!keyEntry || !keyEntry.rawKey) {
      return res.status(404).json({ error: `Key ${id} not found in pool` });
    }

    const t0 = Date.now();
    const ai = new GoogleGenAI({ apiKey: keyEntry.rawKey });
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: 'Respond with exactly: PONG' }] }]
      });
    } catch (mErr) {
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [{ role: 'user', parts: [{ text: 'Respond with exactly: PONG' }] }]
      });
    }
    const latencyMs = Date.now() - t0;
    const replyText = response.text?.trim() || '';

    res.json({
      success: true,
      keyId: id,
      maskedKey: keyEntry.maskedKey,
      latencyMs,
      reply: replyText,
      status: 'valid'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      keyId: id,
      error: err.message,
      status: 'invalid'
    });
  }
});

router.post('/gemini/keys/add', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 20) {
    return res.status(400).json({ error: 'Valid Gemini API key string required' });
  }
  try {
    const settings = readSettings();
    const currentKeys = Array.isArray(settings.geminiApiKeys) ? settings.geminiApiKeys : [];
    if (!currentKeys.includes(apiKey.trim())) {
      currentKeys.push(apiKey.trim());
      settings.geminiApiKeys = currentKeys;
      writeSettings(settings);
      geminiPool.initPool();
    }
    res.json({ success: true, totalKeys: currentKeys.length, message: 'Key added and pool reloaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 5: USERS & CREDITS CRUD
// -------------------------------------------------------------
router.get('/users', (req, res) => {
  try {
    const users = readUsers();
    const projects = readProjects();

    const userList = Object.values(users).map(u => {
      const { passwordHash, verificationCode, passwordResetCode, ...safe } = u;
      const userProjects = Object.values(projects).filter(p => p.ownerId === u.id);
      return {
        ...safe,
        minuteBalance: typeof u.minuteBalance === 'number' ? u.minuteBalance : (u.role === 'Admin' ? 99999 : 0),
        projectsCount: userProjects.length,
        readyProjectsCount: userProjects.filter(p => p.status === 'ready' || p.processingProgress === 100).length
      };
    });

    res.json({ success: true, users: userList, total: userList.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { role, firstName, lastName, msomsUsername, minuteBalance, isBanned } = req.body;
  try {
    const users = readUsers();
    if (!users[id]) return res.status(404).json({ error: 'User not found' });

    if (role) users[id].role = role;
    if (firstName) users[id].firstName = firstName;
    if (lastName) users[id].lastName = lastName;
    if (msomsUsername !== undefined) users[id].msomsUsername = msomsUsername;
    if (typeof minuteBalance === 'number') users[id].minuteBalance = minuteBalance;
    if (typeof isBanned === 'boolean') users[id].isBanned = isBanned;
    users[id].updatedAt = new Date().toISOString();

    writeUsers(users);
    res.json({ success: true, user: users[id] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(['/users/:id/credit', '/users/:id/credits'], (req, res) => {
  const { id } = req.params;
  const raw = req.body.minutes ?? req.body.minutesDelta ?? req.body.amountMinutes ?? req.body.amount;
  const num = Number(raw);
  if (isNaN(num) || num === 0) {
    return res.status(400).json({ error: 'Valid minutes amount required (cannot be zero or empty)' });
  }

  try {
    const users = readUsers();
    if (!users[id]) return res.status(404).json({ error: 'User not found' });

    const current = typeof users[id].minuteBalance === 'number' ? users[id].minuteBalance : 0;
    users[id].minuteBalance = Math.max(0, current + num);
    users[id].updatedAt = new Date().toISOString();
    writeUsers(users);

    res.json({ success: true, minuteBalance: users[id].minuteBalance, adjustedBy: num, reason: req.body.reason });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const users = readUsers();
    if (!users[id]) return res.status(404).json({ error: 'User not found' });
    if (users[id].role === 'Admin' && Object.values(users).filter(u => u.role === 'Admin').length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the sole Administrator account' });
    }
    delete users[id];
    writeUsers(users);
    res.json({ success: true, message: `User ${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 6: PROJECTS & VIDEO OPERATIONS
// -------------------------------------------------------------
router.get('/projects', (req, res) => {
  try {
    const projects = readProjects();
    const list = Object.values(projects).map(p => ({
      id: p.id,
      projectName: p.projectName || 'Untitled',
      mediaTitle: p.mediaTitle || 'Video',
      projectType: p.projectType || 'Episode',
      status: p.status,
      processingStatus: p.processingStatus,
      processingProgress: p.processingProgress || 0,
      subtitlesCount: p.subtitlesCount || (Array.isArray(p.subtitles) ? p.subtitles.length : 0),
      ownerId: p.ownerId,
      ownerName: p.ownerName,
      videoUrl: p.videoUrl,
      r2Uploaded: Boolean(p.r2Uploaded || (p.videoUrl && p.videoUrl.startsWith('http'))),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, projects: list, total: list.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'rerun_pipeline' | 'purge_local_video' | 'delete'
  try {
    const projects = readProjects();
    const proj = projects[id];
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    if (action === 'rerun_pipeline') {
      proj.status = 'queued';
      proj.processingStatus = 'Re-enqueued for AI transcription & translation by Admin';
      proj.processingProgress = 5;
      proj.updatedAt = new Date().toISOString();
      writeProjects(projects);
      await queueService.addJob({ projectId: id, videoDurationSecs: 0, userId: proj.ownerId, projectName: proj.projectName });
      return res.json({ success: true, message: `Pipeline re-enqueued for ${id}` });
    } else if (action === 'purge_local_video') {
      if (!proj.videoUrl || !proj.videoUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Cannot purge local video: video is not yet archived in Cloudflare R2' });
      }
      // Locate local video and remove
      const safeFolder = (proj.projectName || 'Uncategorized').replace(/[\/\\?%*:|"<>]/g, '_').trim();
      const localDir = path.join(UPLOADS_DIR, proj.ownerId || 'usr_guest', safeFolder, id);
      if (fs.existsSync(localDir)) {
        const files = fs.readdirSync(localDir);
        for (const f of files) {
          if (/\.(mp4|mkv|avi|mov)$/i.test(f)) {
            try { fs.unlinkSync(path.join(localDir, f)); } catch (_) {}
          }
        }
      }
      return res.json({ success: true, message: `Local raw video purged for ${id}. Stream remains active on Cloudflare CDN.` });
    } else if (action === 'delete') {
      delete projects[id];
      writeProjects(projects);
      // Remove subtitle file
      try { fs.unlinkSync(path.join(SUBTITLES_DIR, `${id}.json`)); } catch (_) {}
      return res.json({ success: true, message: `Project ${id} deleted` });
    }
    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 7: SECTIONS & CATEGORIES MANAGER
// -------------------------------------------------------------
router.get('/categories', (req, res) => {
  try {
    const projects = readProjects();
    const categoriesMap = {};

    for (const p of Object.values(projects)) {
      const cat = p.projectName || 'Uncategorized';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          name: cat,
          projectType: p.projectType || 'Episode',
          count: 0,
          readyCount: 0,
          latestDate: p.createdAt
        };
      }
      categoriesMap[cat].count++;
      if (p.status === 'ready' || p.processingProgress === 100) categoriesMap[cat].readyCount++;
      if (new Date(p.createdAt) > new Date(categoriesMap[cat].latestDate)) {
        categoriesMap[cat].latestDate = p.createdAt;
      }
    }

    res.json({ success: true, categories: Object.values(categoriesMap) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 8: STORAGE & FILE BROWSER
// -------------------------------------------------------------
router.get('/storage/browse', (req, res) => {
  const targetSubPath = req.query.path ? String(req.query.path).replace(/\.\./g, '') : '';
  const fullTarget = path.join(UPLOADS_DIR, targetSubPath);

  try {
    if (!fs.existsSync(fullTarget)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stat = fs.statSync(fullTarget);
    if (!stat.isDirectory()) {
      return res.json({
        type: 'file',
        name: path.basename(fullTarget),
        size: stat.size,
        modified: stat.mtime
      });
    }

    const items = fs.readdirSync(fullTarget).map(name => {
      const itemFull = path.join(fullTarget, name);
      try {
        const s = fs.statSync(itemFull);
        return {
          name,
          isDirectory: s.isDirectory(),
          size: s.isDirectory() ? null : s.size,
          modified: s.mtime,
          relativePath: path.relative(UPLOADS_DIR, itemFull).replace(/\\/g, '/')
        };
      } catch (_) {
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      currentPath: targetSubPath,
      items
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/storage/r2/objects', async (req, res) => {
  const prefix = req.query.prefix || '';
  try {
    const listRes = await cloudStorage.listObjects(prefix, 100);
    res.json({ success: true, ...listRes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 9: ORPHAN REQUESTS & GARBAGE COLLECTOR
// -------------------------------------------------------------
router.get('/garbage/scan', (req, res) => {
  try {
    const scan = orphanService.scanOrphans();
    res.json({ success: true, scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/garbage/clean', (req, res) => {
  const { paths } = req.body;
  try {
    const result = orphanService.cleanOrphans(paths);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 10: DATABASE & PLATFORM DIAGNOSTICS
// -------------------------------------------------------------
router.get('/diagnostics', async (req, res) => {
  try {
    // 1. PM2 process table
    let pm2Processes = [];
    try {
      const { stdout } = await execAsync('npx pm2 jlist');
      const parsed = JSON.parse(stdout);
      pm2Processes = parsed.map(p => ({
        id: p.pm_id,
        name: p.name,
        pid: p.pid,
        status: p.pm2_env?.status,
        cpu: p.monit?.cpu || 0,
        memory: p.monit?.memory || 0,
        uptimeSecs: Math.round((Date.now() - (p.pm2_env?.pm_uptime || Date.now())) / 1000),
        restarts: p.pm2_env?.restart_time || 0
      }));
    } catch (_) {}

    // 2. Host OS metrics
    const host = {
      os: `${os.type()} ${os.release()}`,
      uptimeSecs: Math.round(os.uptime()),
      loadAvg: os.loadavg(),
      totalMemBytes: os.totalmem(),
      freeMemBytes: os.freemem(),
      cpusCount: os.cpus().length
    };

    // 3. Disk space via df -h
    let diskUsage = null;
    try {
      const { stdout: dfOut } = await execAsync("df -h / | tail -n 1");
      const parts = dfOut.trim().split(/\s+/);
      if (parts.length >= 5) {
        diskUsage = { total: parts[1], used: parts[2], available: parts[3], percent: parts[4] };
      }
    } catch (_) {}

    // 4. SQLite metrics
    let sqliteMetrics = { integrity: 'unknown', projectsCount: 0, subtitlesCount: 0 };
    try {
      if (fs.existsSync(SQLITE_FILE)) {
        const { stdout: qOut } = await execAsync(`sqlite3 "${SQLITE_FILE}" "PRAGMA integrity_check; SELECT count(*) FROM projects; SELECT count(*) FROM subtitles;"`);
        const qLines = qOut.trim().split('\n');
        sqliteMetrics = {
          integrity: qLines[0] || 'ok',
          projectsCount: Number(qLines[1]) || 0,
          subtitlesCount: Number(qLines[2]) || 0,
          sizeBytes: fs.statSync(SQLITE_FILE).size
        };
      }
    } catch (e) {
      sqliteMetrics.error = e.message;
    }

    res.json({
      success: true,
      pm2: pm2Processes,
      host,
      diskUsage,
      sqlite: sqliteMetrics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/diagnostics/pm2/:name/restart', async (req, res) => {
  const { name } = req.params;
  const allowed = ['subtie', 'subtie-worker', 'subtie-watchdog'];
  if (!allowed.includes(name)) return res.status(400).json({ error: 'Invalid PM2 service name' });

  try {
    const { stdout } = await execAsync(`npx pm2 restart ${name}`);
    res.json({ success: true, message: `PM2 service ${name} restarted`, output: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/diagnostics/sqlite/vacuum', async (req, res) => {
  try {
    if (!fs.existsSync(SQLITE_FILE)) return res.status(404).json({ error: 'SQLite file not found' });
    const { stdout } = await execAsync(`sqlite3 "${SQLITE_FILE}" "VACUUM; PRAGMA optimize;"`);
    const size = fs.statSync(SQLITE_FILE).size;
    res.json({ success: true, message: 'SQLite database vacuumed and optimized', newSizeBytes: size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MODULE 11: GLOBAL SYSTEM & PLATFORM SETTINGS
// -------------------------------------------------------------
router.get('/settings', (req, res) => {
  try {
    const s = readSettings();
    res.json({ success: true, settings: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const current = readSettings();
    const updated = { ...current, ...req.body };
    writeSettings(updated);
    res.json({ success: true, settings: updated, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
