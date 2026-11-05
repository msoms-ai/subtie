import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});

async function run() {
  try {
    const models = await ai.models.list();
    console.log("AVAILABLE MODELS:");
    for await (const model of models) {
      if (model.name.includes('gemini')) {
        console.log(model.name);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
