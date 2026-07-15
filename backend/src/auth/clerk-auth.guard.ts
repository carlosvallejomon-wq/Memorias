import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import type { Request } from 'express';

export interface ClerkAuth {
  clerkId: string;
}

// Verifica el JWT de sesión emitido por Clerk (enviado como `Authorization: Bearer <token>`)
// y adjunta la identidad resultante a la request para los controladores/decoradores.
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { auth?: ClerkAuth }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Falta el token de sesión de Clerk');
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.config.getOrThrow<string>('CLERK_SECRET_KEY'),
      });
      request.auth = { clerkId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Token de Clerk inválido o expirado');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }
}
