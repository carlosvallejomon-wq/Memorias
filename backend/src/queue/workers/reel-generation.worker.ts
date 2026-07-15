import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Worker } from 'bullmq';
import { and, asc, eq } from 'drizzle-orm';
import { generateHighlightReel } from '../../ai/reel-generator';
import { db } from '../../db';
import { albums, media } from '../../db/schema';
import { uploadObject } from '../../storage';
import { REEL_GENERATION_QUEUE, type ReelGenerationJob } from '../queues';
import { redisConnection } from '../redis';

const MAX_PHOTOS_PER_REEL = 20;

export const reelGenerationWorker = new Worker<ReelGenerationJob>(
  REEL_GENERATION_QUEUE,
  async (job) => {
    const albumPhotos = await db.query.media.findMany({
      where: and(eq(media.albumId, job.data.albumId), eq(media.type, 'IMAGE')),
      orderBy: (fields) => asc(fields.exifDate),
      limit: MAX_PHOTOS_PER_REEL,
    });

    if (albumPhotos.length === 0) return;

    const outputPath = path.join(tmpdir(), `reel-${job.data.albumId}-${Date.now()}.mp4`);

    try {
      await generateHighlightReel(
        albumPhotos.map((photo) => ({ url: photo.url })),
        outputPath,
      );

      const buffer = await readFile(outputPath);
      const reelUrl = await uploadObject(`albums/${job.data.albumId}/reel.mp4`, buffer, 'video/mp4');

      await db.update(albums).set({ highlightReelUrl: reelUrl }).where(eq(albums.id, job.data.albumId));
    } finally {
      await rm(outputPath, { force: true });
    }
  },
  { connection: redisConnection },
);
