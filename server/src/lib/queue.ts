import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Shared Redis connection for BullMQ
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
});

// Queue name constant
export const PDF_QUEUE = 'pdf-ingestion';

// The queue — API pushes jobs here
export const pdfQueue = new Queue(PDF_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 50 },
    removeOnFail:    { count: 100 },
  },
});

// Queue events — for listening to progress updates (used by WebSocket)
export const pdfQueueEvents = new QueueEvents(PDF_QUEUE, {
  connection: new IORedis(REDIS_URL, { maxRetriesPerRequest: null }),
});
