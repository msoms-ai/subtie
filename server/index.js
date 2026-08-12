import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

// Real Gemini AI Video Processing Function
async function processVideoWithGemini(videoPath, providedApiKey) {
  const apiKey = providedApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  console.log(`[Gemini AI Engine] Starting real video processing on: ${videoPath}`);
  const ai = new GoogleGenAI({ apiKey });

  // 1. Upload video file to Gemini Files API
  console.log(`[Gemini AI Engine] Uploading MP4 file to Gemini Files API...`);
  const uploadResult = await ai.files.upload({
    file: videoPath,
    mimeType: 'video/mp4'
  });

  console.log(`[Gemini AI Engine] File uploaded: ${uploadResult.name}. Waiting for ACTIVE status...`);

  // 2. Poll until file state is ACTIVE
  let fileState = uploadResult;
  let attempts = 0;
  while (fileState.state === 'PROCESSING' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    fileState = await ai.files.get({ name: uploadResult.name });
    attempts++;
  }

  if (fileState.state !== 'ACTIVE') {
    throw new Error(`Gemini File processing failed with state: ${fileState.state}`);
  }

  console.log(`[Gemini AI Engine] File active. Sending multimodal transcription & translation prompt to gemini-2.0-flash...`);

  // 3. Multimodal Prompt for Japanese Speech Transcription & Dual Translation
  const prompt = `
You are an expert anime subtitle translator and ASR system.
Analyze the provided video file carefully. Listen to all spoken audio dialogue in Japanese.

Tasks:
1. Transcribe every spoken Japanese line/sentence accurately with exact start and end timestamps (formatted as HH:MM:SS,mmm and start/end seconds).
2. For each spoken line, provide:
   - "japaneseText": Original spoken Japanese dialogue.
   - "englishText": Accurate, natural English translation.
   - "arabicText": High-quality natural Arabic translation (العربية).

Return ONLY valid JSON with no extra commentary or markdown formatting outside the JSON object:
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
    model: 'gemini-2.0-flash',
    contents: [
      fileState,
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

// 2. AI Processing Pipeline Endpoint
app.post('/api/process', async (req, res) => {
  const { projectId, projectName, projectType, mediaTitle, apiKey } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const projectDir = path.join(UPLOADS_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project directory not found' });
  }

  const videoPath = path.join(projectDir, 'video.mp4');

  try {
    // Perform Real Gemini AI Video Processing
    const subtitles = await processVideoWithGemini(videoPath, apiKey);

    // Save SRT content to disk
    let srtContent = '';
    subtitles.forEach((sub, idx) => {
      srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.japaneseText}\n${sub.englishText}\n${sub.arabicText}\n\n`;
    });

    const srtPath = path.join(projectDir, 'subtitle.srt');
    fs.writeFileSync(srtPath, srtContent, 'utf8');

    const projectState = {
      id: projectId,
      projectName: projectName || 'Untitled Subtie Project',
      projectType: projectType || 'Episode',
      mediaTitle: mediaTitle || 'Untitled Video',
      videoUrl: `/uploads/${projectId}/video.mp4`,
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
    console.error('AI Processing error:', err.message);

    if (err.message === 'GEMINI_API_KEY_MISSING') {
      return res.status(400).json({
        error: 'GEMINI_API_KEY_MISSING',
        message: 'A valid Gemini API Key is required to process the video with real AI. Please enter your Gemini API Key.'
      });
    }

    return res.status(500).json({
      error: 'GEMINI_PROCESSING_FAILED',
      message: `Gemini AI Video Processing failed: ${err.message}`
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

  projectsList.forEach(proj => {
    if (proj.subtitles && Array.isArray(proj.subtitles)) {
      totalLines += proj.subtitles.length;
      approvedLines += proj.subtitles.filter(s => s.approved).length;
    }
  });

  res.json({
    success: true,
    stats: {
      totalProjects: projectsList.length,
      totalTranslatedLines: totalLines,
      approvedLines: approvedLines
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

  // Update SRT file on disk
  if (subtitles && Array.isArray(subtitles)) {
    const projectDir = path.join(UPLOADS_DIR, id);
    let srtContent = '';
    subtitles.forEach((sub, idx) => {
      srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.japaneseText}\n${sub.englishText}\n${sub.arabicText}\n\n`;
    });
    fs.writeFileSync(path.join(projectDir, 'subtitle.srt'), srtContent, 'utf8');
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

app.listen(PORT, () => {
  console.log(`Subtie Backend running on http://localhost:${PORT}`);
});
