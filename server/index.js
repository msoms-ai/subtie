import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

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

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Serve static uploaded videos and audio files
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

// Configure Multer storage per unique project folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = 'subtie_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    req.projectId = projectId;
    const projectDir = path.join(UPLOADS_DIR, projectId);
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

// Process Extracted Audio File with Gemini AI
async function processAudioWithGemini(audioPath, providedApiKey) {
  const apiKey = providedApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server/.env');
  }

  console.log(`[Gemini AI Engine] Initializing Gemini API for audio file: ${audioPath}`);
  const ai = new GoogleGenAI({ apiKey });

  // 1. Upload ONLY the extracted audio file to Gemini Files API
  console.log(`[Gemini AI Engine] Uploading extracted MP3 audio file to Gemini Files API...`);
  const uploadResult = await ai.files.upload({
    file: audioPath,
    mimeType: 'audio/mp3'
  });

  console.log(`[Gemini AI Engine] Audio file uploaded: ${uploadResult.name}. Waiting for ACTIVE status...`);

  // 2. Poll until file state is ACTIVE
  let fileState = uploadResult;
  let attempts = 0;
  while (fileState.state === 'PROCESSING' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    fileState = await ai.files.get({ name: uploadResult.name });
    attempts++;
  }

  if (fileState.state !== 'ACTIVE') {
    throw new Error(`Gemini Audio file processing failed with state: ${fileState.state}`);
  }

  console.log(`[Gemini AI Engine] Audio file active. Transcribing Japanese speech & translating to English & Arabic...`);

  // 3. Multimodal Prompt for Japanese Speech Transcription & Dual Translation
  const prompt = `
You are an expert anime subtitle translator and ASR system.
Listen carefully to the provided audio track.

Tasks:
1. Transcribe every spoken Japanese line/sentence accurately with HIGH-PRECISION EXACT start and end timestamps (formatted as HH:MM:SS,mmm and startSeconds / endSeconds) matching the exact voice activity in the audio track.
2. Ensure there are no overlapping timestamps and each spoken phrase aligns precisely with speech onset and offset.
3. For each spoken line, provide:
   - "japaneseText": Original spoken Japanese dialogue in kanji/kana.
   - "englishText": Accurate, natural English translation of the Japanese line.
   - "arabicText": High-quality natural Arabic translation (العربية) of the Japanese line.

Return ONLY valid JSON matching this exact structure:
{
  "subtitles": [
    {
      "id": 1,
      "startTime": "00:00:03,500",
      "endTime": "00:00:06,800",
      "startSeconds": 3.5,
      "endSeconds": 6.8,
      "japaneseText": "...",
      "englishText": "...",
      "arabicText": "..."
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        fileData: {
          fileUri: fileState.uri,
          mimeType: fileState.mimeType || 'audio/mp3'
        }
      },
      { text: prompt }
    ]
  });

  const text = response.text || '';
  console.log(`[Gemini AI Engine] Received AI response. Parsing JSON subtitles...`);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.subtitles && Array.isArray(parsed.subtitles)) {
      return parsed.subtitles.map((sub, idx) => ({
        ...sub,
        id: idx + 1,
        approved: false
      }));
    }
  }

  throw new Error('Gemini API did not return valid subtitles JSON format.');
}

// 1. Video Upload Endpoint
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const projectId = req.projectId;
  const videoUrl = `/uploads/${projectId}/${req.file.filename}`;

  res.json({
    success: true,
    projectId,
    videoUrl,
    filename: req.file.originalname,
    size: req.file.size
  });
});

function formatSrtTimestamp(timeStr) {
  if (!timeStr) return '00:00:00,000';
  let clean = String(timeStr).trim().replace('.', ',');
  if (/^\d{2}:\d{2}:\d{2},\d{3}$/.test(clean)) return clean;
  if (/^\d{2}:\d{2}:\d{2}$/.test(clean)) return `${clean},000`;
  return clean;
}

function saveThreeSrtFiles(projectDir, subtitles) {
  if (!subtitles || !Array.isArray(subtitles)) return;

  // 1. Japanese SRT
  let srtJa = '';
  subtitles.forEach((sub, idx) => {
    const start = formatSrtTimestamp(sub.startTime);
    const end = formatSrtTimestamp(sub.endTime);
    srtJa += `${idx + 1}\n${start} --> ${end}\n${sub.japaneseText || ''}\n\n`;
  });
  fs.writeFileSync(path.join(projectDir, 'subtitles_ja.srt'), srtJa, 'utf8');

  // 2. English SRT
  let srtEn = '';
  subtitles.forEach((sub, idx) => {
    const start = formatSrtTimestamp(sub.startTime);
    const end = formatSrtTimestamp(sub.endTime);
    srtEn += `${idx + 1}\n${start} --> ${end}\n${sub.englishText || ''}\n\n`;
  });
  fs.writeFileSync(path.join(projectDir, 'subtitles_en.srt'), srtEn, 'utf8');

  // 3. Arabic SRT
  let srtAr = '';
  subtitles.forEach((sub, idx) => {
    const start = formatSrtTimestamp(sub.startTime);
    const end = formatSrtTimestamp(sub.endTime);
    srtAr += `${idx + 1}\n${start} --> ${end}\n${sub.arabicText || ''}\n\n`;
  });
  fs.writeFileSync(path.join(projectDir, 'subtitles_ar.srt'), srtAr, 'utf8');

  // Combined/Default subtitle.srt
  let srtCombined = '';
  subtitles.forEach((sub, idx) => {
    const start = formatSrtTimestamp(sub.startTime);
    const end = formatSrtTimestamp(sub.endTime);
    srtCombined += `${idx + 1}\n${start} --> ${end}\n${sub.japaneseText || ''}\n${sub.englishText || ''}\n${sub.arabicText || ''}\n\n`;
  });
  fs.writeFileSync(path.join(projectDir, 'subtitle.srt'), srtCombined, 'utf8');
}

// 2. AI Audio Extraction & Gemini Processing Endpoint
app.post('/api/process', async (req, res) => {
  const { projectId, projectName, projectType, mediaTitle, apiKey } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const projectDir = path.join(UPLOADS_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project directory not found' });
  }

  const files = fs.readdirSync(projectDir);
  const videoFileName = files.find(f => f.startsWith('video.')) || 'video.mp4';
  const videoPath = path.join(projectDir, videoFileName);
  const audioPath = path.join(projectDir, 'audio.mp3');

  try {
    // Step A: Extract Audio Track from Video File locally
    await extractAudioTrack(videoPath, audioPath);

    // Step B: Upload Extracted Audio to Gemini & Transcribe/Translate
    const subtitles = await processAudioWithGemini(audioPath, apiKey);

    // Save 3 SRT files (Japanese, English, Arabic) locally in project folder
    saveThreeSrtFiles(projectDir, subtitles);

    const projectState = {
      id: projectId,
      projectName: projectName || 'Untitled Subtie Project',
      projectType: projectType || 'Episode',
      mediaTitle: mediaTitle || 'Untitled Video',
      videoUrl: `/uploads/${projectId}/${videoFileName}`,
      audioUrl: `/uploads/${projectId}/audio.mp3`,
      srtUrl: `/uploads/${projectId}/subtitle.srt`,
      subtitles: subtitles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const projects = readProjects();
    projects[projectId] = projectState;
    writeProjects(projects);

    return res.json({
      success: true,
      project: projectState
    });
  } catch (err) {
    console.error('Audio & AI Processing error:', err);

    return res.status(500).json({
      error: 'GEMINI_PROCESSING_FAILED',
      message: `Audio extraction / Gemini AI Processing failed: ${err.message}`
    });
  }
});

// 3. Get All Projects
app.get('/api/projects', (req, res) => {
  const projectsMap = readProjects();
  const projectsList = Object.values(projectsMap).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  res.json({ success: true, projects: projectsList });
});

// 4. Get Knowledge Dashboard Statistics
app.get('/api/dashboard-stats', (req, res) => {
  const projectsMap = readProjects();
  const projectsList = Object.values(projectsMap);

  let totalLines = 0;
  let approvedLines = 0;
  let totalEpisodes = 0;
  let totalMovies = 0;
  let totalTrailers = 0;
  let totalClips = 0;

  projectsList.forEach(proj => {
    const pType = proj.projectType || 'Episode';
    if (pType === 'Episode') totalEpisodes++;
    else if (pType === 'Movie') totalMovies++;
    else if (pType === 'Trailer') totalTrailers++;
    else if (pType === 'Clip') totalClips++;

    if (proj.subtitles && Array.isArray(proj.subtitles)) {
      totalLines += proj.subtitles.length;
      approvedLines += proj.subtitles.filter(s => s.approved).length;
    }
  });

  res.json({
    success: true,
    stats: {
      totalEpisodes,
      totalProjects: projectsList.length,
      totalMovies,
      totalTrailers,
      totalClips,
      totalLines,
      totalTranslatedLines: totalLines,
      approvedLines
    }
  });
});

// 5. Get Project by ID
app.get('/api/project/:id', (req, res) => {
  const projects = readProjects();
  const project = projects[req.params.id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ success: true, project });
});

// 6. Save Project State
app.post('/api/project/:id/save', (req, res) => {
  const { id } = req.params;
  const { subtitles, projectName, projectType, mediaTitle } = req.body;

  const projects = readProjects();
  if (!projects[id]) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Update 3 SRT files (Japanese, English, Arabic) on disk
  if (subtitles && Array.isArray(subtitles)) {
    const projectDir = path.join(UPLOADS_DIR, id);
    saveThreeSrtFiles(projectDir, subtitles);
  }

  projects[id] = {
    ...projects[id],
    ...(subtitles && { subtitles }),
    ...(projectName && { projectName }),
    ...(projectType && { projectType }),
    ...(mediaTitle && { mediaTitle }),
    updatedAt: new Date().toISOString()
  };

  writeProjects(projects);

  res.json({ success: true, project: projects[id] });
});

// 7. Export Subtitles as .SRT or .ASS
app.get('/api/project/:id/export', (req, res) => {
  const { id } = req.params;
  const format = (req.query.format || 'srt').toLowerCase();
  const lang = (req.query.lang || 'ar').toLowerCase();

  const projects = readProjects();
  const project = projects[id];

  if (!project || !project.subtitles) {
    return res.status(404).send('Project not found');
  }

  const filename = `${project.projectName.replace(/[^a-z0-9]/gi, '_')}_${lang}.${format}`;

  if (format === 'ass') {
    let ass = `[Script Info]\nTitle: ${project.projectName}\nScriptType: v4.00+\nFormat: Dialogue\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    project.subtitles.forEach((sub) => {
      const text = lang === 'en' ? sub.englishText : lang === 'ja' ? sub.japaneseText : sub.arabicText;
      const start = sub.startTime.replace(',', '.').substring(0, 10);
      const end = sub.endTime.replace(',', '.').substring(0, 10);
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(ass);
  }

  let srt = '';
  project.subtitles.forEach((sub, idx) => {
    const text = lang === 'en' ? sub.englishText : lang === 'ja' ? sub.japaneseText : sub.arabicText;
    srt += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${text}\n\n`;
  });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(srt);
});

// 8. Delete Project & All Related Files (video, audio, srt)
app.delete('/api/project/:id', (req, res) => {
  const { id } = req.params;
  const projects = readProjects();

  if (!projects[id]) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Delete project files on disk recursively
  const projectDir = path.join(UPLOADS_DIR, id);
  if (fs.existsSync(projectDir)) {
    try {
      fs.rmSync(projectDir, { recursive: true, force: true });
      console.log(`[Project Deletion] Deleted project directory: ${projectDir}`);
    } catch (err) {
      console.error(`[Project Deletion Error] Failed to delete ${projectDir}:`, err);
    }
  }

  // Remove from JSON store
  delete projects[id];
  writeProjects(projects);

  return res.json({
    success: true,
    message: 'Deletion completed successfully. All project files deleted.'
  });
});

app.listen(PORT, () => {
  console.log(`Subtie Backend running on http://localhost:${PORT}`);
});
