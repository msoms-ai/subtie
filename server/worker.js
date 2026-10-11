import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from './services/queue.js';
import storage from './services/storage.js';
import geminiPool from './services/geminiPool.js';
import socketService from './services/socket.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 2;

console.log(`🚀 Starting Subtie Background Worker [Concurrency: ${CONCURRENCY}]...`);

export const worker = new Worker(
  'subtie-processing',
  async (job) => {
    const { projectId, videoPath, targetLang, projectTitle } = job.data;
    console.log(`[Worker] Claimed job for project ${projectId} (${projectTitle})`);

    // 1. Notify UI: Job claimed, starting audio extraction
    job.updateProgress(10);
    socketService.emitProgress(projectId, {
      stage: 'extracting',
      progress: 10,
      message: 'Worker claimed job. Extracting high-fidelity audio...',
    });

    const tempDir = path.resolve('temp', `job_${projectId}`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const localVideo = path.resolve(videoPath);
    const extractedAudioPath = path.join(tempDir, 'audio.mp3');

    try {
      // 2. FFmpeg Extraction
      await new Promise((resolve, reject) => {
        ffmpeg(localVideo)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioChannels(1)
          .audioFrequency(16000)
          .on('progress', (p) => {
            const pct = Math.min(40, 10 + Math.round((p.percent || 0) * 0.3));
            job.updateProgress(pct);
            socketService.emitProgress(projectId, {
              stage: 'extracting',
              progress: pct,
              message: `Extracting Japanese audio track (${Math.round(p.percent || 0)}%)...`,
            });
          })
          .on('end', resolve)
          .on('error', reject)
          .save(extractedAudioPath);
      });

      console.log(`[Worker] Audio extraction completed for project ${projectId}`);
      job.updateProgress(45);
      socketService.emitProgress(projectId, {
        stage: 'translating',
        progress: 45,
        message: 'Audio extracted successfully. Submitting to Gemini AI Pool...',
      });

      // 3. Acquire Gemini Key from Pool
      const { keyId, rawKey, client } = geminiPool.acquireKey();

      try {
        // Read audio for Gemini upload / processing
        const audioBuffer = fs.readFileSync(extractedAudioPath);
        const base64Audio = audioBuffer.toString('base64');

        const prompt = `You are an expert anime subtitle translator.
Transcribe the spoken Japanese dialogue and translate it accurately into Arabic subtitles.
Target Language: Arabic (${targetLang || 'ar'}).
Output valid SRT formatted subtitle blocks only.`;

        // Request Gemini translation
        const response = await client.models.generateContent({
          model: 'gemini-1.5-pro',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'audio/mp3', data: base64Audio } },
                { text: prompt },
              ],
            },
          ],
        });

        const srtContent = response.text || '';
        geminiPool.releaseKey(keyId, true);

        // 4. Save Final SRT Result to Project
        const outputSrtPath = path.resolve('uploads', `${projectId}.srt`);
        fs.writeFileSync(outputSrtPath, srtContent, 'utf-8');

        // Cleanup temporary files
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }

        job.updateProgress(100);
        socketService.emitProgress(projectId, {
          stage: 'completed',
          progress: 100,
          srtPath: `/uploads/${projectId}.srt`,
          message: 'Subtitle generation and translation completed successfully!',
        });

        console.log(`[Worker] Job ${job.id} completed successfully!`);
        return { success: true, projectId, srtPath: outputSrtPath };
      } catch (geminiError) {
        geminiPool.releaseKey(keyId, false, geminiError);
        throw geminiError;
      }
    } catch (err) {
      console.error(`[Worker] Job ${job.id} failed:`, err);
      socketService.emitProgress(projectId, {
        stage: 'failed',
        progress: 0,
        error: err.message,
        message: 'Processing encountered an error. Queuing automatic retry...',
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  }
);

worker.on('completed', (job) => {
  console.log(`✅ [Worker] Finished job ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ [Worker] Job ${job?.id} failed with: ${err.message}`);
});
