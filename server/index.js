import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, JSON.stringify({}), 'utf8');

// Serve uploaded video and subtitle files statically
app.use('/uploads', express.static(UPLOADS_DIR));

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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for MVP video uploads
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

// 2. Mock AI Processing Pipeline Endpoint (Japanese ASR -> Arabic Translation -> Character Detection -> SRT output)
app.post('/api/process', async (req, res) => {
  const { projectId, animeName, season, episodeNum, episodeTitle } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const projectDir = path.join(UPLOADS_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project directory not found' });
  }

  // Pre-configured realistic mock subtitle lines for Anime Fan Translators
  const mockSubtitles = [
    {
      id: 1,
      startTime: "00:00:03,500",
      endTime: "00:00:06,800",
      startSeconds: 3.5,
      endSeconds: 6.8,
      japaneseText: "海賊王に、俺はなる！",
      arabicText: "سأصبح ملك القراصنة!",
      verified: false
    },
    {
      id: 2,
      startTime: "00:00:07,200",
      endTime: "00:00:10,500",
      startSeconds: 7.2,
      endSeconds: 10.5,
      japaneseText: "諦めるな！仲間が待っているんだ！",
      arabicText: "لا تستسلم! رفاقك في انتظارك!",
      verified: true
    },
    {
      id: 3,
      startTime: "00:00:11,100",
      endTime: "00:00:15,000",
      startSeconds: 11.1,
      endSeconds: 15.0,
      japaneseText: "この世界には、まだ見ぬ秘宝が眠っている。",
      arabicText: "في هذا العالم، لا تزال هناك كنز مخفي ينتظر اكتشافه.",
      verified: false
    },
    {
      id: 4,
      startTime: "00:00:15,600",
      endTime: "00:00:19,400",
      startSeconds: 15.6,
      endSeconds: 19.4,
      japaneseText: "さあ、出航の時だ！風が吹いている！",
      arabicText: "هيا بنا، حان وقت الإبحار! الرياح تهب لصالحنا!",
      verified: false
    },
    {
      id: 5,
      startTime: "00:00:20,000",
      endTime: "00:00:24,200",
      startSeconds: 20.0,
      endSeconds: 24.2,
      japaneseText: "約束は必ず果たす。それが俺たちの流儀だ。",
      arabicText: "سنفي بالوعد دون شك. هذا هو أسلوبنا وطريقتنا.",
      verified: true
    },
    {
      id: 6,
      startTime: "00:00:25,000",
      endTime: "00:00:29,800",
      startSeconds: 25.0,
      endSeconds: 29.8,
      japaneseText: "真実を確かめるために、俺たちは突き進む！",
      arabicText: "من أجل معرفة الحقيقة، سنواصل التقدم إلى الأمام!",
      verified: false
    }
  ];

  // Character detection results
  const mockCharacters = [
    {
      id: 'c1',
      name: 'Luffy / ルフィ',
      title: 'Main Protagonist & Captain',
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'c2',
      name: 'Zoro / ゾロ',
      title: 'Combatant & Swordsman',
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'c3',
      name: 'Nami / ナミ',
      title: 'Navigator & Strategist',
      image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80'
    }
  ];

  // Build SRT Content
  let srtContent = '';
  mockSubtitles.forEach((sub, idx) => {
    srtContent += `${idx + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.japaneseText}\n${sub.arabicText}\n\n`;
  });

  const srtPath = path.join(projectDir, 'subtitle.srt');
  fs.writeFileSync(srtPath, srtContent, 'utf8');

  const projectState = {
    id: projectId,
    animeName: animeName || 'Sample Anime',
    season: season || '1',
    episodeNum: episodeNum || '1',
    episodeTitle: episodeTitle || 'The Dawn of Adventure',
    videoUrl: `/uploads/${projectId}/video.mp4`,
    srtUrl: `/uploads/${projectId}/subtitle.srt`,
    subtitles: mockSubtitles,
    characters: mockCharacters,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const projects = readProjects();
  projects[projectId] = projectState;
  writeProjects(projects);

  res.json({
    success: true,
    project: projectState
  });
});

// 3. Get Project by ID
app.get('/api/project/:id', (req, res) => {
  const projects = readProjects();
  const project = projects[req.params.id];

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ success: true, project });
});

// 4. Save Project State
app.post('/api/project/:id/save', (req, res) => {
  const { id } = req.params;
  const { subtitles, characters, animeName, episodeTitle } = req.body;

  const projects = readProjects();
  if (!projects[id]) {
    return res.status(404).json({ error: 'Project not found' });
  }

  projects[id] = {
    ...projects[id],
    ...(subtitles && { subtitles }),
    ...(characters && { characters }),
    ...(animeName && { animeName }),
    ...(episodeTitle && { episodeTitle }),
    updatedAt: new Date().toISOString()
  };

  writeProjects(projects);

  res.json({ success: true, project: projects[id] });
});

// 5. Trusted Anime Titles Autocomplete API (AniList Proxy + Local Fallback)
app.get('/api/anime-search', async (req, res) => {
  const query = req.query.q || '';

  const fallbackList = [
    'One Piece', 'Attack on Titan', 'Naruto Shippuden', 'Demon Slayer: Kimetsu no Yaiba',
    'Jujutsu Kaisen', 'Bleach: Thousand-Year Blood War', 'My Hero Academia', 'Fullmetal Alchemist: Brotherhood',
    'Death Note', 'Hunter x Hunter', 'Steins;Gate', 'Frieren: Beyond Journey\'s End',
    'Vinland Saga', 'Chainsaw Man', 'Dragon Ball Super', 'Code Geass', 'Tokyo Ghoul', 'Solo Leveling'
  ];

  if (!query) {
    return res.json({ results: fallbackList.slice(0, 8) });
  }

  try {
    const aniListQuery = `
      query ($search: String) {
        Page(perPage: 8) {
          media(search: $search, type: ANIME) {
            title {
              romaji
              english
              native
            }
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: aniListQuery,
        variables: { search: query }
      })
    });

    const data = await response.json();
    const media = data?.data?.Page?.media || [];
    const titles = media.map(m => m.title.english || m.title.romaji || m.title.native).filter(Boolean);

    if (titles.length > 0) {
      return res.json({ results: titles });
    }
  } catch (err) {
    console.error('AniList API lookup failed, returning filtered fallback list');
  }

  const filtered = fallbackList.filter(title => title.toLowerCase().includes(query.toLowerCase()));
  res.json({ results: filtered });
});

app.listen(PORT, () => {
  console.log(`Subtie Backend running on http://localhost:${PORT}`);
});
