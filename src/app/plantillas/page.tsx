import type { Metadata } from "next";
import Link from "next/link";
import { encodeInvitationLink, type InvitationLinkState } from "@/lib/invitation-link";
import { NOMBRES_DE_EVENTO, PLANTILLAS, type PlantillaInvitacion } from "@/lib/invitation-styles";
import { publicSiteUrl } from "@/lib/public-site-url";
import { Adorno } from "@/components/InvitationOrnaments";

export const metadata: Metadata = {
  title: "Plantillas de invitación",
  description:
    "Los diseños de invitación web: sobre lacrado, cuenta atrás, ceremonia y recepción, código de vestimenta, mesa de regalos, buenos deseos y galería.",
};

/**
 * Escaparate de plantillas.
 *
 * Existe para poder enseñar todos los diseños de un vistazo, y porque cada
 * invitación de ejemplo se arma aquí con datos de mentira: no hace falta
 * crear álbumes ni guardar nada para verlas.
 */
function ejemplo(plantilla: PlantillaInvitacion, sitio: string): InvitationLinkState {
  const dentroDe = new Date(Date.now() + 1000 * 60 * 60 * 24 * 47);
  const foto = (nombre: string) => `${sitio}/dotbook-templates/${nombre}.jpg`;
  const boda = plantilla.evento === "boda";
  return {
    t: "quince-pastel",
    n: boda ? "Ana & Luis" : "Los XV de Valentina",
    d: "Sábado 12 de diciembre",
    h: "7:00 pm",
    o: "Con la bendición de sus familias",
    u: `${sitio}/a/ejemplo`,
    tx: { x: 405, y: 810, fontSize: 36, fontFamily: "Georgia, serif", color: "#7a4a63", maxWidth: 560 },
    q: { x: 405, y: 1180, size: 150 },
    it: true,
    iv: plantilla.id,
    st: dentroDe.toISOString().slice(0, 16),
    si: boda ? "A&L" : "V",
    pd: "Padres: Ana Ruiz y Luis Mora\nPadrinos de honor: Marta y Jorge",
    ce: "Parroquia de San Francisco\nCalle Mayor 12",
    ch: "6:00 pm",
    cm: "https://maps.google.com/?q=parroquia",
    re: "Hacienda El Roble\nCarretera del Lago km 4",
    rh: "8:30 pm",
    rm: "https://maps.google.com/?q=hacienda",
    tl: "6:30 pm · Recepción\n7:00 pm · Ceremonia\n9:00 pm · Vals y cena",
    dr: boda ? "Etiqueta rigurosa" : "Formal · tonos tierra",
    pa: boda ? "verde olivo, dorado, marfil" : "rosa palo, vino, dorado, marfil",
    ev: "blanco, rojo",
    av: "Solo adultos\nHay estacionamiento en el lugar\nLlega 20 minutos antes",
    mr: "https://ejemplo.com/mesa-de-regalos",
    cl: "Banco Ejemplo\nCLABE 0123 4567 8901 2345 67",
    ho: "Hotel Plaza · 10% con el código del evento",
    hg: boda ? "BodaAnaYLuis" : "LosXVdeValentina",
    sc: true,
    fp: foto(boda ? "boda-flores" : "quince-flores"),
    fg: [foto("quince-lazo"), foto("quince-mariposas"), foto("boda-momentos"), foto("anonuevo")],
  };
}

/** La misma miniatura del selector del editor, dibujada con la plantilla. */
function Miniatura({ plantilla }: { plantilla: PlantillaInvitacion }) {
  const p = plantilla.paleta;
  const franja = plantilla.bandas === "alternas" ? p.band : p.soft;
  const forma =
    plantilla.marco === "ovalo" ? "50%" : plantilla.marco === "recto" ? "3px" : "50% 50% 4px 4px / 26% 26% 2% 2%";
  return (
    <span className="block overflow-hidden rounded-xl" style={{ backgroundColor: p.paper }}>
      <span className="flex aspect-[3/4] flex-col items-center gap-1.5 px-3 pt-4">
        <span className="h-1 w-10 rounded-full" style={{ backgroundColor: p.accent, opacity: 0.5 }} />
        <span
          className="mt-1 block w-16 border"
          style={{ aspectRatio: "3 / 4", backgroundColor: p.mezcla, borderRadius: forma, borderColor: p.accent }}
        />
        <span className="mt-1 block w-full" style={{ color: p.accent }}>
          <Adorno motivo={plantilla.motivo} className="mx-auto h-5 w-20" opacidad={0.9} />
        </span>
        <span className="mt-auto block h-7 w-[calc(100%+1.5rem)]" style={{ backgroundColor: franja }} />
      </span>
    </span>
  );
}

export default function PlantillasPage() {
  const sitio = publicSiteUrl();
  const eventos = [...new Set(PLANTILLAS.map((p) => p.evento))];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-teja">Invitación web</p>
        <h1 className="mt-3 text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Los diseños
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-tinta/65">
          Toca cualquiera para abrir una invitación de ejemplo entera, con su sobre lacrado, su
          cuenta atrás y todas las secciones. Los datos son inventados: al crear la tuya pones los
          vuestros y vuestras fotos.
        </p>
      </header>

      {eventos.map((evento) => (
        <section key={evento} className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[.2em] text-tinta/45">
            {NOMBRES_DE_EVENTO[evento]}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PLANTILLAS.filter((p) => p.evento === evento).map((plantilla) => (
              <a
                key={plantilla.id}
                href={`/invitacion?d=${encodeInvitationLink(ejemplo(plantilla, sitio))}`}
                className="group block rounded-2xl border border-tinta/12 p-2 transition hover:-translate-y-0.5 hover:border-teja/50 hover:shadow-lift"
              >
                <Miniatura plantilla={plantilla} />
                <span className="mt-2 block px-1 pb-1 text-sm font-semibold text-tinta group-hover:text-teja">
                  {plantilla.label}
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-12 text-center text-sm text-tinta/55">
        <Link href="/" className="font-semibold text-teja underline">
          Volver a la portada
        </Link>
      </p>
    </main>
  );
}
