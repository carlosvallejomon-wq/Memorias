import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Solo el panel del organizador pasa por Clerk. Los invitados (/a/...), la
// portada y las APIs públicas nunca tocan el middleware de autenticación:
// así un invitado jamás es redirigido a una pantalla de login.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api/albums(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/dashboard(.*)", "/api/albums(.*)"],
};
