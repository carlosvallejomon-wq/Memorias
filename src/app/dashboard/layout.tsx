import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";

// Clerk solo envuelve el panel del organizador; las páginas de invitados no
// cargan nada de Clerk.
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClerkProvider localization={esES}>{children}</ClerkProvider>;
}
