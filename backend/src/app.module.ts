import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DbModule } from './db/db.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    StorageModule,
    ChatModule,
  ],
})
export class AppModule {}
