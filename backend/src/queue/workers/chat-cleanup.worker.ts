import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { chatMessages } from '../../db/schema';
import { CHAT_CLEANUP_QUEUE, type ChatCleanupJob } from '../queues';
import { redisConnection } from '../redis';

// Borra mensajes efímeros pasadas las 24h. El delay se fija al encolar el
// job (ver ChatGateway), no aquí — este worker solo ejecuta el borrado.
export const chatCleanupWorker = new Worker<ChatCleanupJob>(
  CHAT_CLEANUP_QUEUE,
  async (job) => {
    await db.delete(chatMessages).where(eq(chatMessages.id, job.data.messageId));
  },
  { connection: redisConnection },
);
