import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const MEDIA_PROCESSING_QUEUE = 'media-processing';
export const REEL_GENERATION_QUEUE = 'reel-generation';
export const REEL_SCHEDULER_QUEUE = 'reel-scheduler';

export interface MediaProcessingJob {
  mediaId: string;
}

export interface ReelGenerationJob {
  albumId: string;
}

// Reconocimiento facial + embedding semántico de cada foto subida.
export const mediaProcessingQueue = new Queue<MediaProcessingJob>(MEDIA_PROCESSING_QUEUE, {
  connection: redisConnection,
});

// Renderizado del vídeo resumen ("highlight reel") de un álbum concreto.
export const reelGenerationQueue = new Queue<ReelGenerationJob>(REEL_GENERATION_QUEUE, {
  connection: redisConnection,
});

// Job repetitivo (semanal) que decide qué álbumes tienen actividad reciente
// y encola un reel-generation por cada uno, en vez de regenerarlos todos.
export const reelSchedulerQueue = new Queue(REEL_SCHEDULER_QUEUE, {
  connection: redisConnection,
});
