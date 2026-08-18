import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const envPath = './server/.env';
let apiKey = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const m = content.match(/GEMINI_API_KEY=["']?(.*?)["']?$/m);
  if (m) apiKey = m[1].trim();
}

console.log('Testing Gemini API key:', apiKey ? (apiKey.substring(0, 10) + '...') : 'NONE FOUND');

const ai = new GoogleGenAI({ apiKey });

async function testAudioProcessing() {
  const sampleAudio = 'server/uploads/subtie_1786821665538_2veno/audio.mp3';
  if (!fs.existsSync(sampleAudio)) {
    console.error('Sample audio file not found at:', sampleAudio);
    return;
  }

  try {
    console.log('Uploading sample audio to Gemini Files API...');
    const uploadResult = await ai.files.upload({
      file: sampleAudio,
      mimeType: 'audio/mp3'
    });
    console.log('Uploaded file:', uploadResult.name);

    let fileState = uploadResult;
    let attempts = 0;
    while (fileState.state === 'PROCESSING' && attempts < 60) {
      await new Promise(r => setTimeout(r, 2000));
      fileState = await ai.files.get({ name: uploadResult.name });
      attempts++;
    }

    console.log('File state:', fileState.state);

    const prompt = 'Transcribe spoken dialogue into Japanese, English, and Arabic. Return JSON with "subtitles".';

    console.log('Generating content with model: gemini-flash-latest...');
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
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

    console.log('RESPONSE SUCCESS:', response.text.substring(0, 300));
  } catch (err) {
    console.error('AUDIO TEST ERROR:', err);
  }
}

testAudioProcessing();
