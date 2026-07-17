import Link from "next/link";
import {
  Camera,
  QrCode,
  MonitorPlay,
  Heart,
  CalendarDays,
  ShieldCheck,
  BookOpen,
  Sparkles,
  ArrowRight,
  Play,
} from "lucide-react";

const FEATURES = [
  {
    icon: QrCode,
    title: "Un QR y listo",
    text: "Tus invitados escanean o abren un enlace y suben fotos al momento — sin instalar nada ni crear cuenta.",
  },
  {
    icon: MonitorPlay,
    title: "Modo pantalla en vivo",
    text: "Conecta una TV o proyector en el evento y ve aparecer las fotos de los invitados en tiempo real.",
  },
  {
    icon: Heart,
    title: "Reacciones y comentarios",
    text: "Todo el mundo puede reaccionar y dejar comentarios en cada foto, como en redes sociales.",
  },
  {
    icon: CalendarDays,
    title: "Organizado por días",
    text: "El contenido se ordena solo por fecha, con una vista especial para revivir el evento día a día.",
  },
  {
    icon: ShieldCheck,
    title: "Moderación opcional",
    text: "Si quieres, revisa cada foto antes de que se publique — tú decides qué se comparte.",
  },
  {
    icon: BookOpen,
    title: "Dotbook digital",
    text: "Convierte el álbum en un PDF con una página por recuerdo, listo para guardar o imprimir.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Crea tu álbum",
    text: "Ponle nombre y fecha a tu boda, cumpleaños o viaje. Tarda menos de un minuto.",
  },
  {
    n: "2",
    title: "Comparte el QR",
    text: "Imprímelo en las mesas o mándalo por WhatsApp. Cualquiera puede unirse al instante.",
  },
  {
    n: "3",
    title: "Los recuerdos aparecen solos",
    text: "Cada foto y vídeo se organiza en la galería en cuanto se sube — tú solo disfruta el momento.",
  },
];

function PhoneMockup() {
  const tiles = [
    "from-teja to-teja-oscuro",
    "from-vino to-tinta",
    "from-oro to-teja",
    "from-tinta to-vino",
    "from-teja-oscuro to-oro",
    "from-vino to-teja",
  ];
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="glass animate-fade-in relative rounded-[2.5rem] p-3">
        <div className="rounded-[2rem] bg-white/70 p-3">
          <div className="flex items-center gap-1.5 px-1 pb-3 text-xs font-semibold text-tinta/70">
            <Camera size={13} /> Boda de Ana y Luis
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {tiles.map((g, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg bg-gradient-to-br shadow-soft ${g}`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <div className="shimmer flex items-center gap-1.5 rounded-full bg-teja px-4 py-2 text-xs font-semibold text-white shadow-soft">
              <Camera size={13} /> Subir fotos
            </div>
          </div>
        </div>
      </div>

      <div className="glass-dark animate-fade-in absolute -right-6 -top-6 flex items-center gap-2 rounded-2xl px-3 py-2 text-white shadow-lift sm:-right-10">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teja opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teja" />
        </span>
        <MonitorPlay size={16} />
        <span className="text-xs font-semibold">En vivo en pantalla</span>
      </div>

      <div className="glass animate-fade-in absolute -bottom-4 -left-6 flex items-center gap-1.5 rounded-2xl px-3 py-2 shadow-lift sm:-left-10">
        <span className="text-lg">❤️</span>
        <span className="text-lg">😂</span>
        <span className="text-lg">👏</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pb-20 pt-16 lg:flex-row lg:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teja/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-vino/10 blur-3xl"
        />

        <div className="relative flex-1 text-center lg:text-left">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-arena px-3 py-1 text-sm font-semibold text-teja-oscuro">
            <Sparkles size={14} /> Para bodas, cumpleaños y viajes
          </p>
          <h1
            className="mt-5 text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Todas las fotos de tu evento, en un solo sitio
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-tinta/70 lg:mx-0">
            Crea un álbum, comparte el código QR y deja que tus invitados suban
            sus fotos y vídeos desde el móvil —{" "}
            <strong>sin instalar nada y sin registrarse</strong>.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/dashboard"
              className="shimmer flex items-center gap-2 rounded-full bg-teja px-8 py-3.5 text-lg font-semibold text-white shadow-lift transition hover:bg-teja-oscuro"
            >
              Crear mi álbum <ArrowRight size={18} />
            </Link>
            <a
              href="#como-funciona"
              className="flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-8 py-3.5 text-lg font-semibold text-tinta shadow-soft transition hover:bg-arena"
            >
              <Play size={16} /> Cómo funciona
            </a>
          </div>
          <p className="mt-6 text-sm text-tinta/50">
            ¿Te han invitado a un álbum? Abre el enlace o escanea el QR que te
            haya pasado el organizador: no necesitas cuenta.
          </p>
        </div>

        <div className="relative flex-1">
          <PhoneMockup />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2
            className="text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Todo lo que necesitas, nada de lo que sobra
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-tinta/60">
            Pensado para que cualquier invitado, sin importar la edad o la
            destreza con el móvil, participe en menos de 10 segundos.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card-interactive rounded-2xl border border-tinta/10 bg-white p-6 shadow-soft"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teja/10 text-teja">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-tinta/60">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-arena/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2
            className="text-center text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cómo funciona
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teja text-2xl font-semibold text-white shadow-lift"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-tinta/60">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2
          className="text-3xl font-semibold sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tu próximo evento merece algo mejor que un chat lleno de fotos
        </h2>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="shimmer inline-flex items-center gap-2 rounded-full bg-teja px-8 py-3.5 text-lg font-semibold text-white shadow-lift transition hover:bg-teja-oscuro"
          >
            Crear mi álbum gratis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-tinta/10 px-6 py-8 text-center text-sm text-tinta/40">
        <p className="flex items-center justify-center gap-1.5">
          <Camera size={14} /> Memorias Vivas
        </p>
      </footer>
    </main>
  );
}
