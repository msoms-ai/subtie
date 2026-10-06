import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({}); // Assumes GEMINI_API_KEY is in env

async function run() {
  try {
    const models = await ai.models.list();
    console.log("AVAILABLE MODELS:");
    for await (const model of models) {
      if (model.name.includes('gemini-1.5')) {
        console.log(model.name);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
