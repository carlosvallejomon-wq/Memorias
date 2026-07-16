import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">📸</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Memorias Vivas
      </h1>
      <p className="mt-4 text-lg text-tinta/70">
        Crea un álbum para tu boda, cumpleaños o viaje, comparte el código QR y
        deja que tus invitados suban sus fotos y vídeos desde el móvil —{" "}
        <strong>sin instalar nada y sin registrarse</strong>.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-full bg-teja px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-teja-oscuro"
        >
          Entrar al panel
        </Link>
      </div>
      <p className="mt-6 text-sm text-tinta/50">
        ¿Te han invitado a un álbum? Abre el enlace o escanea el QR que te haya
        pasado el organizador: no necesitas cuenta.
      </p>
    </main>
  );
}
