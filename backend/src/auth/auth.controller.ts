import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard, type ClerkAuth } from './clerk-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Endpoint de arranque de sesión: el cliente (web o Flutter) lo llama justo
  // tras el login de Clerk para obtener/crear el perfil local del usuario.
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async me(@CurrentUser() auth: ClerkAuth) {
    return this.authService.findOrCreateUser(auth.clerkId);
  }
}
