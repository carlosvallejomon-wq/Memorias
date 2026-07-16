import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">Memorias Vivas</h1>
      <p className="text-ink/70 dark:text-cream/70">
        Panel de administración para organizadores de álbumes.
      </p>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-full bg-amber-500 px-6 py-2 font-medium text-white hover:bg-amber-600">
            Iniciar sesión
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="rounded-full bg-amber-500 px-6 py-2 font-medium text-white hover:bg-amber-600"
        >
          Ir al panel
        </Link>
      </SignedIn>
    </main>
  );
}
