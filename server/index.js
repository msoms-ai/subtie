import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

// Set ffmpeg binary path from installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

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

async function sendMailNotification(toEmail, subject, htmlContent) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Subtie Platform <ai@msoms.ai>',
        to: [toEmail],
        subject: subject,
        html: htmlContent
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[Resend Email Error] API returned status ${res.status}:`, data);
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

// Helper functions for project store
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

// Extract Audio Track from MP4 Video File locally
function extractAudioTrack(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`[Audio Extractor] Extracting audio track from: ${videoPath} -> ${audioPath}`);
    ffmpeg(videoPath)
      .output(audioPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .on('end', () => {
        console.log(`[Audio Extractor] Audio extraction completed: ${audioPath}`);
        resolve(audioPath);
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
    const userId = req.headers['x-user-id'] || req.body?.userId || 'usr_guest';
    const projectId = 'subtie_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    req.projectId = projectId;
    req.userId = userId;
    
    const userDir = path.join(UPLOADS_DIR, userId);
    const projectDir = path.join(userDir, projectId);
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
  limits: { fileSize: 500 * 1024 * 1024 }
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
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const users = readUsers();
  const user = users[userId];

  if (!user) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const { passwordHash, verificationCode, passwordResetCode, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
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

// 13. Admin Endpoint: Get All Registered Users
app.get('/api/auth/users', (req, res) => {
  const userId = req.headers['x-user-id'];
  const users = readUsers();
  const requester = users[userId];

  if (!requester || requester.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }

  const safeUsers = Object.values(users).map(u => {
    const { passwordHash, verificationCode, passwordResetCode, ...safe } = u;
    return safe;
  });

  return res.json({ success: true, users: safeUsers });
});

// 14. Admin Endpoint: Change User Role
app.put('/api/auth/users/:id/role', (req, res) => {
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

  const { passwordHash, verificationCode, passwordResetCode, ...safeTarget } = target;
  return res.json({
    success: true,
    message: `User ${target.email} role updated to ${role}.`,
    user: safeTarget
  });
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

  const projectDir = path.join(UPLOADS_DIR, userId, projectId);
  const videoFilename = req.file.filename;
  
  // Public URL relative to /uploads
  const videoUrl = `/uploads/${userId}/${projectId}/${videoFilename}`;

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

// 16. Process Audio & Transcribe/Translate with Gemini AI Engine
app.post('/api/process', async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const projects = readProjects();
  const project = projects[projectId];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Determine user directory path
  const userId = project.ownerId || 'usr_guest';
  const projectDir = path.join(UPLOADS_DIR, userId, projectId);
  
  // Fallback check for root uploads if older project
  const targetDir = fs.existsSync(projectDir) ? projectDir : path.join(UPLOADS_DIR, projectId);

  const videoFiles = fs.readdirSync(targetDir).filter(f => f.startsWith('video.'));
  if (videoFiles.length === 0) {
    return res.status(404).json({ error: 'Video file not found for this project' });
  }

  const videoPath = path.join(targetDir, videoFiles[0]);
  const audioPath = path.join(targetDir, 'audio.mp3');
  const srtPath = path.join(targetDir, 'subtitle.srt');

  try {
    // Step 1: Extract Audio
    await extractAudioTrack(videoPath, audioPath);
    project.audioUrl = `/uploads/${userId}/${projectId}/audio.mp3`;

    // Step 2: Initialize Gemini AI Client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env file.');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Step 3: Upload Audio File to Gemini Files API
    console.log(`[Gemini AI] Uploading audio file to Gemini Files API: ${audioPath}`);
    const uploadResult = await ai.files.upload({
      file: audioPath,
      mimeType: 'audio/mp3'
    });

    console.log(`[Gemini AI] Audio uploaded. File URI: ${uploadResult.file.uri}`);

    // Wait 3 seconds for processing
    await new Promise(r => setTimeout(r, 3000));

    // Step 4: Multimodal Audio Transcription & Translation Prompt
    const prompt = `You are an expert anime subtitle translator and ASR engine for MSOMS-Anime.
Analyze the provided Japanese audio track carefully.
Extract each spoken dialogue line with precise start and end timestamps.

For each dialogue line, provide:
1. "startTime": Timestamp formatted as HH:MM:SS,mmm (e.g. "00:00:03,500")
2. "endTime": Timestamp formatted as HH:MM:SS,mmm (e.g. "00:00:06,800")
3. "japaneseText": Exact Japanese transcript (Kanji/Kana)
4. "englishText": Natural English translation suitable for fansubbing
5. "arabicText": High quality, fluent Arabic translation (فصحى احترافية) suited for MSOMS Arabic anime fansubs

Return ONLY a valid JSON array of objects with the exact key names: "id" (1, 2, 3...), "startTime", "endTime", "japaneseText", "englishText", "arabicText".
Do NOT wrap in markdown backticks or markdown formatting. Output raw JSON array only.`;

    console.log(`[Gemini AI] Sending transcription prompt to gemini-flash-latest...`);
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { fileUri: uploadResult.file.uri, mimeType: 'audio/mp3' } },
            { text: prompt }
          ]
        }
      ]
    });

    let rawText = response.text || '';
    console.log('[Gemini Raw Response]', rawText);

    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsedSubtitles = [];
    try {
      parsedSubtitles = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[Gemini JSON Parse Error]', parseErr);
      parsedSubtitles = [
        {
          id: 1,
          startTime: "00:00:02,000",
          endTime: "00:00:06,000",
          japaneseText: "Subtitle generated by Subtie Gemini AI Engine",
          englishText: "Subtitle generated by Subtie Gemini AI Engine",
          arabicText: "تم إنشاء الترجمة بواسطة محرك سابتاي ذكاء اصطناعي",
          approved: false
        }
      ];
    }

    const subtitlesWithSeconds = parsedSubtitles.map((sub, idx) => {
      const startSec = parseTimestampToSeconds(sub.startTime || '00:00:00,000');
      const endSec = parseTimestampToSeconds(sub.endTime || '00:00:05,000');
      return {
        id: sub.id || (idx + 1),
        startTime: sub.startTime || '00:00:00,000',
        endTime: sub.endTime || '00:00:05,000',
        startSeconds: startSec,
        endSeconds: endSec,
        japaneseText: sub.japaneseText || '',
        englishText: sub.englishText || '',
        arabicText: sub.arabicText || '',
        approved: false,
        auditNotes: ''
      };
    });

    project.subtitles = subtitlesWithSeconds;

    // Write SRT file to project folder
    let srtContent = '';
    subtitlesWithSeconds.forEach((sub, idx) => {
      srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.arabicText || sub.englishText}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent, 'utf8');
    project.srtUrl = `/uploads/${userId}/${projectId}/subtitle.srt`;
    project.updatedAt = new Date().toISOString();

    writeProjects(projects);

    return res.json({
      success: true,
      projectId,
      audioUrl: project.audioUrl,
      srtUrl: project.srtUrl,
      subtitles: subtitlesWithSeconds
    });

  } catch (err) {
    console.error('[Process AI Error]', err);
    return res.status(500).json({
      error: 'AI Transcription Error: ' + err.message
    });
  }
});

function parseTimestampToSeconds(ts) {
  try {
    const parts = ts.replace('.', ',').split(',');
    const timeParts = parts[0].split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;
    const millis = parseInt(parts[1], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds + millis / 1000;
  } catch (e) {
    return 0;
  }
}

// 17. Get All Projects (Role-Filtered)
app.get('/api/projects', (req, res) => {
  const userId = req.headers['x-user-id'];
  const projects = readProjects();
  const users = readUsers();
  const user = users[userId];

  const projectList = Object.values(projects);

  if (!user || user.role === 'Admin') {
    // Admin sees all projects
    return res.json(projectList);
  }

  if (user.role === 'Auditor') {
    // Auditor sees projects assigned to them for audit
    const assigned = projectList.filter(p => p.auditorId === userId || p.ownerId === userId);
    return res.json(assigned);
  }

  // Translator sees owned projects or assigned projects
  const translatorProjects = projectList.filter(p => p.ownerId === userId || p.auditorId === userId || !p.ownerId);
  return res.json(translatorProjects);
});

// 18. Get Single Project Details
app.get('/api/project/:id', (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const project = projects[id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.json(project);
});

// 19. Save Live Subtitle Edits (With optional Audit Status & Notes)
app.post('/api/project/:id/save', (req, res) => {
  const { id } = req.params;
  const { subtitles, auditStatus } = req.body;
  const projects = readProjects();
  const project = projects[id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (Array.isArray(subtitles)) {
    project.subtitles = subtitles;
  }

  if (auditStatus) {
    project.auditStatus = auditStatus;
  }

  project.updatedAt = new Date().toISOString();
  writeProjects(projects);

  return res.json({ success: true, project });
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

  const cleanProjectName = (project.projectName || 'subtitles').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${cleanProjectName}_${lang}.${format}`;
  const encodedFilename = encodeURIComponent(filename);

  const BOM = '\uFEFF';

  if (format === 'ass') {
    let ass = `${BOM}[Script Info]\nTitle: ${project.projectName}\nScriptType: v4.00+\nFormat: Dialogue\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    project.subtitles.forEach((sub) => {
      const text = lang === 'en' ? (sub.englishText || '') : lang === 'ja' ? (sub.japaneseText || '') : (sub.arabicText || '');
      const rawStart = formatSrtTimestamp(sub.startTime || '00:00:00,000');
      const rawEnd = formatSrtTimestamp(sub.endTime || '00:00:05,000');
      const start = rawStart.replace(',', '.').substring(0, 10);
      const end = rawEnd.replace(',', '.').substring(0, 10);
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    });

    res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    return res.send(ass);
  }

  let srt = `${BOM}`;
  project.subtitles.forEach((sub, idx) => {
    const text = lang === 'en' ? (sub.englishText || '') : lang === 'ja' ? (sub.japaneseText || '') : (sub.arabicText || '');
    const start = formatSrtTimestamp(sub.startTime || '00:00:00,000');
    const end = formatSrtTimestamp(sub.endTime || '00:00:05,000');
    srt += `${idx + 1}\n${start} --> ${end}\n${text}\n\n`;
  });

  res.setHeader('Content-Type', 'application/octet-stream; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
  res.send(srt);
});

function formatSrtTimestamp(ts) {
  let str = String(ts || '00:00:00,000').trim().replace('.', ',');
  if (str.length === 8) str += ',000';
  return str;
}

// 22. Delete Project & All Related Files
app.delete('/api/project/:id', (req, res) => {
  const { id } = req.params;
  const projects = readProjects();
  const project = projects[id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const userId = project.ownerId || 'usr_guest';
  const userProjectDir = path.join(UPLOADS_DIR, userId, id);
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

app.listen(PORT, () => {
  console.log(`Subtie Backend running on http://localhost:${PORT}`);
});
