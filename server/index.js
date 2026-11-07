import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import socketService from './services/socket.js';
import queueService, { redisConnection } from './services/queue.js';
import geminiPool from './services/geminiPool.js';
import cloudStorage from './services/storage.js';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is explicitly loaded from both root and server folders
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { detectCharactersFromSubtitles, replaceCharacterNamesInSubtitles } from './services/characterService.js';
import { torrentService } from './services/torrentService.js';
import { detectVisualSignsFromVideo } from './services/visionOcrService.js';
import { getAllFolderCovers, generateFolderCover } from './services/folderCoverService.js';
import { ensureWebCompatibleVideo } from './services/videoService.js';
import paymentService, {
  getPackagesCatalogue,
  createPaymentIntent,
  verifyAndCreditPayment,
  getUserTransactions,
  getUserTotalPaid,
  recordAdminCreditTransaction
} from './services/paymentService.js';
import os from 'os';
import { logSystemEvent, readSystemLogs, clearSystemLogs } from './services/logService.js';
import { readNewsletters, writeNewsletters, generateNewsletterWithAI } from './services/newsletterService.js';
import { execFile } from 'child_process';

// Set ffmpeg binary path from installer with system fallback & executable verification
let resolvedFfmpegPath = ffmpegInstaller?.path;
try {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    resolvedFfmpegPath = process.env.FFMPEG_PATH;
  } else if (!resolvedFfmpegPath || !fs.existsSync(resolvedFfmpegPath)) {
    if (fs.existsSync('/usr/bin/ffmpeg')) resolvedFfmpegPath = '/usr/bin/ffmpeg';
    else if (fs.existsSync('/usr/local/bin/ffmpeg')) resolvedFfmpegPath = '/usr/local/bin/ffmpeg';
  }
  if (resolvedFfmpegPath && fs.existsSync(resolvedFfmpegPath)) {
    try { fs.chmodSync(resolvedFfmpegPath, 0o755); } catch (_) {}
    ffmpeg.setFfmpegPath(resolvedFfmpegPath);
    console.log(`🎬 [FFmpeg] Path verified: ${resolvedFfmpegPath}`);
  }
} catch (ffErr) {
  console.warn('⚠️ [FFmpeg Init Warning]:', ffErr.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'X-User-Id', 'Accept']
}));
app.options(/(.*)/, cors());
app.use(express.json({ limit: '100mb' }));

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Serve static uploaded videos, audio files, and user avatars
app.use('/uploads', express.static(UPLOADS_DIR));

// Load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath);
    } else {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      lines.forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
        if (match) process.env[match[1]] = match[2];
      });
    }
  } catch (err) {
    console.error('Error loading .env file:', err.message);
  }
}

// ----------------------------------------------------
// Resend Email Dispatch Engine (Domain: msoms.ai)
// ----------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

async function sendMailNotification(toEmail, subject, htmlContent, customFrom = null) {
  const fromAddress = customFrom || 'Subtie Platform <noreply@subtie.msoms.ai>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject: subject,
        html: htmlContent
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn(`[Resend Email Error] API returned status ${res.status}:`, data);
      // Fallback with primary verified domain address if custom sub-address fails
      if (fromAddress !== 'Subtie Platform <ai@msoms.ai>') {
        return sendMailNotification(toEmail, subject, htmlContent, 'Subtie Platform <ai@msoms.ai>');
      }
      return { success: false, error: data.message || 'Resend email error' };
    }

    console.log(`[Resend Email Sent] ID: ${data.id} to ${toEmail}`);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error(`[Resend Email Exception] Failed to send email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// Password Validation Rules Engine
// Minimum 8 characters, at least 1 lowercase, 1 uppercase, 1 digit, 1 special char
// ----------------------------------------------------
function validatePasswordRules(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  const minLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const valid = minLength && hasLower && hasUpper && hasNumber && hasSpecial;
  return {
    valid,
    minLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSpecial
  };
}

// ----------------------------------------------------
// User Store Data Helpers
// ----------------------------------------------------
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, '{}', 'utf8');
      return {};
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function findUserByEmail(email) {
  if (!email) return null;
  const users = readUsers();
  const lower = email.trim().toLowerCase();
  return Object.values(users).find(u => u.email && u.email.toLowerCase() === lower) || null;
}

// Seed default Admin user msoms1@gmail.com if missing
function ensureAdminUser() {
  const users = readUsers();
  const adminEmail = 'msoms1@gmail.com';
  const existing = findUserByEmail(adminEmail);

  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('P@ssw0rd', salt);
    const adminUser = {
      id: 'usr_admin_msoms1',
      email: adminEmail,
      passwordHash: hash,
      firstName: 'MSOMS',
      lastName: 'Admin',
      msomsUsername: 'MSOMS_Leader',
      role: 'Admin',
      isVerified: true,
      avatarUrl: '',
      createdAt: new Date('2026-08-01T00:00:00.000Z').toISOString(),
      subscriptions: { updates: true, newsletter: true, notifications: true },
      preferences: { defaultLanguage: 'ar', defaultTheme: 'dark' }
    };
    users[adminUser.id] = adminUser;
    writeUsers(users);
    console.log(`[User Store] Seeded Admin account: ${adminEmail}`);
  }
}

ensureAdminUser();

// Sanitize model name: automatically upgrade deprecated/expired 1.5/2.0/2.5 models to active models
export function sanitizeGeminiModel(modelName) {
  if (!modelName || typeof modelName !== 'string') return 'gemini-3.8-flash';
  const m = modelName.trim().toLowerCase();
  if (m.includes('1.5') || m.includes('2.0') || m.includes('2.5-flash') || m.includes('2.5-pro') || m === 'gemini-pro' || m === 'gemini-1.0-pro') {
    return 'gemini-3.8-flash';
  }
  return modelName.trim();
}

// Helper functions for project store
const DEFAULT_SETTINGS = {
  geminiModel: 'gemini-3.8-flash',
  fallbackModel1: 'gemini-flash-latest',
  fallbackModel2: 'gemini-pro-latest',
  visionOcrModel: 'gemini-3.8-flash',
  apiCallStrategy: 'file_api',
  audioMimeType: 'audio/mpeg',
  chunkDuration: 120,
  maxOutputTokens: 8192,
  temperature: 0.2,
  promptStage1: '',
  promptStage2: '',
  adminAlertEmail: 'admin@msoms.ai'
};

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      geminiModel: sanitizeGeminiModel(parsed.geminiModel || DEFAULT_SETTINGS.geminiModel),
      fallbackModel1: sanitizeGeminiModel(parsed.fallbackModel1 || DEFAULT_SETTINGS.fallbackModel1),
      fallbackModel2: sanitizeGeminiModel(parsed.fallbackModel2 || DEFAULT_SETTINGS.fallbackModel2),
      visionOcrModel: sanitizeGeminiModel(parsed.visionOcrModel || DEFAULT_SETTINGS.visionOcrModel)
    };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Proactive Admin Email Alert for Model Deprecations or Engine Errors
async function notifyAdminModelDeprecation(failedModel, fallbackModel, errorMsg) {
  try {
    const settings = readSettings();
    const adminEmail = settings.adminAlertEmail || 'admin@msoms.ai';
    const emailSubject = `⚠️ [تنبيه منصة Subtie] تحذير نموذج الذكاء الاصطناعي — ${failedModel}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e11d48; background-color: #0f172a; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #fb7185; margin-top: 0;">⚠️ تنبيه محرك الذكاء الاصطناعي — Subtie Platform</h2>
        <p style="font-size: 14px; line-height: 1.6;">تم اكتشاف خطأ أو انتهاء صلاحية في استدعاء نموذج Google Gemini التالي:</p>
        <div style="background-color: #1e293b; padding: 14px 18px; border-radius: 10px; border-left: 4px solid #f43f5e; margin: 16px 0; font-family: monospace; font-size: 13px;">
          <strong style="color: #fca5a5;">النموذج المتأثر:</strong> ${failedModel}<br/>
          <strong style="color: #fca5a5;">رسالة الخطأ:</strong> ${errorMsg}
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #4ade80;">
          ✅ قامت المنصة تلقائياً بالتحويل إلى النموذج البديل: <strong>${fallbackModel}</strong> لضمان استمرار معالجة أعمال المستخدمين دون توقف.
        </p>
        <p style="font-size: 14px; line-height: 1.6;">
          يرجى الدخول إلى <strong>لوحة تحكم المدير &gt; تبويب إعدادات الذكاء الاصطناعي (AI Settings)</strong> لتحديث المعرف الأساسي للنموذج المعتمد رسمياً من Google Gemini.
        </p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://subtie.msoms.ai" style="display: inline-block; background: linear-gradient(135deg, #9333ea, #db2777); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold;">
            الانتقال إلى لوحة تحكم Subtie
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">تم إرسال هذا التنبيه التلقائي من نظام الرقابة الذاتي لمنصة Subtie AI.</p>
      </div>
    `;
    await sendMailNotification(adminEmail, emailSubject, emailHtml);
    logSystemEvent('warning', 'gemini_api', `Model deprecation alert sent to admin for model ${failedModel}`, { failedModel, fallbackModel, errorMsg });
  } catch (err) {
    console.error('[Model Deprecation Alert Error]', err.message);
  }
}

function readProjects() {
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function writeProjects(data) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function findProjectDirectories(userId, projectName, projectId, explicitVideoUrl = null) {
  const safeFolderName = projectName ? projectName.replace(/[\/\\?%*:|"<>]/g, '_').trim() : 'Uncategorized';
  const isVideoExt = (f) => f.startsWith('video.') || /\.(mp4|mkv|avi|mov|webm|flv|ts|wmv|m4v)$/i.test(f);

  // 1. Direct resolution via explicitVideoUrl (from project.videoUrl) if local file exists
  if (explicitVideoUrl && typeof explicitVideoUrl === 'string' && !explicitVideoUrl.startsWith('http')) {
    const cleanUrl = explicitVideoUrl.startsWith('/') ? explicitVideoUrl.slice(1) : explicitVideoUrl;
    const candidates = [
      path.join(__dirname, cleanUrl),
      path.join(__dirname, '..', cleanUrl),
      path.join(UPLOADS_DIR, cleanUrl.replace(/^uploads\/?/, ''))
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        const dir = path.dirname(cand);
        const dirFiles = fs.readdirSync(dir).filter(isVideoExt);
        const urlPrefix = path.dirname(explicitVideoUrl);
        return {
          targetDir: dir,
          urlPrefix: urlPrefix.startsWith('/') ? urlPrefix : `/${urlPrefix}`,
          safeFolderName,
          videoFiles: dirFiles.length > 0 ? dirFiles : [path.basename(cand)]
        };
      }
    }
  }

  // 2. Search candidate directories in priority order
  const candidateDirs = [
    { dir: path.join(UPLOADS_DIR, userId, safeFolderName, projectId), prefix: `/uploads/${userId}/${safeFolderName}/${projectId}` },
    { dir: path.join(UPLOADS_DIR, userId, projectName || 'Uncategorized', projectId), prefix: `/uploads/${userId}/${projectName || 'Uncategorized'}/${projectId}` },
    { dir: path.join(UPLOADS_DIR, userId, 'Uncategorized', projectId), prefix: `/uploads/${userId}/Uncategorized/${projectId}` },
    { dir: path.join(UPLOADS_DIR, userId, projectId), prefix: `/uploads/${userId}/${projectId}` },
    { dir: path.join(UPLOADS_DIR, projectId), prefix: `/uploads/${projectId}` }
  ];

  for (const cand of candidateDirs) {
    if (fs.existsSync(cand.dir)) {
      const files = fs.readdirSync(cand.dir).filter(isVideoExt);
      if (files.length > 0) {
        return {
          targetDir: cand.dir,
          urlPrefix: cand.prefix,
          safeFolderName,
          videoFiles: files
        };
      }
    }
  }

  // 3. Recursive directory scan under UPLOADS_DIR / userId for any folder named projectId
  const userDir = path.join(UPLOADS_DIR, userId);
  if (fs.existsSync(userDir)) {
    try {
      const subEntries = fs.readdirSync(userDir, { withFileTypes: true });
      for (const entry of subEntries) {
        if (entry.isDirectory()) {
          const possibleProjectDir = path.join(userDir, entry.name, projectId);
          if (fs.existsSync(possibleProjectDir)) {
            const files = fs.readdirSync(possibleProjectDir).filter(isVideoExt);
            if (files.length > 0) {
              return {
                targetDir: possibleProjectDir,
                urlPrefix: `/uploads/${userId}/${entry.name}/${projectId}`,
                safeFolderName: entry.name,
                videoFiles: files
              };
            }
          }
        }
      }
    } catch (_) {}
  }

  // 4. Default fallback: targetDir is standard nested directory
  const defaultTargetDir = path.join(UPLOADS_DIR, userId, safeFolderName, projectId);
  const defaultUrlPrefix = `/uploads/${userId}/${safeFolderName}/${projectId}`;
  const defaultVideoFiles = fs.existsSync(defaultTargetDir) ? fs.readdirSync(defaultTargetDir).filter(isVideoExt) : [];

  return { targetDir: defaultTargetDir, urlPrefix: defaultUrlPrefix, safeFolderName, videoFiles: defaultVideoFiles };
}

// Helper to probe video duration in seconds accurately via FFmpeg
function probeVideoDuration(videoPath) {
  return new Promise((resolve) => {
    try {
      if (!resolvedFfmpegPath || !fs.existsSync(resolvedFfmpegPath)) {
        return resolve(0);
      }
      execFile(resolvedFfmpegPath, ['-i', videoPath], (err, stdout, stderr) => {
        const match = (stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
        if (match) {
          const secs = Math.round(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
          return resolve(Math.max(1, secs));
        }
        resolve(0);
      });
    } catch (_) {
      resolve(0);
    }
  });
}

// Ingests audio chunk for Gemini: supports both Google File API and Direct Base64 Inline, with automatic failover
async function prepareAudioPartForGemini(ai, chunkPath, strategy = 'file_api') {
  const chunkStats = fs.existsSync(chunkPath) ? fs.statSync(chunkPath) : null;
  const chunkSizeMb = chunkStats ? chunkStats.size / (1024 * 1024) : 0;

  // For chunks under 15MB or if strategy is inline_base64, use base64 inline directly:
  // It is instant, eliminates Google File API propagation delays, avoids MIME mismatch errors, and never leaves orphaned cloud files.
  if (strategy === 'inline_base64' || chunkSizeMb <= 15) {
    const base64Data = fs.readFileSync(chunkPath).toString('base64');
    return { inlineData: { data: base64Data, mimeType: 'audio/mp3' }, mode: 'inline' };
  }

  // Strategy: file_api with seamless inline fallback
  try {
    const uploadResult = await ai.files.upload({
      file: chunkPath,
      mimeType: 'audio/mpeg'
    });
    // Brief delay to allow Google File propagation
    await new Promise(r => setTimeout(r, 1500));
    const mime = uploadResult.mimeType || 'audio/mpeg';
    return { fileData: { fileUri: uploadResult.uri, mimeType: mime }, mode: 'file_api', fileUri: uploadResult.uri };
  } catch (uploadErr) {
    console.warn(`⚠️ [Gemini Audio Ingestion] File API upload failed (${uploadErr.message}). Automatically falling back to direct Base64 inline payload...`);
    const base64Data = fs.readFileSync(chunkPath).toString('base64');
    return { inlineData: { data: base64Data, mimeType: 'audio/mp3' }, mode: 'inline_fallback' };
  }
}

// Extract Audio Track from MP4/MKV/Video File locally
function extractAudioTrack(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`[Audio Extractor] Extracting audio track from: ${videoPath} -> ${audioPath}`);
    ffmpeg(videoPath)
      .output(audioPath)
      .outputOptions(['-y', '-vn', '-acodec libmp3lame', '-ab 128k', '-ar 44100', '-ac 2', '-map 0:a:0?'])
      .on('end', () => {
        try {
          const stats = fs.statSync(audioPath);
          if (stats.size < 100) {
            return reject(new Error(`Extracted audio file is empty or corrupted (${stats.size} bytes)`));
          }
          console.log(`[Audio Extractor] Audio extraction completed: ${audioPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
          resolve(audioPath);
        } catch (statErr) {
          reject(statErr);
        }
      })
      .on('error', (err) => {
        console.error('[Audio Extractor Error]', err);
        reject(err);
      })
      .run();
  });
}

// ----------------------------------------------------
// Configure Multer storage under User-Scoped Directory:
// /server/uploads/{userId}/{projectId}/
// ----------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.headers['x-user-id'] || req.query?.userId || req.body?.userId || 'usr_guest';
    const projectId = req.headers['x-project-id'] || req.query?.projectId || ('subtie_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    req.projectId = projectId;
    req.userId = userId;
    
    // Create physical folder structure using projectName from headers, query, or body
    const rawFolderName = req.headers['x-project-name']
      ? decodeURIComponent(req.headers['x-project-name'])
      : (req.query?.projectName || req.body?.projectName || 'Uncategorized');
    const safeFolderName = rawFolderName.replace(/[\/\\?%*:|\"<>]/g, '_').trim();
    req.safeFolderName = safeFolderName;
    
    const userDir = path.join(UPLOADS_DIR, userId);
    const folderDir = path.join(userDir, safeFolderName);
    const projectDir = path.join(folderDir, projectId);
    
    fs.mkdirSync(projectDir, { recursive: true });
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `video${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4GB max file size for 3GB+ anime movies and episodes
});

// Configure Multer storage for User Avatar Uploads:
// /server/uploads/{userId}/avatar.png
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.headers['x-user-id'] || req.body?.userId || 'usr_guest';
    const userDir = path.join(UPLOADS_DIR, userId);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Configure Multer for Incoming .torrent Files (Max 30MB)
const torrentIncomingDir = path.join(UPLOADS_DIR, 'torrents_incoming');
if (!fs.existsSync(torrentIncomingDir)) fs.mkdirSync(torrentIncomingDir, { recursive: true });

const torrentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, torrentIncomingDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `torrent_${Date.now()}_${safeName}`);
  }
});

const torrentUpload = multer({
  storage: torrentStorage,
  limits: { fileSize: 30 * 1024 * 1024 }
});

// ====================================================
// AUTHENTICATION & USER MANAGEMENT ENDPOINTS
// ====================================================

// 1. User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, msomsUsername, lang = 'ar' } = req.body;

    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'Email, password, and first name are required.' });
    }

    // Validate password rules
    const passEval = validatePasswordRules(password);
    if (!passEval.valid) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and contain lowercase, uppercase, number, and special character.'
      });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const users = readUsers();
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    
    // Generate 6-digit OTP code for email verification
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const selectedLang = lang === 'en' ? 'en' : 'ar';

    const newUser = {
      id: userId,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      msomsUsername: (msomsUsername || '').trim(),
      role: 'Translator', // Default role
      isVerified: false,
      verificationCode,
      avatarUrl: '',
      minuteBalance: 35, // 35 minutes free tier for new users
      hasPurchased: false, // Tracks if user ever made a top-up
      createdAt: new Date().toISOString(),
      subscriptions: { updates: true, newsletter: true, notifications: true },
      preferences: { defaultLanguage: selectedLang, defaultTheme: 'dark' }
    };

    users[userId] = newUser;
    writeUsers(users);

    // Build Bilingual OTP Verification Email Template
    const isArMail = selectedLang === 'ar';
    const emailSubject = isArMail
      ? 'منصة سابتاي لترجمة الأنمي — رمز تفعيل حسابك (OTP)'
      : 'Subtie Anime Fansub Platform — Your Account Verification Code (OTP)';

    const emailHtml = isArMail ? `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #7c3aed; border-radius: 20px; background-color: #0f172a; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #c084fc; font-size: 26px; margin: 0; font-weight: 900;">منصة سابتاي (Subtie)</h1>
          <p style="color: #f472b6; font-size: 13px; margin-top: 4px; font-weight: bold;">منصة ترجمة الأنمي بالذكاء الاصطناعي — إمـسـومـس</p>
        </div>

        <p style="font-size: 15px; font-weight: bold; color: #e2e8f0;">مرحباً ${newUser.firstName}،</p>
        <p style="font-size: 14px; color: #cbd5e1; leading-height: 1.6;">نشكرك على الانضمام إلى منصة سابتاي لترجمة الأنمي. رمز تفعيل حسابك المكون من 6 أرقام هو:</p>

        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 2px dashed #c084fc; padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${verificationCode}</span>
        </div>

        <p style="font-size: 13px; color: #94a3b8; text-align: center;">يرجى إدخال هذا الرمز في المنصة لإكمال تفعيل الحساب والبدء في إنشاء مشاريع الترجمة.</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center;">شبكة إمـسـومـس أنمي | Subtie Platform powered by msoms.ai</p>
      </div>
    ` : `
      <div dir="ltr" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #7c3aed; border-radius: 20px; background-color: #0f172a; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #c084fc; font-size: 26px; margin: 0; font-weight: 900;">Subtie Fansub Hub</h1>
          <p style="color: #f472b6; font-size: 13px; margin-top: 4px; font-weight: bold;">AI-Powered Anime Subtitles by msoms.ai</p>
        </div>

        <p style="font-size: 15px; font-weight: bold; color: #e2e8f0;">Hello ${newUser.firstName},</p>
        <p style="font-size: 14px; color: #cbd5e1; leading-height: 1.6;">Thank you for registering on Subtie. Your 6-digit email verification OTP code is:</p>

        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 2px dashed #c084fc; padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${verificationCode}</span>
        </div>

        <p style="font-size: 13px; color: #94a3b8; text-align: center;">Enter this code in Subtie to verify your email address and activate your account.</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center;">MSOMS Anime Subtitle Hub | Subtie Platform powered by msoms.ai</p>
      </div>
    `;

    // Send Verification Email via Resend
    const mailResult = await sendMailNotification(newUser.email, emailSubject, emailHtml);
    console.log('[Register Mail Dispatch Result]', mailResult);

    return res.json({
      success: true,
      message: isArMail
        ? 'تم إنشاء الحساب بنجاح! تم إرسال رمز التفعيل OTP إلى بريدك الإلكتروني.'
        : 'Registration successful! Verification code sent to your email address.',
      email: newUser.email
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({ error: 'Failed to process registration: ' + err.message });
  }
});

// 2. Verify Email OTP Code
app.post('/api/auth/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  if (user.isVerified) {
    return res.json({ success: true, message: 'Account is already verified.', user });
  }

  if (String(user.verificationCode).trim() !== String(code).trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  const users = readUsers();
  users[user.id].isVerified = true;
  delete users[user.id].verificationCode;
  writeUsers(users);

  const { passwordHash, verificationCode, ...safeUser } = users[user.id];

  // Send Post-Verification Welcome & Platform Guide Email
  const userLang = safeUser.preferences?.defaultLanguage || 'ar';
  const isArWelcome = userLang === 'ar';

  const welcomeSubject = isArWelcome
    ? `مرحباً بك في منصة سابتاي لترجمة الأنمي (Subtie) — الدليل الشامل لميزات المنصة 🎬`
    : `Welcome to Subtie Anime Fansub Platform — Complete Feature & User Guide 🎬`;

  const welcomeHtml = isArWelcome ? `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 28px; border: 2px solid #7c3aed; border-radius: 24px; background-color: #0f172a; color: #ffffff;">
      
      <div style="text-align: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 24px;">
        <h1 style="color: #c084fc; font-size: 28px; margin: 0; font-weight: 900;">منصة سابتاي لترجمة الأنمي 🌟</h1>
        <p style="color: #f472b6; font-size: 14px; margin-top: 6px; font-weight: bold;">Subtie AI Fansub Platform | msoms.ai</p>
      </div>

      <p style="font-size: 16px; font-weight: bold; color: #38bdf8;">مرحباً بك يا ${safeUser.firstName} في عائلة سابتاي! 🎉</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7;">تم تفعيل حسابك بنجاح. يسعدنا انضمامك إلى نخبة المترجمين في عالم ترجمة وتوقيت الأنمي. إليك دليلك السريع للاستفادة الكاملة من كافة ميزات المنصة:</p>

      <div style="background-color: #1e1b4b; border: 1px solid #6d28d9; border-radius: 16px; padding: 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
        <h3 style="color: #a855f7; margin-top: 0; font-size: 16px; font-weight: bold;">🚀 الميزات والدليل التشغيلي للمنصة:</h3>
        
        <p><strong>1. 📹 رفع المشاريع ومعالجة الصوت بالذكاء الاصطناعي:</strong><br />
        يمكنك رفع حلقات الأنمي الكاملة، الأفلام، العروض الترويجية، أو المقاطع القصيرة. تقوم المنصة بفصل الصوت وتفريغ الحوار الياباني وترجمته بالذكاء الاصطناعي (Gemini AI) إلى الإنجليزية والعربية تلقائياً.</p>

        <p><strong>2. ⏱️ محرر التزامن المتقدم (Subtitle Workspace):</strong><br />
        جدول تفاعلي مدمج مع مشغل فيديو وموجات الصوت (Waveform) للتوقيت والدقة بالمللي ثانية، مع حاسب سرعة القراءة (CPS) لتفادي التوقيت السريع.</p>

        <p><strong>3. 👥 التعاون ومراجعة التدقيق (Translator & Auditor):</strong><br />
        يمكنك تعيين مدقق جودة (Auditor) لمراجعة مشروعك، إجراء التعديلات، إبداء الملاحظات، واعتماد الأسطر نهائياً.</p>

        <p><strong>4. 📥 تصدير الترجمة بصيغ احترافية:</strong><br />
        تصدير الترجمة النهائية مباشرة بصيغة <strong>ASS</strong> (مع حفظ الاستايلات والألوان والخطوط) أو صيغة <strong>SRT</strong> القياسية.</p>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="http://localhost:5173" style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: #ffffff; padding: 14px 32px; border-radius: 14px; font-weight: 900; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 10px 25px rgba(168, 85, 247, 0.4);">ابتدئ مشروعك الأول الآن 🚀</a>
      </div>

      <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0 16px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">جميع الحقوق محفوظة © شبكة إمـسـومـس أنمي | msoms.ai</p>
    </div>
  ` : `
    <div dir="ltr" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 28px; border: 2px solid #7c3aed; border-radius: 24px; background-color: #0f172a; color: #ffffff;">
      
      <div style="text-align: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 24px;">
        <h1 style="color: #c084fc; font-size: 28px; margin: 0; font-weight: 900;">Subtie Fansub Hub 🌟</h1>
        <p style="color: #f472b6; font-size: 14px; margin-top: 6px; font-weight: bold;">Subtie AI Fansub Platform | msoms.ai</p>
      </div>

      <p style="font-size: 16px; font-weight: bold; color: #38bdf8;">Welcome to Subtie, ${safeUser.firstName}! 🎉</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7;">Your email has been verified successfully. We are excited to have you join our community of anime translators. Here is your getting started guide:</p>

      <div style="background-color: #1e1b4b; border: 1px solid #6d28d9; border-radius: 16px; padding: 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
        <h3 style="color: #a855f7; margin-top: 0; font-size: 16px; font-weight: bold;">🚀 Key Features & Platform Overview:</h3>
        
        <p><strong>1. 📹 Video Upload & AI Processing:</strong><br />
        Upload full episodes, movies, trailers, or clips. Extract audio and automatically transcribe Japanese speech and translate to English & Arabic using Gemini AI.</p>

        <p><strong>2. ⏱️ Advanced Subtitle Sync Workspace:</strong><br />
        Interactive working table with synced Video Player and Audio Waveform for millisecond timing accuracy, featuring real-time CPS speed indicators.</p>

        <p><strong>3. 👥 Multi-Role Collaboration (Translator & Auditor):</strong><br />
        Assign certified auditors to audit your subtitle lines, add notes, and grant final line approvals.</p>

        <p><strong>4. 📥 Professional Subtitle Exports:</strong><br />
        Export final subtitles in styled <strong>ASS</strong> format (with custom fonts, positioning, and colors) or standard <strong>SRT</strong> format.</p>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="http://localhost:5173" style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: #ffffff; padding: 14px 32px; border-radius: 14px; font-weight: 900; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 10px 25px rgba(168, 85, 247, 0.4);">Launch Workspace Now 🚀</a>
      </div>

      <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0 16px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">All Rights Reserved © MSOMS Anime Network | msoms.ai</p>
    </div>
  `;

  // Send Welcome Email asynchronously
  sendMailNotification(safeUser.email, welcomeSubject, welcomeHtml).catch(e => console.error('Failed to send welcome email:', e));

  return res.json({
    success: true,
    message: isArWelcome ? 'تم تأكيد البريد الإلكتروني بنجاح! تم إرسال دليل البدء لبريدك الإلكتروني.' : 'Email verified successfully! Getting started guide sent to your inbox.',
    user: safeUser
  });
});

// 3. Resend Verification OTP Code
app.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  const user = findUserByEmail(email);

  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const users = readUsers();
  users[user.id].verificationCode = verificationCode;
  writeUsers(users);

  const userLang = user.preferences?.defaultLanguage || 'ar';
  const isAr = userLang === 'ar';

  const emailSubject = isAr
    ? 'منصة سابتاي لترجمة الأنمي — رمز التفعيل الجديد (OTP)'
    : 'Subtie Anime Fansub Platform — Your New Verification Code (OTP)';

  const emailHtml = isAr ? `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #7c3aed; border-radius: 20px; background-color: #0f172a; color: #ffffff;">
      <h2 style="color: #c084fc; text-align: center;">إعادة إرسال رمز التفعيل (OTP)</h2>
      <p style="font-size: 14px; color: #cbd5e1;">مرحباً ${user.firstName}، رمز تفعيل حسابك الجديد المكون من 6 أرقام هو:</p>
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 2px dashed #c084fc; padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${verificationCode}</span>
      </div>
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">يرجى إدخال هذا الرمز في منصة سابتاي لإكمال التفعيل.</p>
    </div>
  ` : `
    <div dir="ltr" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #7c3aed; border-radius: 20px; background-color: #0f172a; color: #ffffff;">
      <h2 style="color: #c084fc; text-align: center;">Resent Verification Code (OTP)</h2>
      <p style="font-size: 14px; color: #cbd5e1;">Hello ${user.firstName}, your new 6-digit verification code is:</p>
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 2px dashed #c084fc; padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${verificationCode}</span>
      </div>
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">Enter this code in Subtie to complete account verification.</p>
    </div>
  `;

  await sendMailNotification(user.email, emailSubject, emailHtml);

  return res.json({
    success: true,
    message: isAr ? 'تم إعادة إرسال رمز التفعيل إلى بريدك الإلكتروني.' : 'New verification code sent to your email.'
  });
});

// 4. User Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const passwordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      error: 'Your email address is not verified yet. Please enter the verification code sent to your email.',
      requiresVerification: true,
      email: user.email
    });
  }

  if (user.isSuspended) {
    return res.status(403).json({
      error: 'حسابك معلق حالياً من قبل الإدارة. يرجى التواصل مع الدعم الفني.',
      isSuspended: true
    });
  }

  const { passwordHash, verificationCode, passwordResetCode, ...safeUser } = user;

  return res.json({
    success: true,
    message: 'Logged in successfully!',
    user: safeUser
  });
});

// 5. Request Password Reset (Forgot Password)
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email address.' });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const users = readUsers();
  users[user.id].passwordResetCode = resetCode;
  users[user.id].passwordResetExpiry = Date.now() + 15 * 60 * 1000; // 15 mins expiry
  writeUsers(users);

  const emailSubject = 'Subtie Platform — Password Reset OTP Code';
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e11d48; background-color: #0f172a; color: #ffffff;">
      <h2 style="color: #f43f5e; text-align: center;">Subtie Password Reset</h2>
      <p>Hello ${user.firstName},</p>
      <p>You requested to reset your password. Use the following 6-digit OTP code to complete password reset:</p>
      <div style="background-color: #1e1b4b; border: 2px dashed #f43f5e; padding: 15px; text-align: center; border-radius: 12px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f43f5e;">${resetCode}</span>
      </div>
      <p>This code will expire in 15 minutes.</p>
    </div>
  `;

  sendMailNotification(user.email, emailSubject, emailHtml);

  return res.json({
    success: true,
    message: 'Password reset OTP code sent to your email.',
    devOtp: resetCode
  });
});

// 6. Complete Password Reset
app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required.' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  if (String(user.passwordResetCode).trim() !== String(code).trim()) {
    return res.status(400).json({ error: 'Invalid password reset code.' });
  }

  if (user.passwordResetExpiry && Date.now() > user.passwordResetExpiry) {
    return res.status(400).json({ error: 'Password reset code has expired. Please request a new code.' });
  }

  const passEval = validatePasswordRules(newPassword);
  if (!passEval.valid) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long and contain lowercase, uppercase, number, and special character.'
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);

  const users = readUsers();
  users[user.id].passwordHash = passwordHash;
  delete users[user.id].passwordResetCode;
  delete users[user.id].passwordResetExpiry;
  writeUsers(users);

  return res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.'
  });
});

// 7. Get Current Authenticated User Details
app.get('/api/auth/me', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const userId = req.headers['x-user-id'] || req.query?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const users = readUsers();
  const user = users[userId];

  if (!user) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const { passwordHash, verificationCode, passwordResetCode, ...safeUser } = user;
  return res.json({ success: true, user: safeUser, minuteBalance: safeUser.minuteBalance !== undefined ? safeUser.minuteBalance : 0 });
});

// 8. Update User Profile Info (Name, Forum Username, Subscriptions, Preferences)
app.put('/api/auth/profile', (req, res) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const users = readUsers();
  const user = users[userId];

  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const { firstName, lastName, msomsUsername, subscriptions, preferences } = req.body;

  if (firstName) user.firstName = firstName.trim();
  if (lastName !== undefined) user.lastName = lastName.trim();
  if (msomsUsername !== undefined) user.msomsUsername = msomsUsername.trim();
  if (subscriptions) user.subscriptions = { ...user.subscriptions, ...subscriptions };
  if (preferences) user.preferences = { ...user.preferences, ...preferences };

  users[userId] = user;
  writeUsers(users);

  const { passwordHash, verificationCode, passwordResetCode, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Profile updated successfully!',
    user: safeUser
  });
});

// 9. Upload Profile Avatar Logo
app.post('/api/auth/avatar', avatarUpload.single('avatar'), (req, res) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const users = readUsers();
  const user = users[userId];

  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No avatar image file uploaded.' });
  }

  const avatarUrl = `/uploads/${userId}/${req.file.filename}`;
  user.avatarUrl = avatarUrl;
  users[userId] = user;
  writeUsers(users);

  const { passwordHash, verificationCode, passwordResetCode, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Profile avatar uploaded successfully!',
    avatarUrl,
    user: safeUser
  });
});

// 10. Request Email Address Change (Sends OTP to new email)
app.post('/api/auth/change-email/request', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  const { newEmail } = req.body;

  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  if (!newEmail) return res.status(400).json({ error: 'New email address is required.' });

  const cleanNewEmail = newEmail.trim().toLowerCase();
  const existing = findUserByEmail(cleanNewEmail);
  if (existing) {
    return res.status(400).json({ error: 'This email address is already in use by another account.' });
  }

  const users = readUsers();
  const user = users[userId];

  if (!user) return res.status(404).json({ error: 'User account not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.newEmailPending = cleanNewEmail;
  user.newEmailOtp = otp;
  writeUsers(users);

  const emailSubject = 'Subtie Platform — Confirm Email Address Change';
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #7c3aed; background-color: #0f172a; color: #ffffff;">
      <h2 style="color: #a855f7; text-align: center;">Confirm New Email Address</h2>
      <p>Hello ${user.firstName},</p>
      <p>You requested to change your Subtie account email address to <b>${cleanNewEmail}</b>. Use the OTP code below to confirm:</p>
      <div style="background-color: #1e1b4b; border: 2px dashed #a855f7; padding: 15px; text-align: center; border-radius: 12px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">${otp}</span>
      </div>
    </div>
  `;

  sendMailNotification(cleanNewEmail, emailSubject, emailHtml);

  return res.json({
    success: true,
    message: `Verification OTP sent to ${cleanNewEmail}.`,
    devOtp: otp
  });
});

// 11. Confirm Email Address Change OTP
app.post('/api/auth/change-email/confirm', (req, res) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  const { code } = req.body;

  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  if (!code) return res.status(400).json({ error: 'Verification code is required.' });

  const users = readUsers();
  const user = users[userId];

  if (!user || !user.newEmailPending || !user.newEmailOtp) {
    return res.status(400).json({ error: 'No pending email change request found.' });
  }

  if (String(user.newEmailOtp).trim() !== String(code).trim()) {
    return res.status(400).json({ error: 'Invalid verification OTP code.' });
  }

  user.email = user.newEmailPending;
  delete user.newEmailPending;
  delete user.newEmailOtp;
  users[userId] = user;
  writeUsers(users);

  const { passwordHash, verificationCode, passwordResetCode, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Email address updated successfully!',
    user: safeUser
  });
});

// 12. Change Password (Logged-in user)
app.post('/api/auth/change-password', (req, res) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  const { currentPassword, newPassword } = req.body;

  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  const users = readUsers();
  const user = users[userId];

  if (!user) return res.status(404).json({ error: 'User account not found' });

  const validCurrent = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!validCurrent) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const passEval = validatePasswordRules(newPassword);
  if (!passEval.valid) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long and contain lowercase, uppercase, number, and special character.'
    });
  }

  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(newPassword, salt);
  users[userId] = user;
  writeUsers(users);

  return res.json({
    success: true,
    message: 'Password changed successfully!'
  });
});

// 13. Admin Endpoint: Get All Registered Users (Enriched with Projects, Videos, Usage & Payments)
function getEnrichedUsersList() {
  const users = readUsers();
  const projects = readProjects();
  const allProjects = Object.values(projects);

  return Object.values(users).map(u => {
    const userProjects = allProjects.filter(p => p.ownerId === u.id);
    const userVideos = userProjects.filter(p => p.videoUrl && p.videoUrl.trim() !== '');

    let totalMinutesUsed = 0;
    for (const p of userProjects) {
      if (p.duration) {
        totalMinutesUsed += Math.ceil(Number(p.duration) / 60);
      } else if (Array.isArray(p.subtitles) && p.subtitles.length > 0) {
        const lastSub = p.subtitles[p.subtitles.length - 1];
        if (lastSub?.endTime) {
          totalMinutesUsed += Math.ceil(parseTimestampToSeconds(lastSub.endTime) / 60);
        }
      }
    }

    const totalPaid = getUserTotalPaid(u.id);
    const { passwordHash, verificationCode, passwordResetCode, ...safe } = u;

    return {
      ...safe,
      totalProjects: userProjects.length,
      totalVideos: userVideos.length,
      totalMinutesUsed,
      minuteBalance: u.minuteBalance || 0,
      totalPaid,
      isSuspended: Boolean(u.isSuspended)
    };
  });
}

app.get(['/api/auth/users', '/api/admin/users'], (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  const requester = users[userId];

  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const enriched = getEnrichedUsersList();
  return res.json({ success: true, users: enriched });
});

// 14. Admin Endpoint: Change User Role
app.put(['/api/auth/users/:id/role', '/api/admin/users/:id/role'], (req, res) => {
  const userId = req.headers['x-user-id'];
  const targetId = req.params.id;
  const { role } = req.body;

  const users = readUsers();
  const requester = users[userId];

  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  if (!['Admin', 'Translator', 'Auditor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid user role specified.' });
  }

  const target = users[targetId];
  if (!target) {
    return res.status(404).json({ error: 'Target user account not found.' });
  }

  target.role = role;
  users[targetId] = target;
  writeUsers(users);

  logSystemEvent('info', 'auth', `Admin changed role of ${target.email} to ${role}`);
  const { passwordHash, verificationCode, passwordResetCode, ...safeTarget } = target;
  return res.json({
    success: true,
    message: `User ${target.email} role updated to ${role}.`,
    user: safeTarget
  });
});

// 14b. Admin Endpoint: Credit / Deduct User Minutes
app.post('/api/admin/users/:id/credit', (req, res) => {
  const adminId = req.headers['x-user-id'];
  const users = readUsers();
  const requester = users[adminId];

  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const targetId = req.params.id;
  const target = users[targetId];
  if (!target) {
    return res.status(404).json({ error: 'Target user account not found.' });
  }

  const { minutes, reason } = req.body;
  const creditMins = Number(minutes) || 0;
  if (creditMins === 0) {
    return res.status(400).json({ error: 'Invalid minutes amount specified.' });
  }

  target.minuteBalance = Math.max(0, (target.minuteBalance || 0) + creditMins);
  writeUsers(users);

  recordAdminCreditTransaction(targetId, creditMins, reason || 'Admin balance grant');
  logSystemEvent('info', 'auth', `Admin granted ${creditMins} mins to ${target.email}. New balance: ${target.minuteBalance}`, { targetId, creditMins, reason });

  return res.json({
    success: true,
    message: `Successfully credited ${creditMins} minutes to ${target.email}.`,
    minuteBalance: target.minuteBalance
  });
});

// 14c. Admin Endpoint: Suspend / Unsuspend User Account
app.put('/api/admin/users/:id/suspend', (req, res) => {
  const adminId = req.headers['x-user-id'];
  const users = readUsers();
  const requester = users[adminId];

  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const targetId = req.params.id;
  if (targetId === adminId) {
    return res.status(400).json({ error: 'Cannot suspend your own admin account.' });
  }

  const target = users[targetId];
  if (!target) {
    return res.status(404).json({ error: 'Target user account not found.' });
  }

  const { isSuspended } = req.body;
  target.isSuspended = Boolean(isSuspended);
  writeUsers(users);

  logSystemEvent('warning', 'auth', `Admin ${target.isSuspended ? 'suspended' : 'unsuspended'} account ${target.email}`);
  return res.json({
    success: true,
    message: `Account ${target.email} is now ${target.isSuspended ? 'Suspended' : 'Active'}.`,
    isSuspended: target.isSuspended
  });
});

// 14d. Admin Endpoint: Delete User Account and All Associated Content
app.delete('/api/admin/users/:id', (req, res) => {
  const adminId = req.headers['x-user-id'];
  const users = readUsers();
  const requester = users[adminId];

  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const targetId = req.params.id;
  if (targetId === adminId) {
    return res.status(400).json({ error: 'Cannot delete your own admin account.' });
  }

  const target = users[targetId];
  if (!target) {
    return res.status(404).json({ error: 'Target user account not found.' });
  }

  // 1. Purge user projects from projects.json
  const projects = readProjects();
  let deletedCount = 0;
  for (const [pId, p] of Object.entries(projects)) {
    if (p.ownerId === targetId) {
      delete projects[pId];
      deletedCount++;
    }
  }
  writeProjects(projects);

  // 2. Purge user storage directory
  const userUploadsDir = path.join(UPLOADS_DIR, targetId);
  if (fs.existsSync(userUploadsDir)) {
    try {
      fs.rmSync(userUploadsDir, { recursive: true, force: true });
    } catch (rmErr) {
      console.warn(`[Delete User Purge Warning]: ${rmErr.message}`);
    }
  }

  // 3. Delete user account
  const deletedEmail = target.email;
  delete users[targetId];
  writeUsers(users);

  logSystemEvent('warning', 'auth', `Admin completely deleted user ${deletedEmail} (${targetId}) and purged ${deletedCount} project(s).`);
  return res.json({
    success: true,
    message: `User ${deletedEmail} and all ${deletedCount} associated project(s) & media files have been permanently deleted.`
  });
});

// ====================================================
// SYSTEM SETTINGS ENDPOINTS
// ====================================================
app.get('/api/settings', (req, res) => {
  const settings = readSettings();
  res.json({ success: true, settings });
});

app.get('/api/settings/models', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
    if (!key) throw new Error("GEMINI_API_KEY missing from environment or key pool");
    
    // Use raw REST API fetch to bypass SDK iterator bugs
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error?.message || 'API rejected the request');
    
    const modelNames = data.models
      .filter(m => m.name.includes('gemini') && !m.name.includes('1.5') && !m.name.includes('2.0') && !m.name.includes('2.5'))
      .map(m => m.name.replace('models/', ''));
      
    res.json({ success: true, models: modelNames });
  } catch (err) {
    console.error('[Settings] Fetch models error:', err);
    // Fallback to active known modern models
    const fallbackModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite'
    ];
    res.json({ 
      success: true, 
      models: fallbackModels, 
      warning: 'Fetched from offline fallback list due to API error: ' + err.message 
    });
  }
});

app.put('/api/settings', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  const user = users[userId];
  if (!user || user.role !== 'Admin') {
    return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
  }
  
  const currentSettings = readSettings();
  const newSettings = { ...currentSettings, ...req.body };
  writeSettings(newSettings);
  logSystemEvent('info', 'system', 'Admin updated AI system settings', { newSettings });
  
  res.json({ success: true, message: 'Settings saved successfully', settings: newSettings });
});

// Comprehensive Multi-Model AI Engine Health Check
app.post('/api/settings/health-check', async (req, res) => {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const settings = readSettings();
    const aiKey = process.env.GEMINI_API_KEY || settings.geminiApiKey || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
    if (!aiKey) {
      return res.status(400).json({ success: false, error: 'No Gemini API keys configured.' });
    }

    const ai = new GoogleGenAI({ apiKey: aiKey });
    const modelsToTest = [
      { role: 'Primary ASR/Transcribe', name: settings.geminiModel },
      { role: 'Fallback Model 1', name: settings.fallbackModel1 },
      { role: 'Fallback Model 2', name: settings.fallbackModel2 },
      { role: 'Vision OCR Model', name: settings.visionOcrModel }
    ];

    const results = [];
    for (const m of modelsToTest) {
      if (!m.name) continue;
      const start = Date.now();
      try {
        const resp = await ai.models.generateContent({
          model: m.name,
          contents: 'Translate the word "Hello" to Arabic. Output 1 word only.',
          config: { maxOutputTokens: 20 }
        });
        results.push({
          role: m.role,
          model: m.name,
          status: 'healthy',
          latencyMs: Date.now() - start,
          response: resp.text?.trim() || 'OK'
        });
      } catch (err) {
        results.push({
          role: m.role,
          model: m.name,
          status: 'error',
          latencyMs: Date.now() - start,
          error: err.message
        });
      }
    }

    logSystemEvent('info', 'gemini_api', 'Admin executed AI Engine Health Check', { results });
    return res.json({ success: true, results, timestamp: Date.now() });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================
// PROJECT & MEDIA API ENDPOINTS (ROLE-AWARE & USER-SCOPED)
// ====================================================

// 15. Upload Media & Create Project (User-Scoped Storage)
app.post('/api/upload', upload.single('video'), (req, res) => {
  const { projectName, projectType, mediaTitle } = req.body;
  const projectId = req.projectId;
  const userId = req.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const users = readUsers();
  const ownerUser = users[userId] || { firstName: 'Subtie', lastName: 'User', email: 'guest@msoms.ai' };

  const safeFolderName = req.safeFolderName || 'Uncategorized';
  const projectDir = path.join(UPLOADS_DIR, userId, safeFolderName, projectId);
  const videoFilename = req.file.filename;
  
  // Public URL relative to /uploads
  const videoUrl = `/uploads/${userId}/${safeFolderName}/${projectId}/${videoFilename}`;

  const projects = readProjects();

  projects[projectId] = {
    id: projectId,
    ownerId: userId,
    ownerName: `${ownerUser.firstName} ${ownerUser.lastName}`.trim() || ownerUser.email,
    auditorId: '',
    auditorName: '',
    auditStatus: 'Pending',
    projectName: projectName || 'Untitled Project',
    projectType: projectType || 'Clip',
    mediaTitle: mediaTitle || req.file.originalname,
    videoUrl: videoUrl,
    audioUrl: '',
    srtUrl: '',
    subtitles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeProjects(projects);

  console.log(`[Upload Success] Created user-scoped project ${projectId} for user ${userId} under: ${projectDir}`);

  return res.json({
    success: true,
    projectId,
    videoUrl,
    filename: videoFilename,
    size: req.file.size
  });
});

function getProjectTargetDir(project, id) {
  const userId = project?.ownerId || 'usr_guest';
  const { targetDir } = findProjectDirectories(userId, project?.projectName, id, project?.videoUrl);
  return targetDir;
}

async function performAudioRechunk(targetDir, chunkDuration = 120) {
  const audioPath = path.join(targetDir, 'audio.mp3');
  // If audio.mp3 does not exist, try extracting from available video file
  if (!fs.existsSync(audioPath)) {
    const videoFiles = fs.readdirSync(targetDir).filter(f => f.match(/\.(mp4|mkv|webm|avi|mov|flv|ts|wmv|m4v)$/i));
    if (videoFiles.length > 0) {
      const sourceVideo = path.join(targetDir, videoFiles[0]);
      console.log(`[Rechunk] Extracting audio from ${sourceVideo}...`);
      await new Promise((resolve, reject) => {
        ffmpeg(sourceVideo)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate(192)
          .output(audioPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    } else {
      throw new Error('No audio or video file found to re-chunk');
    }
  }

  const chunksDir = path.join(targetDir, 'chunks');
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  } else {
    // Purge old chunks
    const oldFiles = fs.readdirSync(chunksDir);
    for (const f of oldFiles) {
      try { fs.unlinkSync(path.join(chunksDir, f)); } catch (e) {}
    }
  }

  console.log(`[Rechunk] Slicing audio into fresh ${chunkDuration}-second chunks...`);
  await new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .outputOptions(['-y', '-f segment', `-segment_time ${chunkDuration}`, '-reset_timestamps 1'])
      .output(path.join(chunksDir, 'chunk_%03d.mp3'))
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  let chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.mp3')).sort();
  if (chunkFiles.length === 0 && fs.existsSync(audioPath)) {
    fs.copyFileSync(audioPath, path.join(chunksDir, 'chunk_000.mp3'));
    chunkFiles = ['chunk_000.mp3'];
  }

  console.log(`[Rechunk] Successfully re-chunked into ${chunkFiles.length} segments.`);
  return { chunksDir, chunkFiles };
}

// 15b. Re-chunk audio endpoint
app.post('/api/project/:id/rechunk', async (req, res) => {
  try {
    const { id } = req.params;
    const projects = readProjects();
    const project = projects[id];
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const targetDir = getProjectTargetDir(project, id);
    const { chunkFiles } = await performAudioRechunk(targetDir, 120);
    return res.json({ success: true, chunkCount: chunkFiles.length, chunks: chunkFiles });
  } catch (err) {
    console.error('Rechunk error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 16. Process Audio & Transcribe/Translate with Gemini AI Engine
app.post('/api/project/:id/resubtitle', async (req, res) => {
  try {
    const { id } = req.params;
    let { chunkIndices, rechunk } = req.body;

    const projects = readProjects();
    const project = projects[id];
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const targetDir = getProjectTargetDir(project, id);
    const chunksDir = path.join(targetDir, 'chunks');

    let chunkFiles = [];
    if (rechunk || !fs.existsSync(chunksDir)) {
      const result = await performAudioRechunk(targetDir, 120);
      chunkFiles = result.chunkFiles;
    } else {
      chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.mp3')).sort();
      if (chunkFiles.length === 0) {
        const result = await performAudioRechunk(targetDir, 120);
        chunkFiles = result.chunkFiles;
      }
    }

    if (!Array.isArray(chunkIndices) || chunkIndices.length === 0) {
      if (rechunk) {
        chunkIndices = chunkFiles.map((_, i) => i);
      } else {
        return res.status(400).json({ error: 'chunkIndices array is required' });
      }
    }
    
    const settings = readSettings();
    const targetModel = sanitizeGeminiModel(process.env.GEMINI_MODEL || settings.geminiModel || 'gemini-3.8-flash');
    const fallbackModel = sanitizeGeminiModel(settings.fallbackModel1 || 'gemini-flash-latest');
    const secondaryFallbackModel = sanitizeGeminiModel(settings.fallbackModel2 || 'gemini-pro-latest');
    const { GoogleGenAI } = await import('@google/genai');
    const aiKey = process.env.GEMINI_API_KEY || settings.geminiApiKey || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
    const ai = new GoogleGenAI({ apiKey: aiKey });

    let newSubtitles = [];

    // Process only selected chunks
    for (let i of chunkIndices) {
      if (i < 0 || i >= chunkFiles.length) continue;
      
      const chunkPath = path.join(chunksDir, chunkFiles[i]);
      const strategy = settings.apiIngestionStrategy || 'file_api';
      let audioPart = await prepareAudioPartForGemini(ai, chunkPath, strategy);

      const promptStage1 = `You are an expert anime Japanese ASR engine.
Analyze the provided Japanese audio track carefully and TRANSCRIBE EVERY SINGLE SPOKEN DIALOGUE LINE from the very first second to the absolute end of the audio file. Never truncate, never summarize, never stop early. If there is dialogue, you MUST output it.

CRITICAL RULES:
1. COMPLETE COVERAGE: You MUST transcribe every single word up to the final second of the audio file.
2. MAXIMUM DURATION: A single subtitle must NOT exceed 5 seconds of screen time.
5. ZERO-BASED TIMESTAMPS: This audio is an isolated chunk. You MUST start your timestamps from 00:00:00,000. Do NOT use timestamps from the original video.
3. SPLIT LONG SPEECHES into separate consecutive objects.
4. PRECISE TIMING: Timings must match the actual audio exactly.

For each subtitle block, provide:
1. "startTime": Timestamp formatted as HH:MM:SS,mmm
2. "endTime": Timestamp formatted as HH:MM:SS,mmm
3. "japaneseText": Exact Japanese transcript (Kanji/Kana)

Return ONLY a valid JSON array of objects with keys: "id" (1, 2, 3...), "startTime", "endTime", "japaneseText".
Output raw JSON array only, without markdown formatting. Ensure the JSON array is closed properly at the very end.`;

      const stage1Config = {
        contents: [
          { role: 'user', parts: [audioPart, { text: promptStage1 }] }
        ],
        config: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
      };

      let response1;
      try {
        response1 = await ai.models.generateContent({ model: targetModel, ...stage1Config });
      } catch (err) {
        console.warn(`[Gemini AI Resubtitle] Stage 1 failed with ${targetModel}: ${err.message}. Trying ${fallbackModel}...`);
        notifyAdminModelDeprecation(targetModel, fallbackModel, err.message);

        // Retry with inline Base64 if fileData had a MIME or connection issue
        if (audioPart.fileData && (err.message.includes('MIME') || err.message.includes('File') || err.message.includes('fileUri'))) {
          try {
            console.warn(`🔄 [Gemini AI Resubtitle] Retrying with inline Base64 audio payload...`);
            const b64 = fs.readFileSync(chunkPath).toString('base64');
            audioPart = { inlineData: { data: b64, mimeType: 'audio/mp3' } };
            stage1Config.contents[0].parts[0] = audioPart;
            response1 = await ai.models.generateContent({ model: targetModel, ...stage1Config });
          } catch (inlineErr) {
            console.warn(`[Gemini AI Resubtitle] Inline retry failed: ${inlineErr.message}. Trying ${fallbackModel}...`);
          }
        }

        if (!response1) {
          try {
            response1 = await ai.models.generateContent({ model: fallbackModel, ...stage1Config });
          } catch (err2) {
            console.warn(`[Gemini AI Resubtitle] Fallback 1 failed: ${err2.message}. Trying ${secondaryFallbackModel}...`);
            response1 = await ai.models.generateContent({ model: secondaryFallbackModel, ...stage1Config });
          }
        }
      }

      let rawText1 = (response1.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      let jpSubtitles = [];
      try {
        jpSubtitles = JSON.parse(rawText1);
      } catch (parseErr) {
        try {
          const lastValidIndex = rawText1.lastIndexOf('}');
          if (lastValidIndex !== -1) {
            jpSubtitles = JSON.parse(rawText1.substring(0, lastValidIndex + 1) + ']');
          }
        } catch (e) {
          continue;
        }
      }

      if (jpSubtitles.length === 0) continue;

      const chunkOffset = i * 120; // 120 seconds per chunk
      const maxSec = Math.max(...jpSubtitles.map(s => parseTimestampToSeconds(s.endTime || '00:00:00,000')));
      let appliedOffset = chunkOffset;
      if (maxSec > 150) {
        console.warn(`[Gemini AI] Detected global timestamps in chunk ${i+1} (max ${maxSec}s > 150s). Skipping chunk offset addition.`);
        appliedOffset = 0;
      }
      
      jpSubtitles.forEach(sub => {
        let sTime = parseTimestampToSeconds(sub.startTime) + appliedOffset;
        let eTime = parseTimestampToSeconds(sub.endTime) + appliedOffset;
        sub.startTime = formatSecondsToTimestamp(sTime);
        sub.endTime = formatSecondsToTimestamp(eTime);
        sub.startSeconds = sTime;
        sub.endSeconds = eTime;
      });

      const promptStage2 = `You are a professional anime subtitle translator. 
Translate the provided Japanese subtitles into natural English and high-quality Arabic.

CRITICAL RULES:
1. Maintain the exact same JSON structure, array length, and timestamps.
2. For each object, add "englishText" (natural English for fansubbing) and "arabicText" (high quality, fluent Arabic translation - فصحى احترافية).
3. Do NOT merge or delete any objects. Keep the exact same "id", "startTime", "endTime", and "japaneseText".
4. COMPLETE COVERAGE: You MUST translate every single object in the array up to the very last one. Do not stop early, do not truncate.

Input JSON:
${JSON.stringify(jpSubtitles, null, 2)}`;

      const stage2Config = {
        contents: [{ role: 'user', parts: [{ text: promptStage2 }] }],
        config: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
      };

      let response2;
      try {
        response2 = await ai.models.generateContent({ model: targetModel, ...stage2Config });
      } catch (err) {
        console.warn(`[Gemini AI Resubtitle] Stage 2 failed with ${targetModel}: ${err.message}. Trying ${fallbackModel}...`);
        try {
          response2 = await ai.models.generateContent({ model: fallbackModel, ...stage2Config });
        } catch (err2) {
          console.warn(`[Gemini AI Resubtitle] Fallback 2 failed: ${err2.message}. Trying ${secondaryFallbackModel}...`);
          response2 = await ai.models.generateContent({ model: secondaryFallbackModel, ...stage2Config });
        }
      }

      let rawText2 = (response2.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      let finalChunkSubtitles = [];
      try {
        finalChunkSubtitles = JSON.parse(rawText2);
      } catch (parseErr) {
        try {
          const lastValidIndex = rawText2.lastIndexOf('}');
          if (lastValidIndex !== -1) {
            finalChunkSubtitles = JSON.parse(rawText2.substring(0, lastValidIndex + 1) + ']');
          }
        } catch (e) {
          finalChunkSubtitles = jpSubtitles;
        }
      }

      finalChunkSubtitles.forEach(sub => {
        if (!sub.startSeconds) {
          sub.startSeconds = parseTimestampToSeconds(sub.startTime);
          sub.endSeconds = parseTimestampToSeconds(sub.endTime);
        }
        newSubtitles.push(sub);
      });
    }

    // Now merge newSubtitles into project.subtitles
    // Remove old subtitles in the time ranges of the selected chunks
    let finalSubs = project.subtitles.filter(sub => {
      const subChunkIndex = Math.floor((sub.startSeconds || parseTimestampToSeconds(sub.startTime)) / 120);
      return !chunkIndices.includes(subChunkIndex);
    });

    finalSubs = finalSubs.concat(newSubtitles);
    finalSubs.sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));

    finalSubs.forEach((sub, idx) => {
      sub.id = idx + 1;
    });

    project.subtitles = finalSubs;
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);

    return res.json({ success: true, project });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Track currently active processing jobs to prevent concurrent duplicate jobs
const activeProcessingSet = new Set();

async function executeVideoProcessing(projectId, videoDurationSecs, optionalRes = null) {
  if (!projectId || typeof projectId !== 'string' || projectId === '[object Object]') {
    if (optionalRes) return optionalRes.status(400).json({ error: 'Valid projectId string is required' });
    throw new Error('Valid projectId string is required');
  }

  // Prevent duplicate concurrent runs for the exact same project
  if (activeProcessingSet.has(projectId)) {
    console.log(`⏳ [Process] Project ${projectId} is already processing in background.`);
    const curProject = readProjects()[projectId];
    if (optionalRes) {
      return optionalRes.json({ success: true, message: 'Processing already in progress', projectId, project: curProject });
    }
    return { success: true, message: 'Processing already in progress', project: curProject };
  }

  activeProcessingSet.add(projectId);

  try {
    const projects = readProjects();
    const project = projects[projectId];

    if (!project) {
      if (optionalRes) return optionalRes.status(404).json({ error: 'Project not found' });
      throw new Error('Project not found');
    }

    // If already fully transcribed, return existing project data immediately
    if (project.processingProgress === 100 && Array.isArray(project.subtitles) && project.subtitles.length > 0) {
      console.log(`⚡ [Process] Project ${projectId} already completed. Returning existing subtitles.`);
      const cachedPayload = {
        success: true,
        projectId,
        audioUrl: project.audioUrl,
        srtUrl: project.srtUrl,
        subtitles: project.subtitles,
        visualSigns: project.visualSigns || [],
        characters: project.characters || [],
        project
      };
      if (optionalRes) return optionalRes.json(cachedPayload);
      return cachedPayload;
    }

    const userId = project.ownerId || 'usr_guest';
    const { targetDir, urlPrefix, safeFolderName, videoFiles } = findProjectDirectories(userId, project.projectName, projectId, project.videoUrl);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Search for video file (video.* or any standard video container in targetDir)
    let foundVideoFile = videoFiles.length > 0 ? videoFiles[0] : null;
    if (!foundVideoFile && fs.existsSync(targetDir)) {
      const allFiles = fs.readdirSync(targetDir);
      foundVideoFile = allFiles.find(f => /\.(mp4|mkv|avi|mov|webm|flv|ts|wmv|m4v)$/i.test(f) || f.startsWith('video.'));
    }

    // Fallback: If still not found, check if project.videoUrl is remote HTTP (e.g. Cloudflare R2 / CDN)
    if (!foundVideoFile && project.videoUrl && project.videoUrl.startsWith('http')) {
      try {
        console.log(`☁️ [Process] Local video missing on disk, downloading from cloud: ${project.videoUrl}`);
        const downloadTarget = path.join(targetDir, 'video.mp4');
        const dlRes = await fetch(project.videoUrl);
        if (dlRes.ok) {
          const buf = await dlRes.arrayBuffer();
          fs.writeFileSync(downloadTarget, Buffer.from(buf));
          foundVideoFile = 'video.mp4';
          console.log(`✅ [Process] Downloaded video from cloud: ${downloadTarget}`);
        }
      } catch (dlErr) {
        console.warn('⚠️ [Process] Cloud video download warning:', dlErr.message);
      }
    }

    if (!foundVideoFile) {
      const errMsg = `Video file not found for project ${projectId} in ${targetDir}`;
      if (optionalRes) return optionalRes.status(404).json({ error: errMsg });
      throw new Error(errMsg);
    }

    let videoPath = path.join(targetDir, foundVideoFile);
    const audioPath = path.join(targetDir, 'audio.mp3');
    const srtPath = path.join(targetDir, 'subtitle.srt');

    // Auto-remux MKV or non-MP4 formats to web-friendly MP4 for smooth browser playback
    if (path.extname(foundVideoFile).toLowerCase() !== '.mp4') {
      try {
        console.log(`🎬 [Process] Ensuring web-compatible MP4 for "${foundVideoFile}"...`);
        const webRes = await ensureWebCompatibleVideo(videoPath, targetDir);
        if (webRes && webRes.converted) {
          videoPath = webRes.mp4Path;
          project.videoUrl = `${urlPrefix}/${webRes.fileName}`;
          console.log(`✅ [Process] Project video converted to web MP4: ${project.videoUrl}`);
        }
      } catch (convErr) {
        console.warn('⚠️ [Process] Web conversion warning:', convErr.message);
      }
    }

    // Probe duration from video file if not passed from client
    let finalDurationSecs = Number(videoDurationSecs) || 0;
    if (finalDurationSecs <= 0) {
      finalDurationSecs = await probeVideoDuration(videoPath);
      console.log(`⏱️ [Video Probe] Detected video duration: ${finalDurationSecs}s (${(finalDurationSecs / 60).toFixed(1)} mins)`);
    }

    logSystemEvent('info', 'video_proc', `Started AI pipeline for "${project.projectName}" (${projectId})`, {
      projectId,
      projectName: project.projectName,
      ownerId: userId,
      durationSecs: finalDurationSecs
    });

    // --- Step 2: Backend Credit & Security Check ---
    let latestMinuteBalance = undefined;
    if (userId !== 'usr_guest') {
      const users = readUsers();
      const user = users[userId];
      if (user) {
        const videoMinutes = Math.ceil(finalDurationSecs / 60) || 24;
        const isAdmin = user.role === 'Admin';
        
        if (!isAdmin && videoMinutes > 40 && !user.hasPurchased) {
          const errMsg = 'Free tier is limited to episodes and clips (under 40 mins). Please purchase a package to process movies.';
          if (optionalRes) return optionalRes.status(403).json({ error: errMsg });
          throw new Error(errMsg);
        }
        
        if (!isAdmin && user.minuteBalance < videoMinutes) {
          const errMsg = `Insufficient credits. You have ${user.minuteBalance} minutes left, but this video requires ${videoMinutes} minutes.`;
          if (optionalRes) return optionalRes.status(402).json({ error: errMsg });
          throw new Error(errMsg);
        }
        
        // Deduct minutes (skip for admins)
        if (!isAdmin) {
          user.minuteBalance -= videoMinutes;
          writeUsers(users);
          console.log(`[Wallet] Deducted ${videoMinutes} mins from user ${userId}. Remaining: ${user.minuteBalance} mins.`);
        } else {
          console.log(`[Wallet] Admin ${userId} bypassed minute deduction. Video: ${videoMinutes} mins.`);
        }
        latestMinuteBalance = user.minuteBalance;
      }
    }

  const emitAndSaveProgress = (extract, transcode, translate, status, overall, stage = 'processing') => {
    (function() {
      const db = readProjects();
      if (db[projectId]) {
        if (extract !== undefined) db[projectId].progressExtract = extract;
        if (transcode !== undefined) db[projectId].progressTranscode = transcode;
        if (translate !== undefined) db[projectId].progressTranslate = translate;
        if (status !== undefined) db[projectId].processingStatus = status;
        if (overall !== undefined) db[projectId].processingProgress = overall;
        db[projectId].processingStage = stage;
        db[projectId].status = overall === 100 ? 'ready' : 'processing';
        db[projectId].updatedAt = new Date().toISOString();
        writeProjects(db);
      }
    })();
    socketService.emitProgress(projectId, {
      progress: overall,
      status,
      stage,
      progressExtract: extract,
      progressTranscode: transcode,
      progressTranslate: translate,
      minuteBalance: latestMinuteBalance
    });
  };

  // Parallel Cloudflare R2 Archival
  let r2UploadPromise = null;
  if (cloudStorage.isConfigured() && videoFiles.length > 0) {
    const vFile = videoFiles[0];
    const r2Key = `videos/${userId}/${projectId}/${vFile}`;
    console.log(`☁️ [Cloudflare R2] Initiating parallel upload: ${r2Key}...`);
    r2UploadPromise = cloudStorage.uploadFile(videoPath, r2Key, 'video/mp4')
      .then(r2Res => {
        console.log(`☁️ [Cloudflare R2] Successfully uploaded to R2: ${r2Res.publicUrl}`);
        return r2Res;
      })
      .catch(err => {
        console.error(`⚠️ [Cloudflare R2] Upload error:`, err.message);
        return null;
      });
  } else {
    const r2Status = cloudStorage.getStatus();
    console.log(`📁 [StorageService] Cloudflare R2 not active (${r2Status.mode}). Missing credentials: [${(r2Status.missingKeys || []).join(', ')}]`);
  }

  // Step 1: Extract Audio
  emitAndSaveProgress(25, 0, 0, 'Extracting Japanese audio track...', 10, 'audio_extraction');
  await extractAudioTrack(videoPath, audioPath);
  emitAndSaveProgress(100, 0, 0, 'Audio extraction complete.', 25, 'audio_extraction');
    

    project.audioUrl = `${urlPrefix}/audio.mp3`;

    // Step 2: Verify Gemini Pool has at least one key available
    if (geminiPool.getPoolStatus().totalKeys === 0 && !process.env.GEMINI_API_KEY) {
      throw new Error('No Gemini API keys configured. Please add keys in Admin Console or environment variables.');
    }

    // Initialize detailed progress
    (function() {
      const db = readProjects();
      if(db[projectId]) {
        db[projectId].progressExtract = 100;
        db[projectId].progressTranscode = 0;
        db[projectId].progressTranslate = 0;
        writeProjects(db);
      }
    })();

    // Step 3: Chunk Audio for Long Videos (Support up to multi-hour)
    const settings = readSettings();
    const chunkDuration = Number(settings.audioChunkDurationSec) || 120;
    const chunksDir = path.join(targetDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
      try { fs.rmSync(chunksDir, { recursive: true, force: true }); } catch (_) {}
    }
    fs.mkdirSync(chunksDir, { recursive: true });
    
    (function() {
      const db = readProjects();
      if (db[projectId]) {
        db[projectId].processingProgress = 15;
        db[projectId].processingStatus = "Splitting audio into chunks...";
        writeProjects(db);
      }
    })();
    console.log(`[Audio Splitter] Segmenting audio into ${chunkDuration}-second chunks...`);
    await new Promise((resolve, reject) => {
      ffmpeg(audioPath)
        .outputOptions(['-y', '-f segment', `-segment_time ${chunkDuration}`, '-c copy'])
        .output(path.join(chunksDir, 'chunk_%03d.mp3'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    let chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.mp3')).sort();
    if (chunkFiles.length === 0 && fs.existsSync(audioPath)) {
      fs.copyFileSync(audioPath, path.join(chunksDir, 'chunk_000.mp3'));
      chunkFiles = ['chunk_000.mp3'];
    }
    console.log(`[Audio Splitter] Splitted into ${chunkFiles.length} chunks.`);

    logSystemEvent('info', 'video_proc', `Audio extracted & segmented into ${chunkFiles.length} chunk(s) for "${project.projectName}" (${projectId})`, {
      projectId,
      chunksCount: chunkFiles.length,
      durationSecs: finalDurationSecs
    });

    let allParsedSubtitles = [];
    let globalId = 1;

    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkPath = path.join(chunksDir, chunkFiles[i]);

      // Acquire next available key from pool for this chunk (round-robin load balancing)
      let chunkKeyInfo = null;
      try {
        chunkKeyInfo = geminiPool.acquireKey();
      } catch (e) {
        const fallbackKey = process.env.GEMINI_API_KEY || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
        if (fallbackKey) {
          chunkKeyInfo = {
            keyId: 'fallback',
            maskedKey: 'fallback',
            rawKey: fallbackKey,
            client: new GoogleGenAI({ apiKey: fallbackKey })
          };
        } else {
          throw e;
        }
      }

      const ai = chunkKeyInfo.client;
      console.log(`[Gemini AI] Processing chunk ${i + 1}/${chunkFiles.length} using ${chunkKeyInfo.keyId} (${chunkKeyInfo.maskedKey})...`);

      try {
        const strategy = settings.apiIngestionStrategy || 'file_api';
        let audioPart = await prepareAudioPartForGemini(ai, chunkPath, strategy);

        // --- STAGE 1: JAPANESE ASR ---
        
        const aPct = Math.round(((i + 0.5) / chunkFiles.length) * 100);
        const overall1 = Math.round(25 + ((i + 0.5) / chunkFiles.length) * 70);
        emitAndSaveProgress(100, aPct, Math.round((i / chunkFiles.length) * 100), `AI Stage 1: Transcribing Chunk ${i + 1}/${chunkFiles.length} [${chunkKeyInfo.keyId}]`, overall1, 'transcribing');
        console.log(`[Gemini AI] Stage 1 (ASR) for chunk ${i + 1}...`);
        const promptStage1 = `You are an expert anime Japanese ASR engine.
Analyze the provided Japanese audio track carefully and TRANSCRIBE EVERY SINGLE SPOKEN DIALOGUE LINE and AUDIBLE SONG VOCAL from the very first second to the absolute end of the audio file. DO NOT stop early!

CRITICAL RULES:
1. COMPLETE COVERAGE: Transcribe every spoken word and audible song vocal up to the final second. Never truncate, never summarize, never stop early.
2. DUAL-TRACK SIMULTANEOUS AUDIO RULE:
   - When a character speaks while an insert song or background song has audible singing/lyrics:
     You MUST transcribe BOTH events as separate objects! NEVER choose one over the other!
     - Set "track": "dialogue" for the character's speech.
     - Set "track": "song" for song lyrics, and prefix/suffix the Japanese text with musical notes (e.g. '♪ [Lyrics] ♪').
   - Overlapping timestamps between dialogue and song tracks are expected and encouraged.
3. MAXIMUM DURATION: A single subtitle block must NOT exceed 5 seconds of screen time.
4. ZERO-BASED TIMESTAMPS: Start timestamps from 00:00:00,000 for this chunk.
5. SPLIT LONG SPEECHES into separate consecutive objects.
6. PRECISE TIMING: Timings must match the actual audio exactly.

For each subtitle block, provide:
1. "startTime": Timestamp formatted as HH:MM:SS,mmm
2. "endTime": Timestamp formatted as HH:MM:SS,mmm
3. "japaneseText": Exact Japanese transcript (Kanji/Kana)
4. "track": "dialogue" or "song"

Return ONLY a valid JSON array of objects with keys: "id" (1, 2, 3...), "startTime", "endTime", "japaneseText", "track".
Output raw JSON array only, without markdown formatting. Ensure the JSON array is closed properly at the very end.`;

        const targetModel = sanitizeGeminiModel(process.env.GEMINI_MODEL || settings.geminiModel || 'gemini-3.8-flash');
        const fallbackModel = sanitizeGeminiModel(settings.fallbackModel1 || 'gemini-flash-latest');
        const secondaryFallbackModel = sanitizeGeminiModel(settings.fallbackModel2 || 'gemini-pro-latest');
        const stage1Config = {
          contents: [
            { role: 'user', parts: [audioPart, { text: promptStage1 }] }
          ],
          config: { 
            responseMimeType: 'application/json', 
            maxOutputTokens: 8192,
          }
        };
        
        let response1;
        try {
          response1 = await ai.models.generateContent({ model: targetModel, ...stage1Config });
        } catch (err) {
          console.warn(`[Gemini AI] Stage 1 failed with ${targetModel}: ${err.message}.`);
          logSystemEvent('warning', 'gemini_api', `Chunk ${i + 1}/${chunkFiles.length} ASR failed on ${targetModel}: ${err.message}. Switching to fallback.`, {
            projectId,
            chunk: i + 1,
            model: targetModel,
            error: err.message
          });
          notifyAdminModelDeprecation(targetModel, fallbackModel, err.message);

          // Retry with inline Base64 if not already inline
          if (audioPart.fileData || !audioPart.inlineData) {
            try {
              console.warn(`🔄 [Gemini AI] Retrying chunk ${i + 1} with inline Base64 audio payload...`);
              const b64 = fs.readFileSync(chunkPath).toString('base64');
              audioPart = { inlineData: { data: b64, mimeType: 'audio/mp3' } };
              stage1Config.contents[0].parts[0] = audioPart;
              response1 = await ai.models.generateContent({ model: targetModel, ...stage1Config });
            } catch (inlineErr) {
              console.warn(`[Gemini AI] Inline retry failed: ${inlineErr.message}. Trying ${fallbackModel}...`);
            }
          }

          if (!response1) {
            try {
              response1 = await ai.models.generateContent({ model: fallbackModel, ...stage1Config });
            } catch (err2) {
              console.warn(`[Gemini AI] Fallback 1 failed: ${err2.message}. Trying ${secondaryFallbackModel}...`);
              try {
                response1 = await ai.models.generateContent({ model: secondaryFallbackModel, ...stage1Config });
              } catch (err3) {
                console.error(`[Gemini AI] All models failed for chunk ${i + 1}: ${err3.message}`);
                logSystemEvent('error', 'gemini_api', `All Gemini models failed for chunk ${i + 1} of project ${projectId}: ${err3.message}`, {
                  projectId,
                  chunk: i + 1,
                  error: err3.message
                });
              }
            }
          }
        }

        if (!response1 || !response1.text) {
          console.error(`[Gemini AI Error] Stage 1 returned no response for chunk ${i + 1}`);
          logSystemEvent('error', 'gemini_api', `Chunk ${i + 1}/${chunkFiles.length} ASR returned no response text`, {
            projectId,
            chunk: i + 1
          });
          if (chunkKeyInfo.keyId !== 'fallback') geminiPool.releaseKey(chunkKeyInfo.keyId, false);
          continue;
        }

        let rawText1 = (response1.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        let jpSubtitles = [];
        try {
          jpSubtitles = JSON.parse(rawText1);
        } catch (parseErr) {
          try {
            const lastValidIndex = rawText1.lastIndexOf('}');
            if (lastValidIndex !== -1) {
              jpSubtitles = JSON.parse(rawText1.substring(0, lastValidIndex + 1) + ']');
            }
          } catch (e) {
            console.error(`[Gemini JSON Error] Stage 1 failed for chunk ${i + 1}:`, rawText1.slice(0, 200));
            logSystemEvent('warning', 'gemini_api', `JSON parse error in chunk ${i + 1} ASR response`, {
              projectId,
              chunk: i + 1,
              sample: rawText1.slice(0, 300)
            });
            if (chunkKeyInfo.keyId !== 'fallback') geminiPool.releaseKey(chunkKeyInfo.keyId, true);
            continue; // Skip chunk if ASR completely fails
          }
        }

        if (!Array.isArray(jpSubtitles) || jpSubtitles.length === 0) {
          console.log(`[Gemini AI] Chunk ${i + 1}/${chunkFiles.length} produced 0 subtitles (silence or non-speech).`);
          if (chunkKeyInfo.keyId !== 'fallback') geminiPool.releaseKey(chunkKeyInfo.keyId, true);
          continue;
        }

        // --- STAGE 2: TRANSLATION (Text to Text) ---
        
        const tPct = Math.round(((i + 1) / chunkFiles.length) * 100);
        const overall2 = Math.round(25 + ((i + 1) / chunkFiles.length) * 70);
        emitAndSaveProgress(100, tPct, tPct, `AI Stage 2: Translating Chunk ${i + 1}/${chunkFiles.length} [${chunkKeyInfo.keyId}]`, overall2, 'translating');
        console.log(`[Gemini AI] Stage 2 (Translation) for chunk ${i + 1}...`);
        const promptStage2 = `You are an expert anime subtitle translator for MSOMS-Anime.
I am providing you with a JSON array of Japanese subtitles. Your job is to translate each line into English and Arabic.

CRITICAL RULES:
1. Maintain the exact same JSON structure, array length, track, and timestamps.
2. For each object, add "englishText" (natural English for fansubbing) and "arabicText" (high quality, fluent Arabic translation - فصحى احترافية).
3. If "track" is "song" or text contains musical notes (♪), translate the song lyrics poetically and maintain the musical notes.
4. Do NOT merge or delete any objects. Keep the exact same "id", "startTime", "endTime", "japaneseText", and "track".
5. COMPLETE COVERAGE: You MUST translate every single object in the array up to the very last one. Do not stop early, do not truncate.

Input JSON:
${JSON.stringify(jpSubtitles)}

Return ONLY the updated valid JSON array. Output raw JSON array only, without markdown formatting.`;

        const stage2Config = {
          contents: [
            { role: 'user', parts: [{ text: promptStage2 }] }
          ],
          config: { 
            responseMimeType: 'application/json', 
            maxOutputTokens: 8192,

          }
        };

        let response2;
        try {
          response2 = await ai.models.generateContent({ model: targetModel, ...stage2Config });
        } catch (err) {
          console.warn(`[Gemini AI] Stage 2 failed with ${targetModel}: ${err.message}. Trying ${fallbackModel}...`);
          try {
            response2 = await ai.models.generateContent({ model: fallbackModel, ...stage2Config });
          } catch (err2) {
            console.warn(`[Gemini AI] Fallback 2 failed: ${err2.message}. Trying ${secondaryFallbackModel}...`);
            try {
              response2 = await ai.models.generateContent({ model: secondaryFallbackModel, ...stage2Config });
            } catch (err3) {
              console.warn(`[Gemini AI] All models failed for Stage 2 on chunk ${i + 1}: ${err3.message}`);
            }
          }
        }

        // Chunk completed successfully
        let rawText2 = (response2?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        let translatedSubtitles = [];
        try {
          translatedSubtitles = JSON.parse(rawText2);
        } catch (parseErr) {
          try {
            const lastValidIndex = rawText2.lastIndexOf('}');
            if (lastValidIndex !== -1) {
              translatedSubtitles = JSON.parse(rawText2.substring(0, lastValidIndex + 1) + ']');
            }
          } catch (e) {
            console.error(`[Gemini JSON Error] Stage 2 failed for chunk ${i}. Using Japanese only.`);
            translatedSubtitles = jpSubtitles; // Fallback to un-translated
          }
        }

        // Add offset to timestamps
        const offsetSeconds = i * chunkDuration;
        translatedSubtitles.forEach(sub => {
          let sSec = parseTimestampToSeconds(sub.startTime || '00:00:00,000') + offsetSeconds;
          let eSec = parseTimestampToSeconds(sub.endTime || '00:00:02,000') + offsetSeconds;
          
          allParsedSubtitles.push({
            id: globalId++,
            startTime: formatSecondsToTimestamp(sSec),
            endTime: formatSecondsToTimestamp(eSec),
            startSeconds: sSec,
            endSeconds: eSec,
            track: sub.track || 'dialogue',
            japaneseText: sub.japaneseText || '',
            englishText: sub.englishText || '',
            arabicText: sub.arabicText || '',
            approved: false,
            auditNotes: ''
          });
        });

        if (chunkKeyInfo.keyId !== 'fallback') {
          geminiPool.releaseKey(chunkKeyInfo.keyId, true);
        }
      } catch (chunkErr) {
        if (chunkKeyInfo && chunkKeyInfo.keyId !== 'fallback') {
          geminiPool.releaseKey(chunkKeyInfo.keyId, false, chunkErr);
        }
        throw chunkErr;
      }
    }

    // Await R2 upload completion if in progress
    if (r2UploadPromise) {
      try {
        const r2Res = await r2UploadPromise;
        if (r2Res && r2Res.publicUrl) {
          project.videoUrl = r2Res.publicUrl;
          project.r2Key = r2Res.key;
          console.log(`🎬 [Process] Attached Cloudflare R2 videoUrl to project: ${project.videoUrl}`);
        }
      } catch (uploadErr) {
        console.warn('⚠️ [Process] R2 upload wait failed:', uploadErr.message);
      }
    }

    project.subtitles = allParsedSubtitles;

    // CRITICAL VALIDATION: Verify subtitles were actually recognized
    if (!allParsedSubtitles || allParsedSubtitles.length === 0) {
      const errMsg = 'لم يتم التعرف على أي حوارات صوتية في المقطع الصوتي (0 أسطر تم إنشاؤها). قد يكون المسار الصوتي صامتاً، أو به موسيقى فقط، أو حدث خطأ في استجابة الذكاء الاصطناعي.';
      console.error(`⚠️ [Process AI] Project ${projectId} produced 0 subtitles. Marking as failed.`);
      
      logSystemEvent('error', 'video_proc', `AI Voice Recognition returned 0 subtitle lines for project "${project.projectName}" (${projectId}). Marked as failed.`, {
        projectId,
        projectName: project.projectName,
        ownerId: project.ownerId,
        durationSecs: finalDurationSecs,
        chunksProcessed: chunkFiles.length
      });

      project.subtitles = [];
      project.status = 'failed';
      project.processingProgress = 0;
      project.processingStatus = errMsg;
      project.error = 'No subtitles detected from audio track (0 lines generated).';
      project.updatedAt = new Date().toISOString();

      const freshDb = readProjects();
      freshDb[projectId] = { ...(freshDb[projectId] || {}), ...project };
      writeProjects(freshDb);

      socketService.emitProgress(projectId, {
        progress: 0,
        status: errMsg,
        stage: 'process_failed',
        error: errMsg,
        projectId
      });

      const failPayload = {
        success: false,
        error: errMsg,
        projectId,
        project
      };
      if (optionalRes) return optionalRes.status(422).json(failPayload);
      return failPayload;
    }

    // Stage 4: Detect Anime Characters and generate Avatar Thumbnails
    emitAndSaveProgress(100, 100, 100, 'فحص شخصيات الأنمي وبطاقات التعريف والوجوه...', 85, 'characters');
    try {
      const charactersDir = path.join(targetDir, 'characters');
      console.log(`[CharacterService] Extracting character entities & avatars for ${projectId}...`);
      const detectedCharacters = await detectCharactersFromSubtitles(allParsedSubtitles, geminiPool, {
        videoPath,
        charactersDir,
        urlPrefix
      });
      project.characters = detectedCharacters;
      console.log(`[CharacterService] Identified ${detectedCharacters.length} character(s).`);
    } catch (charErr) {
      console.warn('[CharacterService] Character extraction warning:', charErr.message);
      project.characters = [];
    }

    // Stage 5: Detect On-Screen Visual Signs & Titles (Full-Video OCR)
    emitAndSaveProgress(100, 100, 100, 'فحص اللوحات والنصوص والعناوين في الفيديو (Vision OCR)...', 93, 'vision_ocr');
    try {
      const signsDir = path.join(targetDir, 'visual_signs');
      console.log(`[VisionOCR] Extracting on-screen signs, titles & notes for ${projectId}...`);
      const currentSettings = readSettings();
      const detectedSigns = await detectVisualSignsFromVideo(videoPath, geminiPool, {
        signsDir,
        urlPrefix,
        modelName: currentSettings.visionOcrModel || 'gemini-3.8-flash'
      });
      project.visualSigns = detectedSigns;
      console.log(`[VisionOCR] Identified ${detectedSigns.length} on-screen sign(s).`);
    } catch (visErr) {
      console.warn('[VisionOCR] Visual OCR warning:', visErr.message);
      project.visualSigns = [];
    }

    // Write SRT file to project folder
    let srtContent = '';
    allParsedSubtitles.forEach((sub, idx) => {
      srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.arabicText || sub.englishText}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent, 'utf8');
    project.srtUrl = `${urlPrefix}/subtitle.srt`;
    project.updatedAt = new Date().toISOString();
    project.processingProgress = 100;
    project.processingStatus = "Completed";
    project.status = "ready";
    project.isUnread = true;

    // Read fresh DB to avoid overwriting R2 URL or concurrent updates
    const freshDb = readProjects();
    freshDb[projectId] = {
      ...(freshDb[projectId] || {}),
      ...project
    };
    writeProjects(freshDb);
    const finalProject = freshDb[projectId];

    logSystemEvent('info', 'video_proc', `Completed AI processing for "${project.projectName}" (${projectId}): ${allParsedSubtitles.length} subtitle lines generated.`, {
      projectId,
      linesCount: allParsedSubtitles.length,
      charactersCount: (finalProject.characters || []).length
    });

    // Emit final process completion event so wizard transitions immediately!
    emitAndSaveProgress(100, 100, 100, 'اكتملت جميع مراحل المعالجة بنجاح!', 100, 'ready');
    socketService.emitProgress(projectId, {
      stage: 'process_completed',
      progress: 100,
      status: 'Completed',
      projectId
    });

    const resultPayload = {
      success: true,
      projectId,
      audioUrl: finalProject.audioUrl,
      srtUrl: finalProject.srtUrl,
      subtitles: allParsedSubtitles,
      visualSigns: finalProject.visualSigns || [],
      characters: finalProject.characters || [],
      project: finalProject
    };

    if (optionalRes) {
      return optionalRes.json(resultPayload);
    }
    return resultPayload;

  } catch (err) {
    console.error('[Process AI Error]', err);
    logSystemEvent('error', 'video_proc', `AI pipeline failed for "${project?.projectName || projectId}": ${err.message}`, {
      projectId,
      projectName: project?.projectName,
      ownerId: project?.ownerId,
      stage: project?.processingStage || 'processing',
      error: err.message,
      stack: err.stack?.slice(0, 500)
    });
    try {
      const errDb = readProjects();
      if (errDb[projectId]) {
        errDb[projectId].status = 'failed';
        errDb[projectId].processingStatus = `فشل في معالجة الصوت: ${err.message}`;
        errDb[projectId].error = err.message;
        writeProjects(errDb);
      }
      socketService.emitProgress(projectId, {
        progress: 0,
        status: `فشل في معالجة الصوت: ${err.message}`,
        stage: 'process_failed',
        error: err.message
      });
    } catch (_) {}

    if (optionalRes) {
      return optionalRes.status(500).json({
        error: 'AI Transcription Error: ' + err.message
      });
    }
    throw err;
  } finally {
    activeProcessingSet.delete(projectId);
  }
}

app.post('/api/process', async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);
  const { projectId, videoDurationSecs, sync } = req.body;

  if (!projectId || typeof projectId !== 'string' || projectId === '[object Object]') {
    return res.status(400).json({ error: 'Valid projectId string is required' });
  }

  const projects = readProjects();
  const project = projects[projectId];
  if (!project) {
    return res.status(404).json({ error: `Project not found: ${projectId}` });
  }

  // If already completed, return cached result immediately
  if (project.processingProgress === 100 && Array.isArray(project.subtitles) && project.subtitles.length > 0) {
    return res.json({
      success: true,
      projectId,
      audioUrl: project.audioUrl,
      srtUrl: project.srtUrl,
      subtitles: project.subtitles,
      visualSigns: project.visualSigns || [],
      characters: project.characters || [],
      project
    });
  }

  // Pre-validate user minute balance before starting to fail early with 402/403
  const userId = project.ownerId || 'usr_guest';
  if (userId !== 'usr_guest') {
    const users = readUsers();
    const user = users[userId];
    if (user && user.role !== 'Admin') {
      const approxDuration = Number(videoDurationSecs) || project.duration || 60;
      const videoMinutes = Math.ceil(approxDuration / 60);
      if (videoMinutes > 40 && !user.hasPurchased) {
        return res.status(403).json({ error: 'Free tier is limited to episodes and clips (under 40 mins). Please purchase a package to process movies.' });
      }
      if (user.minuteBalance < videoMinutes) {
        return res.status(402).json({ error: `Insufficient credits. You have ${user.minuteBalance} minutes left, but this video requires ${videoMinutes} minutes.` });
      }
    }
  }

  // If already processing in background, return progress state
  if (activeProcessingSet.has(projectId)) {
    return res.json({
      success: true,
      status: 'processing',
      message: 'Processing already in progress',
      projectId,
      project
    });
  }

  const currentUsers = readUsers();
  const currentUserObj = userId ? currentUsers[userId] : null;

  if (sync === true || req.query.sync === 'true') {
    await executeVideoProcessing(projectId, videoDurationSecs, res);
  } else {
    // Asynchronous non-blocking start: Prevents HTTP proxy timeouts and socket dropouts
    res.json({
      success: true,
      status: 'processing',
      projectId,
      minuteBalance: currentUserObj ? currentUserObj.minuteBalance : undefined,
      message: 'AI audio processing pipeline started in background'
    });

    // Run in background safely
    executeVideoProcessing(projectId, videoDurationSecs, null).catch(err => {
      console.error(`[Background Process Error for ${projectId}]:`, err.message);
    });
  }
});

function parseTimestampToSeconds(ts) {
  try {
    const parts = ts.replace('.', ',').split(',');
    const timeParts = parts[0].split(':');
    let hours = 0, minutes = 0, seconds = 0;
    
    if (timeParts.length === 3) {
      hours = parseInt(timeParts[0], 10) || 0;
      minutes = parseInt(timeParts[1], 10) || 0;
      seconds = parseInt(timeParts[2], 10) || 0;
    } else if (timeParts.length === 2) {
      hours = 0;
      minutes = parseInt(timeParts[0], 10) || 0;
      seconds = parseInt(timeParts[1], 10) || 0;
    } else if (timeParts.length === 1) {
      seconds = parseInt(timeParts[0], 10) || 0;
    }
    
    const millis = parseInt(parts[1], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds + millis / 1000;
  } catch (e) {
    return 0;
  }
}

// 17. Get All Projects (Role-Filtered)

// 16. Test Model Endpoint
app.post('/api/settings/test-model', async (req, res) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ success: false, error: 'Model name is required.' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const settings = readSettings();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || settings.geminiApiKey });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Translate the word "Arigato" into Arabic. Output only the Arabic word without any extra text.',
      config: { maxOutputTokens: 100 }
    });

    
    console.log('[Test Model] raw response:', JSON.stringify(response, null, 2));
    let text = response.text || '';
    if (!text && response.candidates && response.candidates.length > 0) {
      text = response.candidates[0].content?.parts?.[0]?.text || '';
    }
    return res.json({ success: true, text: text || 'Empty response from model' });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 15b. Fetch Global Dashboard Stats
app.get('/api/dashboard-stats', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const projects = readProjects();
  let totalClips = 0;
  let totalEpisodes = 0;
  let totalMovies = 0;
  let totalTrailers = 0;
  let totalLines = 0;
  const uniqueFolders = new Set();

  Object.values(projects).forEach(p => {
    uniqueFolders.add(p.projectName || 'Uncategorized');
    const t = String(p.projectType || '').toLowerCase();
    if (t.includes('clip') || t.includes('مقطع')) totalClips++;
    else if (t.includes('movie') || t.includes('فيلم')) totalMovies++;
    else if (t.includes('trailer') || t.includes('تريلر') || t.includes('عرض')) totalTrailers++;
    else totalEpisodes++;

    if (Array.isArray(p.subtitles)) {
      totalLines += p.subtitles.length;
    }
  });

  res.json({
    success: true,
    stats: {
      totalProjects: uniqueFolders.size,
      totalClips,
      totalEpisodes,
      totalMovies,
      totalTrailers,
      totalLines
    }
  });
});

app.get('/api/projects', (req, res) => {
  const userId = req.headers['x-user-id'];
  const projects = readProjects();
  const users = readUsers();
  const user = users[userId];

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projectList = Object.values(projects);

  if (user.role === 'Admin') {
    return res.json(projectList);
  }

  if (user.role === 'Auditor') {
    const assigned = projectList.filter(p => p.auditorId === userId || p.ownerId === userId);
    return res.json(assigned);
  }

  const translatorProjects = projectList.filter(p => p.ownerId === userId || p.auditorId === userId);
  return res.json(translatorProjects);
});

// 18. Get Single Project Details
app.get('/api/project/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  const projects = readProjects();
  const users = readUsers();
  const user = users[userId];
  const project = projects[id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'Admin' && project.ownerId !== userId && project.auditorId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Ensure web-playable MP4 if video is MKV
  if (project.videoUrl && /\.mkv$/i.test(project.videoUrl)) {
    const ownerId = project.ownerId || 'usr_guest';
    const { targetDir, urlPrefix } = findProjectDirectories(ownerId, project.projectName, id, project.videoUrl);
    const mkvPath = path.join(targetDir, 'video.mkv');
    const mp4Path = path.join(targetDir, 'video.mp4');

    if (fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 1024 * 1024) {
      project.videoUrl = `${urlPrefix}/video.mp4`;
      projects[id].videoUrl = project.videoUrl;
      writeProjects(projects);
    } else if (fs.existsSync(mkvPath)) {
      ensureWebCompatibleVideo(mkvPath, targetDir).then(webRes => {
        if (webRes && webRes.converted) {
          const fresh = readProjects();
          if (fresh[id]) {
            fresh[id].videoUrl = `${urlPrefix}/video.mp4`;
            writeProjects(fresh);
          }
        }
      }).catch(e => console.warn('Background remux error:', e.message));
    }
  }

  return res.json(project);
});

// 19. Save Live Subtitle Edits (With optional Audit Status & Notes)
app.get('/api/project/:id/progress', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const projectId = req.params.id;
  if (!projectId || projectId === '[object Object]') {
    return res.status(400).json({ progress: 0, status: 'Invalid Project ID', error: 'Invalid Project ID', isProcessing: false });
  }
  const projects = readProjects();
  const project = projects[projectId];
  if (!project) {
    return res.status(404).json({ progress: 0, status: 'Project not found in database', error: 'Project not found in database', isProcessing: false });
  }
  const isProc = activeProcessingSet.has(projectId) || project.status === 'processing';

  const userId = req.headers['x-user-id'] || project.ownerId;
  const users = readUsers();
  const reqUser = userId ? users[userId] : null;

  return res.json({ 
    progress: project.processingProgress || 0, 
    status: project.processingStatus || '',
    stage: project.processingStage || '',
    error: project.error || null,
    isProcessing: isProc,
    progressExtract: project.progressExtract || 0,
    progressTranscode: project.progressTranscode || 0,
    progressTranslate: project.progressTranslate || 0,
    minuteBalance: reqUser ? reqUser.minuteBalance : undefined
  });
});

app.post('/api/project/:id/save', (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  const { subtitles, auditStatus, characters } = req.body;
  const projects = readProjects();
  const users = readUsers();
  const user = users[userId];
  const project = projects[id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'Admin' && project.ownerId !== userId && project.auditorId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (Array.isArray(subtitles)) {
    project.subtitles = subtitles;
  }

  if (Array.isArray(characters)) {
    project.characters = characters;
  }

  if (auditStatus) {
    project.auditStatus = auditStatus;
  }

  project.updatedAt = new Date().toISOString();
  writeProjects(projects);

  return res.json({ success: true, project });
});

// Character Named Entity Management Endpoints
app.post('/api/project/:id/characters/detect', async (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const project = projects[id];
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const userId = project.ownerId || 'usr_guest';
  const { targetDir, urlPrefix, safeFolderName, videoFiles } = findProjectDirectories(userId, project.projectName, id, project.videoUrl);
  const charactersDir = path.join(targetDir, 'characters');
  const videoPath = videoFiles.length > 0 ? path.join(targetDir, videoFiles[0]) : null;

  try {
    const characters = await detectCharactersFromSubtitles(project.subtitles || [], geminiPool, {
      videoPath,
      charactersDir,
      urlPrefix
    });
    project.characters = characters;
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);
    return res.json({ success: true, characters });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/project/:id/characters/replace', (req, res) => {
  const { id } = req.params;
  const { characterId, oldNames, newNames } = req.body;
  const projects = readProjects();
  const project = projects[id];
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { updatedSubtitles, updatedCount } = replaceCharacterNamesInSubtitles(project.subtitles || [], oldNames, newNames);
  project.subtitles = updatedSubtitles;

  if (Array.isArray(project.characters)) {
    project.characters = project.characters.map(c => {
      if (c.id === characterId) {
        return {
          ...c,
          japaneseName: (newNames.japanese || newNames.japaneseName || c.japaneseName).trim(),
          englishName: (newNames.english || newNames.englishName || c.englishName).trim(),
          arabicName: (newNames.arabic || newNames.arabicName || c.arabicName).trim(),
        };
      }
      return c;
    });
  }

  // Update SRT file on disk
  const userId = project.ownerId || 'usr_guest';
  const safeFolderName = project.projectName ? project.projectName.replace(/[\/\\?%*:|\"<>]/g, '_').trim() : 'Uncategorized';
  const targetDir = path.join(UPLOADS_DIR, userId, safeFolderName, id);
  const srtPath = path.join(targetDir, 'subtitle.srt');
  if (fs.existsSync(targetDir)) {
    let srtContent = '';
    project.subtitles.forEach((sub, idx) => {
      srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.arabicText || sub.englishText}\n\n`;
    });
    try {
      fs.writeFileSync(srtPath, srtContent, 'utf8');
    } catch (e) {}
  }

  project.updatedAt = new Date().toISOString();
  writeProjects(projects);

  return res.json({
    success: true,
    updatedCount,
    characters: project.characters,
    subtitles: project.subtitles,
    project
  });
});

// ====================================================
// VISUAL OCR & ON-SCREEN SIGNS ENDPOINTS
// ====================================================

app.post('/api/project/:id/visual-signs/detect', async (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const project = projects[id];
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const userId = project.ownerId || 'usr_guest';
  const { targetDir, urlPrefix, safeFolderName, videoFiles } = findProjectDirectories(userId, project.projectName, id, project.videoUrl);
  const signsDir = path.join(targetDir, 'visual_signs');
  let videoPath = videoFiles.length > 0 ? path.join(targetDir, videoFiles[0]) : null;

  // Cloudflare R2 / CDN Fallback: If local video was purged, re-fetch it to targetDir
  if (!videoPath && project.videoUrl && project.videoUrl.startsWith('http')) {
    try {
      console.log(`☁️ [VisionOCR] Local video missing on disk, retrieving from Cloud storage: ${project.videoUrl}`);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      const downloadTarget = path.join(targetDir, 'video.mp4');
      const dlRes = await fetch(project.videoUrl);
      if (dlRes.ok) {
        const buf = await dlRes.arrayBuffer();
        fs.writeFileSync(downloadTarget, Buffer.from(buf));
        videoPath = downloadTarget;
        console.log(`✅ [VisionOCR] Retrieved video from Cloud storage: ${downloadTarget} (${(buf.byteLength / (1024*1024)).toFixed(1)} MB)`);
      }
    } catch (dlErr) {
      console.warn(`⚠️ [VisionOCR] Could not fetch video from Cloud storage:`, dlErr.message);
    }
  }

  if (!videoPath) {
    return res.status(404).json({ error: 'Video file not found on server to perform Visual OCR' });
  }

  try {
    const currentSettings = readSettings();
    const detectedSigns = await detectVisualSignsFromVideo(videoPath, geminiPool, {
      signsDir,
      urlPrefix,
      modelName: currentSettings.visionOcrModel || 'gemini-3.8-flash'
    });
    project.visualSigns = detectedSigns;
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);
    return res.json({ success: true, visualSigns: detectedSigns });
  } catch (err) {
    console.error('[VisionOCR Endpoint Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/project/:id/visual-signs', (req, res) => {
  const { id } = req.params;
  const { visualSigns } = req.body;
  const projects = readProjects();
  const project = projects[id];
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (Array.isArray(visualSigns)) {
    project.visualSigns = visualSigns;
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);
  }
  return res.json({ success: true, visualSigns: project.visualSigns });
});

app.post('/api/project/:id/visual-signs/add-to-subtitles', (req, res) => {
  const { id } = req.params;
  const { sign } = req.body;
  const projects = readProjects();
  const project = projects[id];
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!sign) return res.status(400).json({ error: 'Sign data is required' });

  if (!Array.isArray(project.subtitles)) project.subtitles = [];

  const newSub = {
    id: project.subtitles.length + 1,
    startTime: sign.startTime,
    endTime: sign.endTime,
    startSeconds: sign.startSeconds,
    endSeconds: sign.endSeconds,
    track: 'sign',
    category: sign.category || 'sign',
    japaneseText: sign.japaneseText || '',
    englishText: sign.englishText || '',
    arabicText: (sign.arabicText || sign.englishText || '').trim(),
    assPosition: sign.assPosition || '\\an8',
    approved: true,
    auditNotes: `On-screen sign: ${sign.category || 'sign'}`
  };

  project.subtitles.push(newSub);
  project.subtitles.sort((a, b) => (a.startSeconds || 0) - (b.startSeconds || 0));
  project.subtitles.forEach((s, idx) => { s.id = idx + 1; });

  if (Array.isArray(project.visualSigns)) {
    project.visualSigns = project.visualSigns.map(s => s.id === sign.id ? { ...s, addedToSubtitles: true } : s);
  }

  // Update SRT on disk
  const userId = project.ownerId || 'usr_guest';
  const safeFolderName = project.projectName ? project.projectName.replace(/[/\\?%*:|"<>]/g, '_').trim() : 'Uncategorized';
  const targetDir = path.join(UPLOADS_DIR, userId, safeFolderName, id);
  const srtPath = path.join(targetDir, 'subtitle.srt');
  if (fs.existsSync(targetDir)) {
    let srtContent = '';
    project.subtitles.forEach((sub, idx) => {
      srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.arabicText || sub.englishText}\n\n`;
    });
    try { fs.writeFileSync(srtPath, srtContent, 'utf8'); } catch (e) {}
  }

  project.updatedAt = new Date().toISOString();
  writeProjects(projects);

  return res.json({
    success: true,
    subtitles: project.subtitles,
    visualSigns: project.visualSigns
  });
});

// ====================================================
// AI FOLDER COVER ART ENDPOINTS
// ====================================================

app.get('/api/folders/covers', (req, res) => {
  const covers = getAllFolderCovers();
  return res.json({ success: true, covers });
});

app.post('/api/folders/generate-cover', async (req, res) => {
  try {
    const { folderName, force } = req.body;
    if (!folderName) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    const result = await generateFolderCover(folderName, geminiPool, { force: !!force });
    return res.json(result);
  } catch (err) {
    console.error('[FolderCover Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================
// TORRENT & MAGNET LINK INGESTION ENDPOINTS
// ====================================================

app.post('/api/torrent/ingest', torrentUpload.single('torrentFile'), async (req, res) => {
  try {
    const { projectName, projectType, mediaTitle, magnetLink } = req.body;
    const userId = req.headers['x-user-id'] || req.body?.userId || 'usr_guest';
    const users = readUsers();
    const ownerUser = users[userId] || { firstName: 'Subtie', lastName: 'User', email: 'guest@msoms.ai' };

    const projectId = 'subtie_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const safeFolderName = (projectName || 'Uncategorized').replace(/[/\\?%*:|"<>]/g, '_').trim();

    const torrentSource = req.file ? req.file.path : (magnetLink || '').trim();
    if (!torrentSource) {
      return res.status(400).json({ error: 'Please provide either a .torrent file or a valid magnet link.' });
    }

    const projects = readProjects();
    projects[projectId] = {
      id: projectId,
      ownerId: userId,
      ownerName: `${ownerUser.firstName} ${ownerUser.lastName}`.trim() || ownerUser.email,
      auditorId: '',
      auditorName: '',
      auditStatus: 'Pending',
      projectName: projectName || 'Torrent Project',
      projectType: projectType || 'Episode',
      mediaTitle: mediaTitle || (req.file ? req.file.originalname : 'Torrent Media'),
      uploadDate: new Date().toISOString(),
      videoUrl: '',
      audioUrl: '',
      srtUrl: '',
      subtitles: [],
      characters: [],
      visualSigns: [],
      sourceType: req.file ? 'torrent_file' : 'magnet',
      status: 'downloading_torrent',
      processingStatus: 'Connecting to swarm and verifying video contents...',
      processingProgress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeProjects(projects);

    // Start background torrent ingestion
    torrentService.ingestTorrent({
      projectId,
      userId,
      torrentSource,
      projectMeta: { projectName, projectType, mediaTitle, safeFolderName },
      onSuccess: async ({ videoPath, videoFileName, originalName, fileSize }) => {
        console.log(`🎬 [Torrent Ingest Success] Downloaded: ${originalName} (${(fileSize / (1024*1024)).toFixed(1)} MB)`);
        const db = readProjects();
        if (db[projectId]) {
          db[projectId].videoUrl = `/uploads/${userId}/${safeFolderName}/${projectId}/${videoFileName}`;
          db[projectId].status = 'processing';
          db[projectId].processingStatus = 'Torrent downloaded. Starting Japanese audio and visual OCR analysis...';
          writeProjects(db);
        }

        // Auto trigger full processing pipeline
        try {
          await executeVideoProcessing(projectId, 0, null);
        } catch (procErr) {
          console.error(`⚠️ [Torrent Auto-Process Error] ${projectId}:`, procErr.message);
        }
      },
      onFail: async (err, reasonCode) => {
        console.error(`❌ [Torrent Ingest Fail] ${projectId}: ${err.message} (${reasonCode})`);
        const db = readProjects();
        if (db[projectId]) {
          db[projectId].status = 'failed';
          db[projectId].processingStatus = `فشل تحميل التورنت: ${err.message}`;
          db[projectId].torrentError = err.message;
          db[projectId].torrentReason = reasonCode;
          writeProjects(db);
        }

        // Send email notification if stalled with 0 seeds for 30 mins
        if (reasonCode === 'failed_no_seeds') {
          const user = users[userId];
          if (user && user.email) {
            const emailSubject = 'منصة Subtie — تعذر إكمال تحميل ملف التورنت';
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #7c3aed; background-color: #0f172a; color: #ffffff;">
                <h2 style="color: #c084fc;">منصة Subtie — تنبيه التورنت</h2>
                <p>مرحباً ${user.firstName || 'المترجم'}،</p>
                <p>نود إعلامك بتعذر إكمال تحميل ملف التورنت للمشروع <strong>${mediaTitle || 'حلقة أنمي'}</strong> نظراً لعدم توفر متصلين (Seeds) لأكثر من 30 دقيقة متواصلة.</p>
                <p style="color: #f43f5e;">تم إيقاف المهمة وتنظيف المساحة التخزينية على السيرفر تلقائياً.</p>
              </div>
            `;
            sendMailNotification(user.email, emailSubject, emailHtml);
          }
        }
      }
    });

    return res.json({
      success: true,
      projectId,
      status: 'downloading_torrent',
      message: 'Torrent ingestion started in background.'
    });
  } catch (err) {
    console.error('[Torrent Ingest Error]', err);
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/torrent/:id/status', (req, res) => {
  let status = torrentService.getJobStatus(req.params.id);
  const projects = readProjects();
  const p = projects[req.params.id];

  // Resilient DB fallback: if project already has a video or has moved beyond download, ensure status is completed/processing
  const isProjectReadyOrProcessing = p && (
    p.videoUrl ||
    p.status === 'ready' ||
    p.status === 'Completed' ||
    p.status === 'processing' ||
    (p.status !== 'downloading_torrent' && p.status !== 'failed')
  );

  if (isProjectReadyOrProcessing) {
    const sizeMb = p.videoSize ? (p.videoSize / (1024 * 1024)).toFixed(1) : (status?.totalMb || '...');
    status = {
      projectId: req.params.id,
      status: (p.status === 'ready' || p.status === 'Completed') ? 'ready' : 'processing',
      progress: 100,
      downloadedMb: sizeMb,
      totalMb: sizeMb,
      downloadSpeed: '0.00',
      eta: '0m 0s',
      videoUrl: p.videoUrl,
      message: p.processingStatus || 'اكتمل تحميل ملف الفيديو بنجاح وبدأت المعالجة.',
      projectName: p.projectName || '',
      mediaTitle: p.mediaTitle || '',
      projectType: p.projectType || 'episode'
    };
  } else if (!status && p) {
    status = {
      projectId: req.params.id,
      status: p.status === 'downloading_torrent' ? 'downloading' : (p.status || 'processing'),
      progress: (p.videoUrl || p.status === 'ready' || p.status === 'Completed') ? 100 : (p.processingProgress || 0),
      message: p.processingStatus || '',
      projectName: p.projectName || '',
      mediaTitle: p.mediaTitle || '',
      projectType: p.projectType || 'episode'
    };
  }
  res.json({ success: true, status });
});

app.post('/api/torrent/:id/cancel', (req, res) => {
  const userId = req.headers['x-user-id'];
  const projects = readProjects();
  const p = projects[req.params.id];
  const users = readUsers();
  const user = users[userId];

  // Security check: only owner or admin can cancel
  if (p && user && user.role !== 'Admin' && p.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this project.' });
  }

  const cancelled = torrentService.cancelJob(req.params.id);
  if (projects[req.params.id]) {
    projects[req.params.id].status = 'cancelled';
    projects[req.params.id].processingStatus = 'Torrent cancelled by user';
    writeProjects(projects);
  }
  res.json({ success: true, cancelled });
});

// Unified Activities & Ongoing Tasks Monitor API
app.get('/api/activities', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  const user = users[userId];

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projects = readProjects();
  const torrentJobs = torrentService.getAllActiveJobs();
  const activities = [];
  const handledProjectIds = new Set();

  // 1. Ingest active/recent torrent jobs
  for (const tJob of torrentJobs) {
    // Permission check
    if (user.role !== 'Admin' && tJob.userId && tJob.userId !== userId) {
      continue;
    }

    handledProjectIds.add(tJob.projectId);
    const proj = projects[tJob.projectId] || {};
    
    // Determine if the torrent is downloading or has handed off to processing
    const isProcessingInDb = proj.status === 'processing' || activeProcessingSet.has(tJob.projectId);
    const effectiveStatus = isProcessingInDb ? 'processing' : (tJob.status === 'completed' ? 'ready' : 'downloading');
    const effectiveProgress = isProcessingInDb ? (proj.processingProgress || 10) : tJob.progress;

    activities.push({
      id: tJob.projectId,
      projectId: tJob.projectId,
      projectName: proj.projectName || tJob.projectName || 'Uncategorized',
      mediaTitle: proj.mediaTitle || tJob.mediaTitle || tJob.videoFileName || 'Video File',
      projectType: proj.projectType || tJob.projectType || 'episode',
      type: 'torrent',
      status: effectiveStatus,
      stage: isProcessingInDb ? (proj.processingStage || 'transcribing') : 'downloading',
      stageDescription: isProcessingInDb ? (proj.processingStatus || 'معالجة الذكاء الاصطناعي...') : (tJob.message || `تحميل التورنت (${tJob.progress}%)`),
      progress: effectiveProgress,
      speed: tJob.downloadSpeed ? `${tJob.downloadSpeed} MB/s` : null,
      downloadedMb: tJob.downloadedMb || null,
      totalMb: tJob.totalMb || null,
      numPeers: tJob.numPeers || 0,
      numSeeds: tJob.numSeeds || 0,
      eta: isProcessingInDb ? 'جاري التحليل...' : (tJob.eta || '--'),
      canOpen: proj.status === 'ready' || proj.processingProgress === 100,
      createdAt: proj.createdAt || new Date(tJob.createdAt || Date.now()).toISOString(),
      updatedAt: proj.updatedAt || new Date().toISOString()
    });
  }

  // 2. Ingest active processing tasks from in-memory activeProcessingSet or recently completed tasks
  const now = Date.now();
  for (const [pId, p] of Object.entries(projects)) {
    if (handledProjectIds.has(pId)) continue;

    // Security check: user isolation
    if (user.role !== 'Admin' && p.ownerId !== userId && p.auditorId !== userId) {
      continue;
    }

    const isProcessing = activeProcessingSet.has(pId);
    const isRecentlyCompleted = (p.status === 'ready' || p.status === 'Completed' || p.processingProgress === 100) &&
                                (now - new Date(p.updatedAt || p.createdAt || now).getTime() < 60 * 60 * 1000);

    // Only ingest tasks that are actually processing in memory or completed recently (no zombie tasks)
    if (isProcessing || isRecentlyCompleted) {
      handledProjectIds.add(pId);

      const stage = isRecentlyCompleted ? 'ready' : (p.processingStage || 'transcribing');

      // Dynamic ETA estimation for processing tasks
      let dynamicEta = '--';
      if (isProcessing) {
        const curProg = p.processingProgress || 10;
        if (curProg < 30) dynamicEta = '~3m 45s';
        else if (curProg < 60) dynamicEta = '~2m 15s';
        else if (curProg < 85) dynamicEta = '~1m 10s';
        else dynamicEta = '< 40s';
      } else if (isRecentlyCompleted) {
        dynamicEta = 'جاهز الآن';
      }

      activities.push({
        id: pId,
        projectId: pId,
        projectName: p.projectName || 'Uncategorized',
        mediaTitle: p.mediaTitle || 'Video Project',
        projectType: p.projectType || 'episode',
        type: p.sourceType || 'direct',
        status: isRecentlyCompleted ? 'ready' : 'processing',
        stage,
        stageDescription: p.processingStatus || (isRecentlyCompleted ? 'اكتملت المعالجة وهو جاهز للترجمة' : 'جاري المعالجة...'),
        progress: p.processingProgress !== undefined ? p.processingProgress : (isRecentlyCompleted ? 100 : 0),
        speed: null,
        downloadedMb: null,
        totalMb: null,
        numPeers: null,
        numSeeds: null,
        eta: dynamicEta,
        canOpen: isRecentlyCompleted,
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString()
      });
    }
  }

  // Sort activities: active ones first, then newest
  activities.sort((a, b) => {
    const aActive = a.status === 'downloading' || a.status === 'processing';
    const bActive = b.status === 'downloading' || b.status === 'processing';
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  const activeCount = activities.filter(a => a.status === 'downloading' || a.status === 'processing').length;

  res.json({
    success: true,
    activities,
    activeCount,
    minuteBalance: user.minuteBalance !== undefined ? user.minuteBalance : 0
  });
});

app.post('/api/activities/:id/cancel', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  const user = users[userId];
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projects = readProjects();
  const project = projects[id];

  if (project && user.role !== 'Admin' && project.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this project.' });
  }

  // Cancel torrent if active
  torrentService.cancelJob(id);
  activeProcessingSet.delete(id);

  if (project) {
    project.status = 'cancelled';
    project.processingStatus = 'Cancelled by user';
    project.updatedAt = new Date().toISOString();
    writeProjects(projects);
  }

  res.json({ success: true, message: 'Activity cancelled successfully' });
});

// 20. Assign Auditor to Project
app.post('/api/project/:id/assign-auditor', (req, res) => {
  const { id } = req.params;
  const { auditorId } = req.body;
  const userId = req.headers['x-user-id'];

  const projects = readProjects();
  const project = projects[id];
  const users = readUsers();

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const auditor = users[auditorId];
  if (!auditor) {
    return res.status(404).json({ error: 'Selected auditor account not found.' });
  }

  project.auditorId = auditor.id;
  project.auditorName = `${auditor.firstName} ${auditor.lastName}`.trim() || auditor.email;
  project.auditStatus = 'In Audit';
  project.updatedAt = new Date().toISOString();

  writeProjects(projects);

  return res.json({
    success: true,
    message: `Project assigned to Auditor ${project.auditorName}.`,
    project
  });
});

// 21. Export Subtitle Endpoint (.SRT or .ASS)
app.get('/api/project/:id/export', (req, res) => {
  const { id } = req.params;
  const format = (req.query.format || 'srt').toLowerCase();
  const lang = (req.query.lang || 'ar').toLowerCase();

  const projects = readProjects();
  const project = projects[id];

  if (!project || !project.subtitles) {
    return res.status(404).send('Project not found');
  }

  const safeProj = (project.projectName || 'Project').replace(/[/\\?%*:|"<>]/g, '-').trim();
  let safeEp = (project.mediaTitle || 'Episode').replace(/[/\\?%*:|"<>]/g, '-').trim();
  safeEp = safeEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');
  const filename = `[${safeProj}]-[${safeEp}].${format}`;
  const encodedFilename = encodeURIComponent(filename);

  const BOM = '\uFEFF';

  if (format === 'ass') {
    let ass = `${BOM}[Script Info]\nTitle: ${project.projectName}\nScriptType: v4.00+\nFormat: Dialogue\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    project.subtitles.forEach((sub) => {
      const text = lang === 'en' ? (sub.englishText || '') : lang === 'ja' ? (sub.japaneseText || '') : (sub.arabicText || '');
      const rawStart = formatSecondsToTimestampstamp(sub.startTime || '00:00:00,000');
      const rawEnd = formatSecondsToTimestampstamp(sub.endTime || '00:00:05,000');
      const start = rawStart.replace(',', '.').substring(0, 10);
      const end = rawEnd.replace(',', '.').substring(0, 10);
      const isSign = sub.track === 'sign' || (sub.assPosition && sub.assPosition !== '\\an2');
      const posTag = sub.assPosition ? `{\\${sub.assPosition.replace(/^\\+/, '')}}` : '';
      ass += `Dialogue: 0,${start},${end},${isSign ? 'Sign' : 'Default'},,0,0,0,,${posTag}${text}\n`;
    });

    res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    return res.send(ass);
  }

  let srt = `${BOM}`;
  project.subtitles.forEach((sub, idx) => {
    const text = lang === 'en' ? (sub.englishText || '') : lang === 'ja' ? (sub.japaneseText || '') : (sub.arabicText || '');
    const start = formatSecondsToTimestampstamp(sub.startTime || '00:00:00,000');
    const end = formatSecondsToTimestampstamp(sub.endTime || '00:00:05,000');
    srt += `${idx + 1}\n${start} --> ${end}\n${text}\n\n`;
  });

  res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
  res.send(srt);
});

function formatSecondsToTimestampstamp(ts) {
  let str = String(ts || '00:00:00,000').trim().replace('.', ',');
  if (str.length === 8) str += ',000';
  return str;
}

// 22. Delete Project & All Related Files
app.delete('/api/project/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];
  const projects = readProjects();
  const users = readUsers();
  const user = users[userId];
  const project = projects[id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'Admin' && project.ownerId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const folderOwnerId = project.ownerId || 'usr_guest';
  const userProjectDir = path.join(UPLOADS_DIR, folderOwnerId, id);
  const rootProjectDir = path.join(UPLOADS_DIR, id);

  [userProjectDir, rootProjectDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (err) {
        console.error(`[Project Deletion Error] Failed to delete ${dir}:`, err);
      }
    }
  });

  delete projects[id];
  writeProjects(projects);

  return res.json({
    success: true,
    message: 'Deletion completed successfully.'
  });
});


// --- Admin Cluster & API Pool Monitoring ---
app.get('/api/admin/cluster-metrics', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    if (req.query.rescan === '1' || req.query.rescan === 'true') {
      geminiPool.initPool();
    }
    const rawQueue = await queueService.getMetrics();
    const apiPoolStatus = geminiPool.getPoolStatus();

    // Aggregate true active workloads across all services (Torrents, AI processing, BullMQ)
    const activeTorrents = torrentService.activeJobs ? torrentService.activeJobs.size : 0;
    const activeAIJobs = activeProcessingSet.size;
    const totalActive = (rawQueue.active || 0) + activeTorrents + activeAIJobs;

    const projects = readProjects();
    const projList = Object.values(projects);
    const completedCount = projList.filter(p => p.status === 'ready' || p.status === 'Completed' || p.processingProgress === 100).length;
    const waitingCount = (rawQueue.waiting || 0) + projList.filter(p => p.status === 'queued').length;

    const queueMetrics = {
      ...rawQueue,
      active: totalActive,
      waiting: waitingCount,
      completed: Math.max(rawQueue.completed || 0, completedCount),
      activeTorrents,
      activeAIJobs,
      total: totalActive + waitingCount + Math.max(rawQueue.completed || 0, completedCount)
    };

    res.json({
      success: true,
      queue: queueMetrics,
      apiPool: apiPoolStatus,
      storage: cloudStorage.getStatus(),
      serverUptime: Math.round(process.uptime()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/gemini-keys/rescan', (req, res) => {
  try {
    geminiPool.initPool();
    res.json({ success: true, apiPool: geminiPool.getPoolStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/gemini-keys', (req, res) => {
  try {
    const { key } = req.body;
    const added = geminiPool.addKey(key);
    res.json({ success: true, key: added });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/gemini-keys/:id', (req, res) => {
  try {
    const removed = geminiPool.removeKey(req.params.id);
    res.json({ success: true, removed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ====================================================
// SERVER INFRASTRUCTURE & PROCESS MONITORING ENDPOINTS
// ====================================================

app.get('/api/admin/system/metrics', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePct = Math.round((usedMem / totalMem) * 100);

  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const systemUptime = os.uptime();
  const processUptime = process.uptime();
  const procMem = process.memoryUsage();

  // Test Redis connection & ping
  let redisStatus = 'offline';
  let redisPingMs = null;
  if (typeof redisConnection !== 'undefined' && redisConnection && (redisConnection.status === 'ready' || redisConnection.status === 'connect')) {
    try {
      const start = Date.now();
      await redisConnection.ping();
      redisPingMs = Date.now() - start;
      redisStatus = 'connected';
    } catch (_) {
      redisStatus = 'error';
    }
  }

  const activeTorrents = (torrentService && torrentService.activeJobs) ? torrentService.activeJobs.size : 0;
  const activeAIJobs = activeProcessingSet ? activeProcessingSet.size : 0;

  return res.json({
    success: true,
    timestamp: Date.now(),
    ram: {
      totalMb: (totalMem / (1024 * 1024)).toFixed(0),
      usedMb: (usedMem / (1024 * 1024)).toFixed(0),
      freeMb: (freeMem / (1024 * 1024)).toFixed(0),
      usagePct: memUsagePct
    },
    cpu: {
      model: cpus[0]?.model || 'Host CPU',
      cores: cpus.length,
      load1m: loadAvg[0]?.toFixed(2) || '0.00',
      load5m: loadAvg[1]?.toFixed(2) || '0.00',
      load15m: loadAvg[2]?.toFixed(2) || '0.00'
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      uptimeSeconds: Math.round(systemUptime)
    },
    process: {
      pid: process.pid,
      rssMb: (procMem.rss / (1024 * 1024)).toFixed(1),
      heapUsedMb: (procMem.heapUsed / (1024 * 1024)).toFixed(1),
      heapTotalMb: (procMem.heapTotal / (1024 * 1024)).toFixed(1),
      uptimeSeconds: Math.round(processUptime)
    },
    services: {
      nodeApp: { status: 'online', pid: process.pid, uptime: Math.round(processUptime) },
      redis: { status: redisStatus, pingMs: redisPingMs },
      torrentService: { status: 'running', activeJobs: activeTorrents },
      aiEngine: { status: 'ready', activeJobs: activeAIJobs }
    }
  });
});

app.post('/api/admin/system/restart-app', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  logSystemEvent('info', 'system', 'Admin initiated application restart sequence');
  
  // Touch passenger restart.txt if running on Plesk/Passenger
  const passengerRestart = path.join(__dirname, '..', 'tmp', 'restart.txt');
  try {
    const tmpDir = path.dirname(passengerRestart);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(passengerRestart, String(Date.now()));
  } catch (_) {}

  res.json({
    success: true,
    message: 'Application restart sequence initiated. Server will reload in 1 second.'
  });

  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

app.post('/api/admin/system/restart-redis', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  logSystemEvent('info', 'redis', 'Admin initiated Redis reconnect attempt');
  try {
    if (typeof redisConnection !== 'undefined' && redisConnection) {
      try { redisConnection.disconnect(); } catch (_) {}
      await redisConnection.connect().catch(() => {});
    }
    return res.json({ success: true, message: 'Redis connection refreshed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Redis restart error: ' + err.message });
  }
});

app.post('/api/admin/system/clear-cache', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  let cleanedFolders = 0;
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const scanAndClean = (dir) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            const fullPath = path.join(dir, e.name);
            if (e.isDirectory()) {
              if (e.name === 'chunks' || e.name === 'temp_torrents') {
                fs.rmSync(fullPath, { recursive: true, force: true });
                cleanedFolders++;
              } else {
                scanAndClean(fullPath);
              }
            }
          }
        } catch (_) {}
      };
      scanAndClean(UPLOADS_DIR);
    }

    if (typeof redisConnection !== 'undefined' && redisConnection && (redisConnection.status === 'ready' || redisConnection.status === 'connect')) {
      try { await redisConnection.flushdb(); } catch (_) {}
    }

    logSystemEvent('info', 'system', `Admin cleared cache. Cleaned ${cleanedFolders} temporary folder(s).`);
    return res.json({
      success: true,
      message: `System cache cleared successfully. Purged ${cleanedFolders} temporary audio chunk folder(s).`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Cache clearing error: ' + err.message });
  }
});

// ====================================================
// SYSTEM LOGS & INCIDENT RECOVERY ENDPOINTS
// ====================================================

app.get('/api/admin/system/logs', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const { level, category, search, limit = 200 } = req.query;
  let logs = readSystemLogs();

  if (level && level !== 'all') {
    logs = logs.filter(l => l.level === level);
  }
  if (category && category !== 'all') {
    logs = logs.filter(l => l.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    logs = logs.filter(l => 
      (l.message && l.message.toLowerCase().includes(q)) ||
      (l.category && l.category.toLowerCase().includes(q)) ||
      (l.meta && JSON.stringify(l.meta).toLowerCase().includes(q))
    );
  }

  const trimmed = logs.slice(0, Number(limit) || 200);
  return res.json({
    success: true,
    logs: trimmed,
    total: logs.length
  });
});

app.delete('/api/admin/system/logs', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  clearSystemLogs();
  logSystemEvent('info', 'system', 'Admin cleared all system logs history');
  return res.json({ success: true, message: 'All system logs have been cleared.' });
});

app.post('/api/admin/system/recover-task', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const { action, projectId } = req.body;

  if (action === 'clear_locks') {
    const releasedLocksCount = activeProcessingSet.size;
    activeProcessingSet.clear();

    // Reset stuck processing projects
    const projects = readProjects();
    let resetCount = 0;
    for (const [pId, p] of Object.entries(projects)) {
      if (p.status === 'processing') {
        p.status = 'ready';
        p.processingStatus = 'Unlocked by Administrator for reprocessing.';
        resetCount++;
      }
    }
    writeProjects(projects);

    logSystemEvent('warning', 'system', `Admin unlocked ${releasedLocksCount} active lock(s) and reset ${resetCount} stuck project(s).`);
    return res.json({
      success: true,
      message: `Released ${releasedLocksCount} active lock(s) and restored ${resetCount} stuck project(s) to ready state.`
    });
  }

  if (action === 'retry_stalled') {
    const projects = readProjects();
    let restartedCount = 0;
    for (const [pId, p] of Object.entries(projects)) {
      const isFailedOrStuck = p.status === 'failed' || p.status === 'processing' || (p.status === 'ready' && (!p.subtitles || p.subtitles.length === 0));
      if (isFailedOrStuck && p.videoUrl) {
        activeProcessingSet.delete(pId);
        p.status = 'processing';
        p.processingProgress = 10;
        p.processingStatus = 'Admin initiated task recovery & processing restart...';
        restartedCount++;
        // Kick off in background
        executeVideoProcessing(pId, p.duration || 0, null).catch(err => {
          logSystemEvent('error', 'video_proc', `Bulk recovery failed for ${pId}: ${err.message}`, { projectId: pId });
        });
      }
    }
    writeProjects(projects);
    logSystemEvent('info', 'video_proc', `Admin triggered bulk task recovery for ${restartedCount} project(s)`);
    return res.json({
      success: true,
      message: `Restarted processing for ${restartedCount} stalled/failed project(s).`
    });
  }

  if (action === 'rechunk_stuck') {
    const projects = readProjects();
    let rechunkedCount = 0;
    for (const [pId, p] of Object.entries(projects)) {
      const isFailedOrStuck = p.status === 'failed' || p.status === 'processing' || (p.status === 'ready' && (!p.subtitles || p.subtitles.length === 0));
      if (isFailedOrStuck && p.videoUrl) {
        try {
          const targetDir = getProjectTargetDir(p, pId);
          await performAudioRechunk(targetDir, 120);
          activeProcessingSet.delete(pId);
          p.status = 'processing';
          p.processingProgress = 15;
          p.processingStatus = 'Audio re-chunked (120s segments). Restarting AI transcription...';
          rechunkedCount++;
          executeVideoProcessing(pId, p.duration || 0, null).catch(err => {
            logSystemEvent('error', 'video_proc', `Bulk re-chunk processing failed for ${pId}: ${err.message}`, { projectId: pId });
          });
        } catch (_) {}
      }
    }
    writeProjects(projects);
    logSystemEvent('info', 'video_proc', `Admin triggered bulk re-chunk & salvage for ${rechunkedCount} project(s)`);
    return res.json({
      success: true,
      message: `Re-chunked and restarted processing for ${rechunkedCount} project(s).`
    });
  }

  if (action === 'retry_project' && projectId) {
    const projects = readProjects();
    const p = projects[projectId];
    if (!p) return res.status(404).json({ error: 'Project not found' });

    activeProcessingSet.delete(projectId);
    p.status = 'processing';
    p.processingProgress = 10;
    p.processingStatus = 'Admin initiated task recovery & processing restart...';
    writeProjects(projects);

    // Fire processing in background
    executeVideoProcessing(projectId, p.duration || 0, null).catch(err => {
      console.error(`[Task Recovery Failed] Project ${projectId}:`, err.message);
      logSystemEvent('error', 'video_proc', `Task recovery failed for project ${projectId}: ${err.message}`, { projectId });
    });

    logSystemEvent('info', 'video_proc', `Admin triggered task recovery for project ${projectId}`, { projectId });
    return res.json({
      success: true,
      message: `Project ${projectId} processing restarted successfully.`
    });
  }

  if (action === 'rechunk_project' && projectId) {
    const projects = readProjects();
    const p = projects[projectId];
    if (!p) return res.status(404).json({ error: 'Project not found' });

    try {
      const targetDir = getProjectTargetDir(p, projectId);
      const rechunkResult = await performAudioRechunk(targetDir, 120);

      activeProcessingSet.delete(projectId);
      p.status = 'processing';
      p.processingProgress = 15;
      p.processingStatus = `Audio re-chunked (${rechunkResult.chunkFiles.length} segments). Restarting AI transcription...`;
      writeProjects(projects);

      executeVideoProcessing(projectId, p.duration || 0, null).catch(err => {
        logSystemEvent('error', 'video_proc', `Re-chunk processing failed for project ${projectId}: ${err.message}`, { projectId });
      });

      logSystemEvent('info', 'video_proc', `Admin re-chunked audio and restarted AI transcription for project ${projectId}`, { projectId, chunkCount: rechunkResult.chunkFiles.length });
      return res.json({
        success: true,
        message: `Successfully re-chunked audio into ${rechunkResult.chunkFiles.length} segments and restarted transcription.`
      });
    } catch (rcErr) {
      return res.status(500).json({ error: 'Re-chunk failed: ' + rcErr.message });
    }
  }

  return res.status(400).json({ error: 'Invalid recovery action specified.' });
});

// Real-time project health & status monitor endpoint for Admin Console
app.get('/api/admin/projects/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const projects = readProjects();
  const list = Object.entries(projects).map(([id, p]) => {
    const subCount = Array.isArray(p.subtitles) ? p.subtitles.length : 0;
    return {
      id,
      projectName: p.projectName || 'Untitled',
      ownerId: p.ownerId || 'usr_guest',
      status: p.status,
      processingStage: p.processingStage || '',
      processingProgress: p.processingProgress !== undefined ? p.processingProgress : 0,
      processingStatus: p.processingStatus || '',
      duration: p.duration || 0,
      subtitlesCount: subCount,
      updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
      hasVideo: Boolean(p.videoUrl),
      error: p.error || null
    };
  }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  return res.json({
    success: true,
    projects: list.slice(0, 30)
  });
});

// ====================================================
// NEWSLETTER & ANNOUNCEMENTS ENDPOINTS
// ====================================================

app.get('/api/admin/newsletter/subscribers', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const subscribers = Object.values(users)
    .filter(u => u.isVerified && u.subscriptions?.newsletter !== false)
    .map(u => ({
      id: u.id,
      email: u.email,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      role: u.role,
      subscribedAt: u.createdAt
    }));

  return res.json({
    success: true,
    count: subscribers.length,
    subscribers
  });
});

app.post('/api/admin/newsletter/generate', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const { topic, tone = 'exciting', lang = 'ar' } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Please provide a topic or announcement details.' });
  }

  const settings = readSettings();
  const aiKey = process.env.GEMINI_API_KEY || settings.geminiApiKey || (geminiPool.keys && geminiPool.keys[0]?.rawKey);
  if (!aiKey) {
    return res.status(400).json({ error: 'No Gemini API key available for newsletter generation.' });
  }

  try {
    const result = await generateNewsletterWithAI({
      topic,
      tone,
      lang,
      aiKey,
      modelName: sanitizeGeminiModel(settings.geminiModel)
    });

    logSystemEvent('info', 'system', `Admin generated newsletter template: "${result.subject}"`);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Newsletter Generate Error]', err);
    logSystemEvent('error', 'gemini_api', `Newsletter generation failed: ${err.message}`);
    return res.status(500).json({ error: 'Failed to generate newsletter: ' + err.message });
  }
});

app.post('/api/admin/newsletter/send', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  const adminUser = users[userId];
  if (adminUser?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const { subject, htmlContent, isTest = false, testEmail } = req.body;
  if (!subject || !htmlContent) {
    return res.status(400).json({ error: 'Subject and HTML content are required.' });
  }

  const senderAddress = 'Subtie Anime Platform <noreply@subtie.msoms.ai>';

  if (isTest) {
    const targetTestEmail = testEmail || adminUser.email;
    const testResult = await sendMailNotification(
      targetTestEmail,
      `[معاينة تجريبية] ${subject}`,
      htmlContent.replace(/\{\{EMAIL\}\}/g, encodeURIComponent(targetTestEmail)),
      senderAddress
    );

    if (!testResult.success) {
      return res.status(500).json({ error: 'Failed to send test email: ' + (testResult.error || 'Unknown error') });
    }

    logSystemEvent('info', 'system', `Admin sent test newsletter to ${targetTestEmail}`);
    return res.json({ success: true, message: `Test email dispatched successfully to ${targetTestEmail}.` });
  }

  // Full Live Campaign Broadcast
  const subscribers = Object.values(users).filter(u => u.isVerified && u.subscriptions?.newsletter !== false);
  if (subscribers.length === 0) {
    return res.status(400).json({ error: 'No subscribed users found to receive this campaign.' });
  }

  let successCount = 0;
  let failCount = 0;

  // Process dispatch
  for (const sub of subscribers) {
    const personalizedHtml = htmlContent.replace(/\{\{EMAIL\}\}/g, encodeURIComponent(sub.email));
    try {
      const res = await sendMailNotification(sub.email, subject, personalizedHtml, senderAddress);
      if (res.success) successCount++;
      else failCount++;
    } catch (_) {
      failCount++;
    }
    // Small delay between sends to respect rate limits
    await new Promise(r => setTimeout(r, 80));
  }

  // Record in newsletter history
  const history = readNewsletters();
  const campaignRecord = {
    id: 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    subject,
    sentAt: new Date().toISOString(),
    recipientsCount: subscribers.length,
    deliveredCount: successCount,
    failedCount: failCount,
    sentBy: adminUser.email,
    previewSnippet: subject.substring(0, 100)
  };
  history.unshift(campaignRecord);
  writeNewsletters(history);

  logSystemEvent('info', 'system', `Admin broadcasted newsletter "${subject}" to ${successCount}/${subscribers.length} subscribers.`);
  return res.json({
    success: true,
    message: `Newsletter campaign dispatched to ${successCount} subscriber(s). Failed: ${failCount}.`,
    campaign: campaignRecord
  });
});

app.get('/api/admin/newsletter/history', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  if (users[userId]?.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const history = readNewsletters();
  return res.json({ success: true, history });
});

// Public Unsubscribe Endpoint
app.get('/api/newsletter/unsubscribe', (req, res) => {
  const { email } = req.query;
  if (email) {
    const users = readUsers();
    let found = false;
    for (const u of Object.values(users)) {
      if (u.email && u.email.toLowerCase() === String(email).trim().toLowerCase()) {
        u.subscriptions = u.subscriptions || {};
        u.subscriptions.newsletter = false;
        found = true;
      }
    }
    if (found) {
      writeUsers(users);
      logSystemEvent('info', 'auth', `User ${email} unsubscribed from newsletter.`);
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>إلغاء الاشتراك — Subtie</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Tahoma, sans-serif; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; padding: 48px 32px; border-radius: 28px; border: 1px solid rgba(168, 85, 247, 0.4); max-width: 480px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
          .icon { width: 64px; height: 64px; background: rgba(168, 85, 247, 0.2); border: 2px solid #a855f7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 28px; }
          h2 { color: #c084fc; margin-bottom: 12px; font-size: 24px; font-weight: 800; }
          p { color: #94a3b8; line-height: 1.7; font-size: 15px; margin-bottom: 28px; }
          a { display: inline-block; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; padding: 12px 32px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 10px 20px -5px rgba(124, 58, 237, 0.5); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>تم إلغاء الاشتراك بنجاح</h2>
          <p>تم إزالة بريدك الإلكتروني من قائمة النشرة الإخبارية لمنصة Subtie. لن تتلقى رسائل البريد الدورية بعد الآن. يمكنك إعادة الاشتراك من إعدادات حسابك في أي وقت.</p>
          <a href="/">العودة إلى منصة Subtie</a>
        </div>
      </body>
    </html>
  `);
});

// ====================================================
// ZIINA PAYMENT GATEWAY & PACKAGES ENDPOINTS
// ====================================================

// 1. Get Packages Catalogue
app.get('/api/payments/packages', (req, res) => {
  const catalogue = getPackagesCatalogue();
  return res.json({ success: true, catalogue });
});

// 2. Create Ziina Payment Intent
app.post('/api/payments/create-intent', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to initiate payment.' });
    }

    const { packageId, customMinutes } = req.body;
    if (!packageId) {
      return res.status(400).json({ error: 'packageId is required.' });
    }

    // Determine client origin for customer redirection
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

    const result = await createPaymentIntent({
      userId,
      packageId,
      customMinutes,
      origin
    });

    return res.json(result);
  } catch (err) {
    console.error('❌ [Payment Create-Intent Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Verify Payment & Credit User Wallet
app.post('/api/payments/verify', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required for verification.' });
    }

    const result = await verifyAndCreditPayment(paymentIntentId);
    return res.json(result);
  } catch (err) {
    console.error('❌ [Payment Verify Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Get User Transaction History
app.get('/api/payments/transactions', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const txs = getUserTransactions(userId);
  return res.json({ success: true, transactions: txs });
});

// Serve Vite frontend build (Production)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA Fallback
  app.get(/(.*)/, (req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

const server = http.createServer(app);
socketService.init(server);

function reconcileStartupWorkloads() {
  try {
    const projects = readProjects();
    let modified = false;
    for (const [id, p] of Object.entries(projects)) {
      if (p.status === 'downloading_torrent' || p.status === 'processing') {
        const hasFinishedSubtitles = Array.isArray(p.subtitles) && p.subtitles.length > 0;
        if (hasFinishedSubtitles || p.processingProgress === 100) {
          p.status = 'ready';
          p.processingProgress = 100;
          modified = true;
        } else {
          p.status = 'interrupted';
          p.processingStatus = 'توقفت المهمة السابقة بسبب إعادة تشغيل السيرفر — يمكنك إعادة تشغيلها من معالج التحميل';
          modified = true;
        }
      }
    }
    if (modified) {
      writeProjects(projects);
      console.log('🧹 [Startup Reconcile] Cleaned up legacy zombie tasks from previous server session.');
    }
  } catch (err) {
    console.warn('⚠️ [Startup Reconcile] Warning:', err.message);
  }
}

reconcileStartupWorkloads();

server.listen(PORT, () => {
  console.log(`Subtie Backend running on http://localhost:${PORT}`);
});

function formatSecondsToTimestamp(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

if (typeof server !== 'undefined') {
  server.setTimeout(1800000);
  server.keepAliveTimeout = 1800000;
  server.headersTimeout = 1800000;
  server.requestTimeout = 1800000;
}
