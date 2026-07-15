import IORedis from 'ioredis';

// BullMQ exige `maxRetriesPerRequest: null` en la conexión que le pasamos:
// gestiona sus propios reintentos y necesita que ioredis no interfiera.
export const redisConnection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
