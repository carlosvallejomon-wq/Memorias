import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ClerkAuth } from './clerk-auth.guard';

// Uso: async me(@CurrentUser() auth: ClerkAuth) { ... } en una ruta protegida por ClerkAuthGuard.
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): ClerkAuth => {
  const request = ctx.switchToHttp().getRequest<{ auth: ClerkAuth }>();
  return request.auth;
});
