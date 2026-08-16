import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Solo el panel del organizador pasa por Clerk. Los invitados (/a/...), la
// portada y las APIs públicas nunca tocan el middleware de autenticación:
// así un invitado jamás es redirigido a una pantalla de login.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/albums(.*)",
  "/api/setup",
  "/api/diagnostico",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    signInUrl: "/sign-in",
    // La instancia de produccion usa el dominio corto de Vercel. Clerk pasa
    // sus solicitudes del navegador por esta ruta del mismo dominio.
    frontendApiProxy: {
      enabled: true,
    },
  },
);

export const config = {
  matcher: [
    "/dashboard(.*)",
    "/api/albums(.*)",
    "/api/setup",
    "/api/diagnostico",
    "/sign-up(.*)",
    "/sign-in(.*)",
    "/__clerk/(.*)",
  ],
};
