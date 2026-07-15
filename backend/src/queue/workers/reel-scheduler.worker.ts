import { Worker } from 'bullmq';
import { gte } from 'drizzle-orm';
import { db } from '../../db';
import { media } from '../../db/schema';
import { reelGenerationQueue, REEL_SCHEDULER_QUEUE } from '../queues';
import { redisConnection } from '../redis';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Se dispara semanalmente (job repetitivo programado en worker.ts) y encola
// un reel-generation por cada álbum con actividad reciente, en vez de
// regenerar el reel de todos los álbumes cada semana.
export const reelSchedulerWorker = new Worker(
  REEL_SCHEDULER_QUEUE,
  async () => {
    const since = new Date(Date.now() - ONE_WEEK_MS);

    const activeAlbums = await db
      .selectDistinct({ albumId: media.albumId })
      .from(media)
      .where(gte(media.createdAt, since));

    await Promise.all(
      activeAlbums.map(({ albumId }) => reelGenerationQueue.add('generate-reel', { albumId })),
    );
  },
  { connection: redisConnection },
);
