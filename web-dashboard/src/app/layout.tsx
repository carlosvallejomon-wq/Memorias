import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

// El panel de administración nunca debe indexarse (mismo criterio de
// privacidad que el resto de la plataforma).
export const metadata: Metadata = {
  title: 'Memorias Vivas — Panel de administración',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
