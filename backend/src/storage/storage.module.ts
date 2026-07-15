import { Global, Module } from '@nestjs/common';
import * as storage from './index';

export const STORAGE = Symbol('STORAGE');

// Expone el cliente de almacenamiento vía DI de Nest para los módulos que lo
// necesiten fuera de tRPC (p. ej. el futuro worker de BullMQ / servicio de IA).
@Global()
@Module({
  providers: [{ provide: STORAGE, useValue: storage }],
  exports: [STORAGE],
})
export class StorageModule {}
