import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import { redisConnection } from '../queue/redis';

// Sin esto, los mensajes de chat solo llegarían a los clientes conectados a
// la misma instancia del proceso: con varias réplicas de la API detrás de
// un balanceador (el objetivo de escalar a millones de usuarios), cada
// instancia vería una sala de chat distinta. El adapter de Redis sincroniza
// los broadcasts de Socket.IO entre todas las instancias vía pub/sub.
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = redisConnection.duplicate();
    const subClient = redisConnection.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
