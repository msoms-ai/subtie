import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6380;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 1000, 3000);
  },
};

export const redisConnection = new Redis(redisConfig);
const redisSubscriber = new Redis(redisConfig);
const redisPublisher = new Redis(redisConfig);

let isRedisConnected = false;

redisConnection.connect().then(() => {
  isRedisConnected = true;
  console.log(`⚡ Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
}).catch(err => {
  console.warn(`⚠️ Redis is currently offline at ${REDIS_HOST}:${REDIS_PORT} (${err.message}). Queue jobs will wait or run in-process.`);
});

redisConnection.on('error', () => {});
redisSubscriber.on('error', () => {});
redisPublisher.on('error', () => {});

export const subtitleQueue = new Queue('subtie-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

subtitleQueue.on('error', () => {});

export const subtitleQueueEvents = new QueueEvents('subtie-processing', {
  connection: redisConnection,
});

subtitleQueueEvents.on('error', () => {});

// Inter-process Pub/Sub Event Bus for Real-Time Socket.io Bridge
export function publishProgress(projectId, data) {
  try {
    if (redisPublisher.status === 'ready' || redisPublisher.status === 'connect') {
      redisPublisher.publish('subtie:progress', JSON.stringify({ projectId, data }));
    }
  } catch (err) {
    console.warn('[Queue Event Bus] Failed to publish progress:', err.message);
  }
}

export function subscribeProgress(handler) {
  try {
    if (!redisSubscriber.status || redisSubscriber.status === 'wait') {
      redisSubscriber.connect().catch(() => {});
    }
    redisSubscriber.subscribe('subtie:progress', (err) => {
      if (err) console.error('[Queue Event Bus] Failed to subscribe to progress channel:', err.message);
    });
    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'subtie:progress') {
        try {
          const { projectId, data } = JSON.parse(message);
          handler(projectId, data);
        } catch (_) {}
      }
    });
  } catch (err) {
    console.warn('[Queue Event Bus] Subscribe error:', err.message);
  }
}

class QueueService {
  isAvailable() {
    return isRedisConnected && redisConnection.status === 'ready';
  }

  /**
   * Enqueues a project for audio extraction & translation
   */
  async addJob(jobData) {
    const job = await subtitleQueue.add('process-video', jobData, {
      jobId: jobData.projectId, // Guarantee idempotency: 1 job per project ID
    });
    return {
      jobId: job.id,
      status: 'queued',
    };
  }

  async getJobStatus(projectId) {
    try {
      const job = await subtitleQueue.getJob(projectId);
      if (!job) return null;
      const state = await job.getState();
      const progress = job.progress || 0;
      return { id: job.id, state, progress, data: job.data };
    } catch (_) {
      return null;
    }
  }

  /**
   * Retrieves live metrics for the Admin Dashboard with strict timeout protection
   */
  async getMetrics() {
    if (!this.isAvailable()) {
      return { status: 'offline', host: `${REDIS_HOST}:${REDIS_PORT}`, waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis metrics timeout')), 800)
      );

      const countsPromise = Promise.all([
        subtitleQueue.getWaitingCount(),
        subtitleQueue.getActiveCount(),
        subtitleQueue.getCompletedCount(),
        subtitleQueue.getFailedCount(),
      ]);

      const [waiting, active, completed, failed] = await Promise.race([countsPromise, timeoutPromise]);

      return {
        status: 'online',
        host: `${REDIS_HOST}:${REDIS_PORT}`,
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
      };
    } catch (err) {
      return { status: 'offline', host: `${REDIS_HOST}:${REDIS_PORT}`, waiting: 0, active: 0, completed: 0, failed: 0 };
    }
  }
}

export const queueService = new QueueService();
export default queueService;
