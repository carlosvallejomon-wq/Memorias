import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { detectFacesAndEmbedding } from '../../ai/face-recognition.service';
import { db } from '../../db';
import { media } from '../../db/schema';
import { MEDIA_PROCESSING_QUEUE, type MediaProcessingJob } from '../queues';
import { redisConnection } from '../redis';

// Procesa cada foto subida: detecta rostros y genera el embedding semántico
// que alimenta la búsqueda "foto de la abuela en la playa" (pgvector).
export const mediaProcessingWorker = new Worker<MediaProcessingJob>(
  MEDIA_PROCESSING_QUEUE,
  async (job) => {
    const row = await db.query.media.findFirst({ where: eq(media.id, job.data.mediaId) });
    if (!row || row.type !== 'IMAGE') return;

    const { faces, embedding } = await detectFacesAndEmbedding(row.url);

    await db.update(media).set({ faces, embedding }).where(eq(media.id, row.id));
  },
  { connection: redisConnection },
);
