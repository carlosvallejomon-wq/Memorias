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
import { PricingSection } from "@/components/PricingSection";
import { BuyAlbumButton } from "@/components/BuyAlbumButton";
import { WHATSAPP_SUPPORT_URL } from "@/components/WhatsAppSupport";
import {
  CelebrationCarousel,
  InvitationDeck,
  LiveScreenMockup,
  PhoneGrid,
  Reveal,
  RetosMockup,
} from "@/components/LandingPieces";
import { TEMPLATE_COVER_LIST } from "@/lib/dotbook-templates";

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
    a: "Sí: descarga el álbum completo en un ZIP, o genera el Dotbook en PDF con una página por recuerdo y las dedicatorias del muro.",
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

const EN_TRUST = [
  { icon: WifiOff, title: "Nothing to install", text: "It opens right in any phone browser" },
  { icon: Users, title: "No guest accounts", text: "Only the host needs to sign in" },
  { icon: InfinityIcon, title: "Unlimited guests", text: "Share your QR code with everyone" },
];

const EN_EVENTS = [
  "Weddings", "Birthdays", "Quinceañeras", "Communions", "Baptisms", "Graduations",
  "Kids' parties", "Baby showers", "Family", "Trips", "Christmas", "New Year's Eve",
];

const EN_FEATURES = [
  { icon: QrCode, title: "A QR code is all you need", text: "Guests scan or open a link and upload right away — no app or account required." },
  { icon: Heart, title: "Reactions and comments", text: "Everyone can react to and comment on every photo, just like on social media." },
  { icon: CalendarDays, title: "Organized automatically", text: "Content is arranged by date, with filters by person and a day-by-day view." },
  { icon: ShieldCheck, title: "Optional moderation", text: "Review every photo before it appears — you decide what is shared." },
  { icon: Download, title: "Download everything", text: "Download the complete album as a ZIP, or let guests save their favorite photos." },
];

const EN_INVITATION_WAYS = [
  { icon: Printer, title: "Print it", text: "Download it in high quality, ready to print at home or at a print shop." },
  { icon: Link2, title: "Send it on WhatsApp", text: "Every invitation has its own link and opens on a phone with no app required." },
  { icon: QrCode, title: "Or use a QR code", text: "One QR opens the invitation and another goes straight to the photo album." },
];

const EN_STEPS = [
  { n: "1", title: "Create your album", text: "Give your wedding, birthday or trip a name and date. It takes less than a minute." },
  { n: "2", title: "Share the QR code", text: "Print it for the tables or send it on WhatsApp. Anyone can join instantly." },
  { n: "3", title: "Memories appear automatically", text: "Every photo and video lands in the gallery as soon as guests upload it." },
];

const EN_FAQ = [
  { q: "Do guests need to install anything or create an account?", a: "No. They scan the QR code or open the link and can view the album, upload photos, react and comment. Their name is optional." },
  { q: "Does it work on iPhone and Android?", a: "Yes. It is a normal website, so it works on phones, tablets and computers with a modern browser." },
  { q: "Can I approve photos before guests see them?", a: "Yes. Turn on moderation and every upload waits for your approval." },
  { q: "What if someone uploads something I do not want?", a: "You can remove any photo, video or message from your host dashboard." },
  { q: "Can I keep every photo?", a: "Yes. Download the full album as a ZIP or generate a Dotbook PDF with messages from the wall." },
  { q: "Can invitations be printed?", a: "Yes. Download them as a high-quality image, print them, send them by WhatsApp or share their QR code." },
  { q: "Do videos work too?", a: "Yes. Videos are included in the gallery; the Dotbook adds a QR code that opens the original video." },
];

function PhoneMockup({ english = false }: { english?: boolean }) {
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
              <Camera size={13} /> {english ? "Ana and Luis' wedding" : "Boda de Ana y Luis"}
            </div>
            <PhoneGrid />
            <div className="mt-3 flex justify-center">
              <div className="shimmer flex items-center gap-1.5 rounded-full bg-teja px-4 py-2 text-xs font-semibold text-white shadow-soft">
                <Camera size={13} /> {english ? "Upload photos" : "Subir fotos"}
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
        <span className="text-xs font-semibold">{english ? "Live on screen" : "En vivo en pantalla"}</span>
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

function MuroMockup({ english = false }: { english?: boolean }) {
  const notas = english ? [
    { name: "Grandma Carmen", text: "May life give you many more days like this one. With all my love.", rot: "-1.8deg" },
    { name: "Javi", text: "Thank you for letting us be part of your day. Here is to the next fifty years!", rot: "1.4deg" },
    { name: "Marta", text: "The cake was incredible and the dancing was even better.", rot: "-0.8deg" },
  ] : [
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
            <span className="text-tinta/40">· {english ? "signed the wall" : "firmado en el muro"}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

// Tres portadas reales en abanico. Antes era una sola miniatura de 124 px
// estirada, que se veía borrosa y además no daba idea de que hubiera dónde
// elegir; estas salen de `medios/`, a tamaño de pantalla y unos 50 KB cada una.
const DOTBOOK_ABANICO = [
  { file: "quince-flores.jpg", alt: "Portada de quinceañera", clase: "-left-12 top-8 -rotate-[7deg]" },
  { file: "familia-polaroids.jpg", alt: "Portada de familia", clase: "left-12 top-5 rotate-[7deg]" },
];

// La proporción es la de las propias portadas (1057×1500), no un 3/4 a ojo:
// forzando 3/4 el `object-cover` recortaba el pie del diseño.
const HOJA = "aspect-[1057/1500] w-full object-cover";

function DotbookMockup({ english = false }: { english?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[15rem] pb-6">
      {DOTBOOK_ABANICO.map((p) => (
        <div
          key={p.file}
          className={`absolute h-full w-full overflow-hidden rounded-r-xl rounded-l-sm bg-white shadow-soft ${p.clase}`}
        >
          <img src={`/dotbook-templates/medios/${p.file}`} alt={p.alt} className={HOJA} />
        </div>
      ))}

      <div className="relative overflow-hidden rounded-r-xl rounded-l-sm bg-white shadow-lift">
        <div className="absolute inset-y-0 left-0 z-10 w-3 bg-gradient-to-r from-tinta/25 to-transparent" />
        <img
          src="/dotbook-templates/medios/boda-flores.jpg"
          alt="Portada de boda del Dotbook"
          className={HOJA}
        />
      </div>

      <div className="glass absolute -bottom-1 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold shadow-lift">
        <BookOpen size={15} className="text-teja" /> {TEMPLATE_COVER_LIST.length} {english ? "cover designs" : "diseños de portada"}
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const english = lang === "en";
  const paymentsEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  const trust = english ? EN_TRUST : TRUST;
  const events = EVENTS.map((event, index) => ({
    ...event,
    label: english ? EN_EVENTS[index] : event.label,
  }));
  const features = english ? EN_FEATURES : FEATURES;
  const invitationWays = english ? EN_INVITATION_WAYS : INVITATION_WAYS;
  const steps = english ? EN_STEPS : STEPS;
  const faq = english ? EN_FAQ : FAQ;
  // `overflow-x-clip` y no `overflow-hidden`: los dos recortan las polaroids
  // decorativas que se salen por los lados, pero `hidden` convierte esto en un
  // contenedor de scroll y eso anula el `sticky` de la barra de arriba, que se
  // iba con la página en vez de quedarse fija.
  return (
    <div className="relative z-[1] overflow-x-clip">
      <SiteNav lang={english ? "en" : "es"} paymentsEnabled={paymentsEnabled} />

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
              <Sparkles size={14} /> {english ? "For weddings, parties and trips" : "Para bodas, cumpleaños y viajes"}
            </p>
            <h1
              className="text-balance mt-5 text-4xl leading-[1.08] font-semibold sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {english ? "Every photo from your event, in one beautiful place" : "Todas las fotos de tu evento, en un solo sitio"}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-tinta/70 lg:mx-0">
              {english ? "Create an album, share the QR code and let your guests upload photos and videos from their phones — " : "Crea un álbum, comparte el código QR y deja que tus invitados suban sus fotos y vídeos desde el móvil — "}
              <strong>{english ? "no app or sign-up required" : "sin instalar nada y sin registrarse"}</strong>.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              {paymentsEnabled ? (
                <BuyAlbumButton
                  english={english}
                  className="px-8 py-3.5 text-lg"
                  label={<>{english ? "Buy my album · $39" : "Comprar mi álbum · $39"} <ArrowRight size={18} /></>}
                />
              ) : (
                <Link href="/dashboard" className="btn btn-primary shimmer px-8 py-3.5 text-lg">
                  {english ? "Create my album" : "Crear mi álbum"} <ArrowRight size={18} />
                </Link>
              )}
              <a href="#como-funciona" className="btn btn-soft px-8 py-3.5 text-lg">
                <Play size={16} /> {english ? "How it works" : "Cómo funciona"}
              </a>
            </div>
            <Link href="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-teja underline-offset-4 hover:underline">
              {english ? "Already have an account? Sign in" : "¿Ya tienes cuenta? Iniciar sesión"}
            </Link>

            <ul className="mt-10 grid gap-4 text-left sm:grid-cols-3">
              {trust.map((t) => (
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
              {english
                ? "Were you invited to an album? Open the link or scan the QR code your host shared — no account needed."
                : "¿Te han invitado a un álbum? Abre el enlace o escanea el QR que te haya pasado el organizador: no necesitas cuenta."}
            </p>
          </div>

          <div className="relative flex-1 pt-10">
            <PhoneMockup english={english} />
          </div>
        </section>

        {/* Tira de tipos de celebración: pone cara a "cualquier evento". */}
        <section className="border-y border-tinta/8 bg-arena/40 py-12">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-tinta/50">
              {english ? "An album for every celebration" : "Un álbum para cada celebración"}
            </p>
            <div className="mt-6">
              <CelebrationCarousel items={events} />
            </div>
          </div>
        </section>

        <section id="herramientas" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <h2
              className="text-balance text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {english ? "Everything you need, nothing you do not" : "Todo lo que necesitas, nada de lo que sobra"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-tinta/60">
              {english
                ? "Designed so every guest can participate in less than 10 seconds, whatever their age or comfort with technology."
                : "Pensado para que cualquier invitado, sin importar la edad o la destreza con el móvil, participe en menos de 10 segundos."}
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {/* Tarjeta destacada del modo pantalla, con su propio mockup de TV. */}
            <div className="card-interactive rounded-2xl border border-tinta/10 bg-white p-6 shadow-soft lg:col-span-2 lg:row-span-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teja/20 to-teja/5 text-teja shadow-soft">
                <MonitorPlay size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{english ? "Live screen mode" : "Modo pantalla en vivo"}</h3>
              <p className="mt-1.5 text-sm text-tinta/60">
                {english
                  ? "Connect a TV or projector and watch guest photos appear in real time, with the QR code always visible."
                  : "Conecta una TV o un proyector en el evento y ve aparecer las fotos de los invitados en tiempo real, con el QR siempre visible para que se anime quien todavía no ha subido nada."}
              </p>
              <div className="mt-5">
                <LiveScreenMockup english={english} />
              </div>
            </div>

            {features.map((f, i) => (
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
              eyebrow={english ? "Photo challenges" : "Retos fotográficos"}
              title={english ? "No guest has to wonder what photo to take" : "Nadie se queda mirando el móvil sin saber qué hacer"}
              text={english ? "Set small missions for your guests to complete. It is the easiest way to collect every moment, not twenty shots of the same dance." : "Propón pequeñas misiones y tus invitados las van completando. Es la forma más fácil de conseguir fotos de todos los momentos, no solo veinte del mismo baile."}
              bullets={english ? ["Start with a ready-made list and tailor it to your event", "Guests see their progress and upload directly to each challenge", "See which challenges already have photos from your dashboard"] : ["Empieza con una lista de retos ya preparada y cámbiala a tu gusto", "Cada invitado ve su progreso y sube la foto directamente al reto", "Tú ves desde el panel qué retos ya tienen fotos y cuáles no"]}
              mockup={<RetosMockup english={english} />}
            />
            </Reveal>
            <Reveal>
            <Showcase
              flip
              eyebrow={english ? "Message wall" : "Muro de dedicatorias"}
              title={english ? "A guest book that cannot get lost" : "El libro de firmas, sin libro que perder"}
              text={english ? "Guests leave a story, a congratulations or a memory. It stays in the album and is printed at the end of the Dotbook." : "Los invitados dejan dedicatorias escritas: una anécdota, una felicitación, un recuerdo. Se guardan en el álbum y se imprimen al final del Dotbook."}
              bullets={english ? ["Everyone can sign with their name or stay anonymous", "Remove any message that does not fit", "Messages are included in the album PDF"] : ["Cada persona firma con su nombre, o en anónimo si lo prefiere", "Puedes borrar cualquier mensaje que no te encaje", "Salen impresos como dedicatorias en el PDF del álbum"]}
              mockup={<MuroMockup english={english} />}
            />
            </Reveal>
          </div>
        </section>

        <section id="invitaciones" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teja">
                  {english ? "Invitations" : "Invitaciones"}
                </p>
                <h3
                  className="text-balance mt-2 text-2xl font-semibold sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {english ? "Your invitation comes from here too" : "La invitación también sale de aquí"}
                </h3>
                <p className="mt-3 text-tinta/70">
                  {english ? "Choose a design, add your event details and place the text, photo and QR code where you want. Nearly 140 templates for weddings, quinceañeras, baptisms, communions, graduations, baby showers and birthdays." : "Elige un diseño, escribe los datos de tu evento y arrastra el texto, la foto y el QR donde quieras. Casi 140 plantillas: bodas, quinceañeras, bautizos, comuniones, graduaciones, baby shower y cumpleaños."}
                </p>

                <ul className="mt-6 space-y-4">
                  {invitationWays.map((w) => (
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

                {paymentsEnabled ? (
                  <BuyAlbumButton
                    english={english}
                    className="mt-7 px-5 py-2.5"
                    label={<>{english ? "Buy my album · $39" : "Comprar mi álbum · $39"} <ArrowRight size={17} /></>}
                  />
                ) : (
                  <Link href="/dashboard" className="btn btn-primary shimmer mt-7">
                    {english ? "Create my invitation" : "Crear mi invitación"} <ArrowRight size={17} />
                  </Link>
                )}
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
            eyebrow={english ? "Digital Dotbook" : "Dotbook digital"}
            title={english ? "Your album turned into a keepsake book" : "Tu álbum convertido en un libro de recuerdos"}
            text={english ? "Generate a PDF in one click with a cover you choose, a page for every memory and its comments, plus guest messages at the end. Ready to save or print." : "Con un clic se genera un PDF con portada a elegir, una página por cada recuerdo con sus comentarios, y las dedicatorias del muro al final. Listo para guardar o llevar a imprimir."}
            bullets={english ? [`${TEMPLATE_COVER_LIST.length} cover designs plus 6 illustrated styles`, "Videos include a QR code that opens the original", "Download it instantly — no waiting or ordering"] : [`${TEMPLATE_COVER_LIST.length} diseños de portada, más 6 estilos dibujados`, "Los vídeos llevan un QR que abre el original", "Se descarga al momento, sin esperar ni encargar nada"]}
            mockup={<DotbookMockup english={english} />}
          />
          </Reveal>
        </section>

        <section id="como-funciona" className="border-y border-tinta/8 bg-arena/60 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2
              className="text-center text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {english ? "How it works" : "Cómo funciona"}
            </h2>
            <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
              {/* Línea que une los tres pasos en escritorio. */}
              <div
                aria-hidden
                className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-teja/25 sm:block"
              />
              {steps.map((s, i) => (
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
            {english ? "Frequently asked questions" : "Preguntas frecuentes"}
          </h2>
          <div className="mt-10 space-y-3">
            {faq.map((f) => (
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

        <PricingSection lang={english ? "en" : "es"} />

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
              {english ? "Your next event deserves better than a chat full of photos" : "Tu próximo evento merece algo mejor que un chat lleno de fotos"}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-crema/70">
              {english ? "Create your album today, share the QR code at the party and keep every memory — even the ones you did not see." : "Crea el álbum hoy, comparte el QR el día de la fiesta y quédate con todos los recuerdos —también los que tú no viste."}
            </p>
            <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {paymentsEnabled ? (
                <BuyAlbumButton
                  english={english}
                  className="px-8 py-3.5 text-lg"
                  label={<>{english ? "Buy my album · $39" : "Comprar mi álbum · $39"} <ArrowRight size={18} /></>}
                />
              ) : (
                <Link href="/dashboard" className="btn btn-primary shimmer px-8 py-3.5 text-lg">
                  {english ? "Create my album" : "Crear mi álbum"} <ArrowRight size={18} />
                </Link>
              )}
              <a
                href="#herramientas"
                className="btn btn-on-dark px-8 py-3.5 text-lg"
              >
                {english ? "See everything included" : "Ver todo lo que incluye"}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-tinta/10 px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <img src="/brand/memorias-vivas-logo.png" alt="" className="h-8 w-8 rounded-lg object-cover shadow-sm" />
              <span style={{ fontFamily: "var(--font-display)" }}>Memorias Vivas</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-tinta/50">
              {english ? "Shared albums for weddings, birthdays, trips and every moment worth remembering." : "Álbumes compartidos para bodas, cumpleaños, viajes y todo lo que merezca recordarse."}
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tinta/70">{english ? "The app" : "La app"}</p>
            <ul className="mt-3 space-y-2 text-tinta/50">
              <li>
                <a href="#herramientas" className="hover:text-tinta">{english ? "What’s included" : "Qué incluye"}</a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-tinta">{english ? "How it works" : "Cómo funciona"}</a>
              </li>
              <li>
                <a href="#invitaciones" className="hover:text-tinta">{english ? "Invitations" : "Invitaciones"}</a>
              </li>
              <li>
                <a href="#dotbook" className="hover:text-tinta">{english ? "Digital Dotbook" : "Dotbook digital"}</a>
              </li>
              <li>
                <a href="#preguntas" className="hover:text-tinta">{english ? "FAQ" : "Preguntas frecuentes"}</a>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tinta/70">{english ? "Get started" : "Empezar"}</p>
            <ul className="mt-3 space-y-2 text-tinta/50">
              <li>
                <a href="#precios" className="hover:text-tinta">{english ? "View pricing" : "Ver precios"}</a>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-tinta">{english ? "Open my dashboard" : "Entrar en mi panel"}</Link>
              </li>
              <li className="flex items-center gap-1.5">
                <PenLine size={13} /> {english ? "Message wall" : "Muro de dedicatorias"}
              </li>
              <li className="flex items-center gap-1.5">
                <Target size={13} /> {english ? "Photo challenges" : "Retos fotográficos"}
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-tinta/70">{english ? "Legal" : "Legal"}</p>
            <ul className="mt-3 space-y-2 text-tinta/50">
              <li>
                <Link href="/legal/privacidad" className="hover:text-tinta">
                  {english ? "Privacy" : "Privacidad"}
                </Link>
              </li>
              <li>
                <Link href="/legal/condiciones" className="hover:text-tinta">
                  {english ? "Terms of use" : "Condiciones de uso"}
                </Link>
              </li>
              <li>
                <Link href="/legal/reembolsos" className="hover:text-tinta">
                  {english ? "Refund policy" : "Reembolsos"}
                </Link>
              </li>
              <li>
                <a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noreferrer" className="hover:text-tinta">
                  {english ? "Contact us on WhatsApp" : "Contáctanos por WhatsApp"}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-tinta/8 pt-6 text-center text-xs text-tinta/40">
          {english ? "Memorias Vivas · Made to keep memories, not collect data." : "Memorias Vivas · Hecho para guardar recuerdos, no para coleccionar datos."}
        </p>
      </footer>
    </div>
  );
}
