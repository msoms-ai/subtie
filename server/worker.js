import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection, publishProgress } from './services/queue.js';
import { processVideoJob } from './services/videoPipeline.js';
import { logSystemEvent } from './services/logService.js';
import db from './services/db.js';

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 2;

console.log(`========================================================`);
console.log(`🚀 [Subtie Microservice Worker] Starting BullMQ Worker...`);
console.log(`⚙️ Concurrency: ${CONCURRENCY} parallel video pipelines`);
console.log(`📦 Node Version: ${process.version}`);
console.log(`========================================================`);

export const worker = new Worker(
  'subtie-processing',
  async (job) => {
    const { projectId, videoDurationSecs, userId } = job.data;
    console.log(`\n📥 [Worker] Claimed job #${job.id} for project: ${projectId}`);

    // Progress reporter bridging BullMQ and Redis Pub/Sub
    const emitProgress = (extract, transcode, translate, status, overall, stage) => {
      try {
        job.updateProgress(overall || 0);
      } catch (_) {}

      publishProgress(projectId, {
        progress: overall || 0,
        status: status || '',
        stage: stage || 'processing',
        progressExtract: extract || 0,
        progressTranscode: transcode || 0,
        progressTranslate: translate || 0
      });
    };

    try {
      emitProgress(5, 0, 0, 'Worker claimed job. Preparing media pipeline...', 5, 'queued');

      const result = await processVideoJob(job.data, emitProgress);

      console.log(`✅ [Worker] Successfully completed job #${job.id} for project ${projectId} (${result.subtitlesCount} lines)`);
      return result;
    } catch (err) {
      console.error(`❌ [Worker Error] Job #${job.id} for project ${projectId} failed:`, err.message);

      logSystemEvent('error', 'video_proc', `Worker job failed for ${projectId}: ${err.message}`, {
        jobId: job.id,
        projectId,
        error: err.message,
        stack: err.stack?.slice(0, 500)
      });

      // Update project error state in DB
      try {
        const freshDb = db.readProjects();
        if (freshDb[projectId]) {
          freshDb[projectId].status = 'failed';
          freshDb[projectId].processingStatus = `فشل في معالجة الفيديو: ${err.message}`;
          freshDb[projectId].error = err.message;
          freshDb[projectId].updatedAt = new Date().toISOString();
          db.writeProjects(freshDb);
        }
      } catch (_) {}

      publishProgress(projectId, {
        progress: 0,
        status: `فشل في معالجة الفيديو: ${err.message}`,
        stage: 'process_failed',
        error: err.message
      });

      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
    lockDuration: 300000, // 5 minutes lock duration for large 1GB video processing
    stalledInterval: 30000,
    maxStalledCount: 2
  }
);

worker.on('ready', () => {
  console.log('⚡ [Worker Ready] Connected to Redis and waiting for video processing jobs...');
});

worker.on('completed', (job) => {
  console.log(`🎉 [Worker Event] Job ${job.id} marked COMPLETED.`);
});

worker.on('failed', (job, err) => {
  console.error(`💥 [Worker Event] Job ${job?.id} failed with error: ${err?.message}`);
});

worker.on('error', (err) => {
  console.error('⚠️ [Worker System Error]:', err.message);
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🛑 [Worker] Received ${signal}. Closing worker gracefully...`);
  try {
    await worker.close();
    console.log('✅ [Worker] Closed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error during worker shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
