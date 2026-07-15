import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { desc, eq } from 'drizzle-orm';
import type { Server, Socket } from 'socket.io';
import { z, ZodError } from 'zod';
import { resolveUserFromToken } from '../auth/resolve-user-from-token';
import { db } from '../db';
import { albums, chatMessages } from '../db/schema';
import { chatCleanupQueue } from '../queue/queues';

const EPHEMERAL_TTL_MS = 24 * 60 * 60 * 1000;
const HISTORY_LIMIT = 50;

const joinSchema = z.object({ accessToken: z.string().min(1) });

const sendMessageSchema = z.object({
  accessToken: z.string().min(1),
  content: z.string().min(1).max(1000),
  guestName: z.string().max(100).optional(),
  // JWT de sesión de Clerk, opcional: si viene y resuelve a un usuario,
  // el mensaje queda firmado como suyo en vez de como invitado anónimo.
  authToken: z.string().optional(),
  isEphemeral: z.boolean().default(false),
});

// Chat en tiempo real por álbum. Cada álbum es una "room" de Socket.IO
// (identificada por su id interno); el cliente se une aportando el
// accessToken del enlace mágico/QR — mismo modelo de acceso sin fricción
// que el resto de endpoints de invitados.
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<void> {
    try {
      const { accessToken } = joinSchema.parse(body);
      const album = await db.query.albums.findFirst({ where: eq(albums.accessToken, accessToken) });
      if (!album) {
        client.emit('error', { message: 'Álbum no encontrado o enlace caducado' });
        return;
      }

      await client.join(album.id);

      const recentMessages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.albumId, album.id),
        orderBy: (fields) => desc(fields.createdAt),
        limit: HISTORY_LIMIT,
      });

      client.emit('history', recentMessages.reverse());
    } catch (error) {
      this.emitValidationError(client, error);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<void> {
    try {
      const input = sendMessageSchema.parse(body);
      const album = await db.query.albums.findFirst({ where: eq(albums.accessToken, input.accessToken) });
      if (!album) {
        client.emit('error', { message: 'Álbum no encontrado o enlace caducado' });
        return;
      }

      const user = await resolveUserFromToken(input.authToken);

      const [created] = await db
        .insert(chatMessages)
        .values({
          albumId: album.id,
          userId: user?.id,
          guestName: user ? null : input.guestName,
          content: input.content,
          isEphemeral: input.isEphemeral,
        })
        .returning();

      this.server.to(album.id).emit('message', created);

      if (created.isEphemeral) {
        await chatCleanupQueue.add('delete-ephemeral', { messageId: created.id }, { delay: EPHEMERAL_TTL_MS });
      }
    } catch (error) {
      this.emitValidationError(client, error);
    }
  }

  private emitValidationError(client: Socket, error: unknown): void {
    if (error instanceof ZodError) {
      client.emit('error', { message: 'Datos inválidos', issues: error.issues });
      return;
    }
    this.logger.error(error);
    client.emit('error', { message: 'Error interno' });
  }
}
