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
  Lock,
  Target,
  PenLine,
  Printer,
  Link2,
  Check,
  Download,
  Users,
  Infinity as InfinityIcon,
  WifiOff,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import {
  CelebrationCarousel,
  InvitationDeck,
  LiveScreenMockup,
  PhoneGrid,
  Reveal,
  RetosMockup,
} from "@/components/LandingPieces";

const TRUST = [
  { icon: WifiOff, title: "Nada que instalar", text: "Se abre en el navegador del móvil" },
  { icon: Users, title: "Sin crear cuenta", text: "Solo tú necesitas registrarte" },
  { icon: InfinityIcon, title: "Sin límite de invitados", text: "Comparte el QR con quien quieras" },
];

const EVENTS = [
  { label: "Bodas", src: "/decor/boda.jpg" },
  { label: "Cumpleaños", src: "/decor/cumple.jpg" },
  { label: "15 años", src: "/decor/quince.jpg" },
  { label: "Comuniones", src: "/decor/comunion.jpg" },
  { label: "Bautizos", src: "/decor/bautizo.jpg" },
  { label: "Graduaciones", src: "/decor/graduacion.jpg" },
  { label: "Fiestas infantiles", src: "/decor/fiestainfantil.jpg" },
  { label: "Baby shower", src: "/decor/babyshower.jpg" },
  { label: "Familia", src: "/decor/familia.jpg" },
  { label: "Viajes", src: "/decor/viaje.jpg" },
  { label: "Navidad", src: "/decor/navidad.jpg" },
  { label: "Fin de año", src: "/decor/anonuevo.jpg" },
];

const FEATURES = [
  {
    icon: QrCode,
    title: "Un QR y listo",
    text: "Tus invitados escanean o abren un enlace y suben fotos al momento — sin instalar nada ni crear cuenta.",
  },
  {
    icon: Heart,
    title: "Reacciones y comentarios",
    text: "Todo el mundo puede reaccionar y comentar cada foto, como en redes sociales.",
  },
  {
    icon: CalendarDays,
    title: "Se ordena solo",
    text: "El contenido se coloca por fecha, con filtros por persona y una vista para revivir el evento día a día.",
  },
  {
    icon: ShieldCheck,
    title: "Moderación opcional",
    text: "Si quieres, revisa cada foto antes de que se publique — tú decides qué se comparte.",
  },
  {
    icon: Download,
    title: "Todo descargable",
    text: "Bájate el álbum entero en un ZIP, o deja que cada invitado guarde las fotos que le gusten.",
  },
];

const INVITATION_WAYS = [
  {
    icon: Printer,
    title: "Imprímela",
    text: "Se descarga en alta calidad, lista para imprimir en casa o llevar a la imprenta.",
  },
  {
    icon: Link2,
    title: "Mándala por WhatsApp",
    text: "Cada invitación tiene su propio enlace: se abre en el móvil sin instalar nada.",
  },
  {
    icon: QrCode,
    title: "O como código QR",
    text: "Un QR que abre la invitación, y otro que lleva directo al álbum de fotos del evento.",
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

const FAQ = [
  {
    q: "¿Mis invitados tienen que instalar algo o registrarse?",
    a: "No. Escanean el QR o abren el enlace y ya están dentro: pueden ver el álbum, subir fotos, reaccionar y comentar. Solo se les pide el nombre —y es opcional— para que se sepa quién compartió cada recuerdo.",
  },
  {
    q: "¿Funciona igual en iPhone y en Android?",
    a: "Sí. Es una página web normal, así que funciona en cualquier móvil, tablet u ordenador con navegador. También en móviles antiguos.",
  },
  {
    q: "¿Puedo revisar las fotos antes de que se vean?",
    a: "Sí. Activa la moderación en tu álbum y cada foto quedará en espera hasta que tú la apruebes. Quien la subió sí la ve, marcada como pendiente.",
  },
  {
    q: "¿Qué pasa si alguien sube algo que no quiero?",
    a: "Puedes borrar cualquier foto, vídeo o mensaje del álbum desde tu panel. Además, cada invitado puede borrar lo que él mismo subió.",
  },
  {
    q: "¿Puedo quedarme con todas las fotos?",
    a: "Sí: descarga el álbum completo en un ZIP, o genera el Dotbook en PDF con una página por recuerdo y las dedicatorias del muro de mensajes.",
  },
  {
    q: "¿Las invitaciones se pueden imprimir?",
    a: "Sí. La invitación se descarga como imagen en alta calidad, así que puedes imprimirla en casa o llevarla a una imprenta. Y si prefieres no imprimir nada, se manda por WhatsApp como enlace o como código QR.",
  },
  {
    q: "¿Los vídeos también valen?",
    a: "Sí, fotos y vídeos. En el Dotbook los vídeos aparecen con un código QR que lleva al vídeo original, porque un PDF no puede reproducirlos.",
  },
];

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* Marco realista de teléfono con barra de navegador, para que se
          entienda de un vistazo que es una web (nada que instalar). */}
      <div className="glass animate-fade-in relative rounded-[2.5rem] p-2.5">
        <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-tinta/20" />
        <div className="overflow-hidden rounded-[2rem] bg-white/80 pt-6">
          <div className="mx-2 mb-2 flex items-center gap-1.5 rounded-full bg-arena/80 px-3 py-1.5 text-[10px] text-tinta/50">
            <Lock size={9} />
            <span className="truncate">memoriasvivas.app/a/ana-y-luis</span>
          </div>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-1.5 pb-2.5 text-xs font-semibold text-tinta/70">
              <Camera size={13} /> Boda de Ana y Luis
            </div>
            <PhoneGrid />
            <div className="mt-3 flex justify-center">
              <div className="shimmer flex items-center gap-1.5 rounded-full bg-teja px-4 py-2 text-xs font-semibold text-white shadow-soft">
                <Camera size={13} /> Subir fotos
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-dark animate-float absolute -right-8 -top-8 flex items-center gap-2 rounded-2xl px-3 py-2 text-white shadow-lift sm:-right-12">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teja opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teja" />
        </span>
        <MonitorPlay size={16} />
        <span className="text-xs font-semibold">En vivo en pantalla</span>
      </div>

      {/* Polaroids decorativas sueltas, con fotos de muestra. */}
      <div
        className="polaroid animate-float absolute -bottom-8 -left-10 hidden w-20 overflow-hidden sm:block"
        style={{ ["--rot" as string]: "-9deg", transform: "rotate(-9deg)", animationDelay: "0.4s" }}
      >
        <img src="/decor/babyshower.jpg" alt="" className="h-16 w-full rounded-sm object-cover" />
      </div>
      <div
        className="polaroid animate-float absolute -bottom-4 -left-24 hidden w-16 overflow-hidden sm:block"
        style={{ ["--rot" as string]: "7deg", transform: "rotate(7deg)", animationDelay: "1.1s" }}
      >
        <img src="/decor/anonuevo.jpg" alt="" className="h-12 w-full rounded-sm object-cover" />
      </div>
    </div>
  );
}

function MuroMockup() {
  const notas = [
    { name: "Abuela Carmen", text: "Que la vida os regale muchos días como este. Con todo mi cariño.", rot: "-1.8deg" },
    { name: "Javi", text: "Gracias por dejarnos ser parte de vuestro día. ¡A por los próximos cincuenta años!", rot: "1.4deg" },
    { name: "Marta", text: "La tarta estaba espectacular y el baile mejor todavía.", rot: "-0.8deg" },
  ];
  return (
    <div className="w-full max-w-sm space-y-3">
      {notas.map((n) => (
        <div
          key={n.name}
          className="nota rounded-2xl p-4"
          style={{ transform: `rotate(${n.rot})` }}
        >
          <p className="text-sm leading-relaxed">{n.text}</p>
          <p className="mt-2.5 border-t border-tinta/8 pt-2.5 text-xs">
            <span className="font-semibold">{n.name}</span>{" "}
            <span className="text-tinta/40">· firmado en el muro</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function DotbookMockup() {
  return (
    <div className="relative mx-auto w-full max-w-xs">
      {/* Dos libros: uno detrás asomando y la portada delante. */}
      <div
        className="absolute left-6 top-4 h-full w-full rounded-r-xl rounded-l-sm bg-arena shadow-soft"
        style={{ transform: "rotate(4deg)" }}
      />
      <div className="relative overflow-hidden rounded-r-xl rounded-l-sm bg-white shadow-lift">
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-tinta/25 to-transparent" />
        <img
          src="/dotbook-templates/thumbs/boda.jpg"
          alt="Portada de ejemplo del Dotbook"
          className="aspect-[3/4] w-full object-cover"
        />
      </div>
      <div className="glass absolute -bottom-5 -right-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-lift">
        <BookOpen size={15} className="text-teja" /> 12 diseños de portada
      </div>
    </div>
  );
}

function Showcase({
  eyebrow,
  title,
  text,
  bullets,
  mockup,
  flip,
}: {
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
  mockup: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teja">
          {eyebrow}
        </p>
        <h3
          className="text-balance mt-2 text-2xl font-semibold sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        <p className="mt-3 text-tinta/70">{text}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-tinta/80">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teja/15 text-teja-oscuro">
                <Check size={12} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={`flex justify-center ${flip ? "lg:order-1" : ""}`}>{mockup}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative z-[1] overflow-hidden">
      <SiteNav />

      <main>
        <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 pb-20 pt-10 lg:flex-row lg:pt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teja/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-vino/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-10 -bottom-10 h-56 w-56 rounded-full bg-oro/10 blur-3xl"
          />

          <div className="relative flex-1 text-center lg:text-left">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-arena px-3 py-1 text-sm font-semibold text-teja-oscuro">
              <Sparkles size={14} /> Para bodas, cumpleaños y viajes
            </p>
            <h1
              className="text-balance mt-5 text-4xl leading-[1.08] font-semibold sm:text-5xl lg:text-6xl"
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
              <Link href="/dashboard" className="btn btn-primary shimmer px-8 py-3.5 text-lg">
                Crear mi álbum <ArrowRight size={18} />
              </Link>
              <a href="#como-funciona" className="btn btn-soft px-8 py-3.5 text-lg">
                <Play size={16} /> Cómo funciona
              </a>
            </div>

            <ul className="mt-10 grid gap-4 text-left sm:grid-cols-3">
              {TRUST.map((t) => (
                <li key={t.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-teja shadow-soft">
                    <t.icon size={15} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{t.title}</span>
                    <span className="block text-xs text-tinta/50">{t.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-tinta/50">
              ¿Te han invitado a un álbum? Abre el enlace o escanea el QR que te
              haya pasado el organizador: no necesitas cuenta.
            </p>
          </div>

          <div className="relative flex-1 pt-10">
            <PhoneMockup />
          </div>
        </section>

        {/* Tira de tipos de celebración: pone cara a "cualquier evento". */}
        <section className="border-y border-tinta/8 bg-arena/40 py-12">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-tinta/50">
              Un álbum para cada celebración
            </p>
            <div className="mt-6">
              <CelebrationCarousel items={EVENTS} />
            </div>
          </div>
        </section>

        <section id="herramientas" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <h2
              className="text-balance text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Todo lo que necesitas, nada de lo que sobra
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-tinta/60">
              Pensado para que cualquier invitado, sin importar la edad o la
              destreza con el móvil, participe en menos de 10 segundos.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {/* Tarjeta destacada del modo pantalla, con su propio mockup de TV. */}
            <div className="card-interactive rounded-2xl border border-tinta/10 bg-white p-6 shadow-soft lg:col-span-2 lg:row-span-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teja/20 to-teja/5 text-teja shadow-soft">
                <MonitorPlay size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Modo pantalla en vivo</h3>
              <p className="mt-1.5 text-sm text-tinta/60">
                Conecta una TV o un proyector en el evento y ve aparecer las fotos
                de los invitados en tiempo real, con el QR siempre visible para
                que se anime quien todavía no ha subido nada.
              </p>
              <div className="mt-5">
                <LiveScreenMockup />
              </div>
            </div>

            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 70}
                className="card-interactive rounded-2xl border border-tinta/10 bg-white p-6 shadow-soft"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teja/20 to-teja/5 text-teja shadow-soft">
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-tinta/60">{f.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-arena/40 py-20">
          <div className="mx-auto max-w-6xl space-y-24 px-6">
            <Reveal>
            <Showcase
              eyebrow="Retos fotográficos"
              title="Nadie se queda mirando el móvil sin saber qué hacer"
              text="Propón pequeñas misiones y tus invitados las van completando. Es la forma más fácil de conseguir fotos de todos los momentos, no solo veinte del mismo baile."
              bullets={[
                "Empieza con una lista de retos ya preparada y cámbiala a tu gusto",
                "Cada invitado ve su progreso y sube la foto directamente al reto",
                "Tú ves desde el panel qué retos ya tienen fotos y cuáles no",
              ]}
              mockup={<RetosMockup />}
            />
            </Reveal>
            <Reveal>
            <Showcase
              flip
              eyebrow="Muro de mensajes"
              title="El libro de firmas, sin libro que perder"
              text="Los invitados dejan dedicatorias escritas: una anécdota, una felicitación, un recuerdo. Se guardan en el álbum y se imprimen al final del Dotbook."
              bullets={[
                "Cada persona firma con su nombre, o en anónimo si lo prefiere",
                "Puedes borrar cualquier mensaje que no te encaje",
                "Salen impresos como dedicatorias en el PDF del álbum",
              ]}
              mockup={<MuroMockup />}
            />
            </Reveal>
          </div>
        </section>

        <section id="invitaciones" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teja">
                  Invitaciones
                </p>
                <h3
                  className="text-balance mt-2 text-2xl font-semibold sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  La invitación también sale de aquí
                </h3>
                <p className="mt-3 text-tinta/70">
                  Elige un diseño, escribe los datos de tu evento y arrastra el
                  texto, la foto y el QR donde quieras. Casi 140 plantillas:
                  bodas, quinceañeras, bautizos, comuniones, graduaciones, baby
                  shower y cumpleaños.
                </p>

                <ul className="mt-6 space-y-4">
                  {INVITATION_WAYS.map((w) => (
                    <li key={w.title} className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teja/20 to-teja/5 text-teja shadow-soft">
                        <w.icon size={18} />
                      </span>
                      <span>
                        <span className="block font-semibold">{w.title}</span>
                        <span className="block text-sm text-tinta/60">{w.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard" className="btn btn-primary shimmer mt-7">
                  Crear mi invitación <ArrowRight size={17} />
                </Link>
              </div>

              <div className="flex justify-center">
                <InvitationDeck />
              </div>
            </div>
          </Reveal>
        </section>

        <section id="dotbook" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
          <Showcase
            flip
            eyebrow="Dotbook digital"
            title="Tu álbum convertido en un libro de recuerdos"
            text="Con un clic se genera un PDF con portada a elegir, una página por cada recuerdo con sus comentarios, y las dedicatorias del muro al final. Listo para guardar o llevar a imprimir."
            bullets={[
              "12 diseños de portada, más 6 estilos dibujados",
              "Los vídeos llevan un QR que abre el original",
              "Se descarga al momento, sin esperar ni encargar nada",
            ]}
            mockup={<DotbookMockup />}
          />
          </Reveal>
        </section>

        <section id="como-funciona" className="border-y border-tinta/8 bg-arena/60 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2
              className="text-center text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cómo funciona
            </h2>
            <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
              {/* Línea que une los tres pasos en escritorio. */}
              <div
                aria-hidden
                className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-teja/25 sm:block"
              />
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 120} className="relative text-center">
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teja text-2xl font-semibold text-white shadow-lift"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-tinta/60">{s.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="preguntas" className="mx-auto max-w-3xl px-6 py-20">
          <h2
            className="text-center text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Preguntas frecuentes
          </h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-tinta/10 bg-white px-5 py-4 shadow-soft"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold marker:content-none">
                  {f.q}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-arena text-teja-oscuro transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-tinta/70">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-tinta px-6 py-16 text-center text-crema shadow-lift">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-teja/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-oro/20 blur-3xl"
            />
            <h2
              className="text-balance relative text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tu próximo evento merece algo mejor que un chat lleno de fotos
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-crema/70">
              Crea el álbum hoy, comparte el QR el día de la fiesta y quédate con
              todos los recuerdos —también los que tú no viste.
            </p>
            <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className="btn btn-primary shimmer px-8 py-3.5 text-lg">
                Crear mi álbum <ArrowRight size={18} />
              </Link>
              <a
                href="#herramientas"
                className="btn btn-on-dark px-8 py-3.5 text-lg"
              >
                Ver todo lo que incluye
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-tinta/10 px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tinta text-crema">
                <Camera size={15} />
              </span>
              <span style={{ fontFamily: "var(--font-display)" }}>Memorias Vivas</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-tinta/50">
              Álbumes compartidos para bodas, cumpleaños, viajes y todo lo que
              merezca recordarse.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tinta/70">La app</p>
            <ul className="mt-3 space-y-2 text-tinta/50">
              <li>
                <a href="#herramientas" className="hover:text-tinta">Qué incluye</a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-tinta">Cómo funciona</a>
              </li>
              <li>
                <a href="#invitaciones" className="hover:text-tinta">Invitaciones</a>
              </li>
              <li>
                <a href="#dotbook" className="hover:text-tinta">Dotbook digital</a>
              </li>
              <li>
                <a href="#preguntas" className="hover:text-tinta">Preguntas frecuentes</a>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tinta/70">Empezar</p>
            <ul className="mt-3 space-y-2 text-tinta/50">
              <li>
                <Link href="/dashboard" className="hover:text-tinta">Crear un álbum</Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-tinta">Entrar en mi panel</Link>
              </li>
              <li className="flex items-center gap-1.5">
                <PenLine size={13} /> Muro de mensajes
              </li>
              <li className="flex items-center gap-1.5">
                <Target size={13} /> Retos fotográficos
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tinta/70">Legal</p>
            <ul className="mt-3 space-y-2 text-tinta/50">
              <li>
                <Link href="/legal/privacidad" className="hover:text-tinta">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/legal/condiciones" className="hover:text-tinta">
                  Condiciones de uso
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-tinta/8 pt-6 text-center text-xs text-tinta/40">
          Memorias Vivas · Hecho para guardar recuerdos, no para coleccionar datos.
        </p>
      </footer>
    </div>
  );
}
