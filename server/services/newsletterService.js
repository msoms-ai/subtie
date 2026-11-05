import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const NEWSLETTERS_FILE = path.join(DATA_DIR, 'newsletters.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readNewsletters() {
  ensureDataDir();
  try {
    if (!fs.existsSync(NEWSLETTERS_FILE)) {
      fs.writeFileSync(NEWSLETTERS_FILE, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(NEWSLETTERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[NewsletterService] Error reading newsletters:', err.message);
    return [];
  }
}

export function writeNewsletters(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(NEWSLETTERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[NewsletterService] Error writing newsletters:', err.message);
  }
}

/**
 * Generate newsletter HTML template using Gemini AI
 */
export async function generateNewsletterWithAI({ topic, tone = 'exciting', lang = 'ar', aiKey, modelName = 'gemini-3.8-flash' }) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: aiKey });
  const isAr = lang === 'ar';

  const systemPrompt = `You are a world-class creative email designer and copywriter for "Subtie" (منصة سابتاي), the premier AI-powered Anime Subtitling and Fansub Translation Platform.
Your task is to generate a complete, responsive, and visually stunning HTML newsletter based on the topic provided.

Rules:
1. Return a valid JSON object with keys:
   - "subject": A catchy, compelling email subject line (in ${isAr ? 'Arabic' : 'English'}).
   - "previewText": A 1-sentence preview preheader text.
   - "htmlContent": Full, production-ready, responsive HTML email code.
2. Email Design Requirements:
   - Responsive inline CSS compatible with Gmail, Apple Mail, and Outlook.
   - Direction: ${isAr ? 'RTL (dir="rtl") with Arabic typography (Cairo/Tahoma/sans-serif)' : 'LTR (dir="ltr") with modern sans-serif (Inter/Segoe UI/sans-serif)'}.
   - Dark modern aesthetic with purple, neon pink, and indigo accents matching the Subtie brand.
   - Header with Subtie Logo and tagline: "1st Anime AI Based Translator Platform" / "المنصة الأولى لترجمة الأنمي بالذكاء الاصطناعي".
   - Hero banner section with contextual subtitle/anime badges and high-contrast headlines.
   - Engaging body paragraphs, feature highlight cards with icons/emojis, and a vibrant Call-To-Action (CTA) button leading to "https://subtie.msoms.ai".
   - Contextual Anime Art Illustration / Graphic Placeholder (styled card with SVG or CSS gradient illustration).
   - Professional Footer:
     * Sent from: "noreply@subtie.msoms.ai"
     * Copyright notice (C) ${new Date().getFullYear()} Subtie Platform by MSOMS AI.
     * Working Unsubscribe link formatted as: <a href="https://subtie.msoms.ai/api/newsletter/unsubscribe?email={{EMAIL}}" style="color: #c084fc; text-decoration: underline;">${isAr ? 'إلغاء الاشتراك' : 'Unsubscribe'}</a>
3. Tone: ${tone}.
4. Return ONLY the raw JSON object, without markdown ticks.`;

  const userPrompt = `Topic to write newsletter about:\n${topic}\nTarget Language: ${isAr ? 'Arabic (العربية)' : 'English'}`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ],
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192
    }
  });

  const rawText = (response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(rawText);

  return {
    subject: parsed.subject || (isAr ? 'جديد منصة Subtie لترجمة الأنمي' : 'Latest News from Subtie Platform'),
    previewText: parsed.previewText || '',
    htmlContent: parsed.htmlContent || ''
  };
}

export default {
  readNewsletters,
  writeNewsletters,
  generateNewsletterWithAI
};
