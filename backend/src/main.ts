import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './chat/redis-io.adapter';
import { appRouter } from './trpc/app.router';
import { createContext } from './trpc/trpc.context';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  // El contenido de los álbumes es privado por diseño: nunca debe indexarse.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  // tRPC vive junto a los controladores REST de Nest (p. ej. /auth/me),
  // montado como middleware de Express bajo /trpc.
  app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

void bootstrap();
