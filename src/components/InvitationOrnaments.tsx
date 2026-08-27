import type { Motivo } from "@/lib/invitation-styles";

// Adornos de la invitación, dibujados a línea.
//
// Van en SVG y no en imágenes por tres razones: se tiñen solos del color de
// la plantilla, se ven nítidos en cualquier pantalla y no hay archivos que
// subir cuando se añade una plantilla nueva.

const TRAZOS: Record<Motivo, React.ReactNode> = {
  // Rosa con dos hojas: el adorno de las invitaciones más románticas.
  floral: (
    <>
      <path d="M60 10c-4 0-7 3-7 7s3 7 7 7 7-3 7-7" />
      <path d="M60 14c-2 0-3.5 1.5-3.5 3.5S58 21 60 21" />
      <path d="M60 24v8" />
      <path d="M60 27c-3-4-8-5-11-3 1 4 6 6 11 3Z" />
      <path d="M60 30c3-4 8-5 11-3-1 4-6 6-11 3Z" />
    </>
  ),
  // Rama de olivo.
  botanico: (
    <>
      <path d="M24 24C42 12 78 12 96 24" />
      <path d="M38 18c-1-5 2-8 6-8 1 5-2 8-6 8Z" />
      <path d="M52 14c-1-5 2-8 6-8 1 5-2 8-6 8Z" />
      <path d="M68 14c1-5 4-6 8-4-1 5-4 6-8 4Z" />
      <path d="M82 19c1-5 4-6 8-4-1 5-4 6-8 4Z" />
      <path d="M46 22c-4-3-8-2-10 1 4 3 8 2 10-1Z" />
      <path d="M74 22c4-3 8-2 10 1-4 3-8 2-10-1Z" />
    </>
  ),
  // Abanico art déco.
  deco: (
    <>
      <path d="M36 28h48" />
      <path d="M44 28a16 16 0 0 1 32 0" />
      <path d="M50 28a10 10 0 0 1 20 0" />
      <path d="M56 28a4 4 0 0 1 8 0" />
      <path d="M60 6v6" />
      <path d="M60 4 63 8 60 12 57 8Z" />
    </>
  ),
  corazones: (
    <>
      <path d="M60 30c-9-6-11-13-6-16 3-2 6 0 6 3 0-3 3-5 6-3 5 3 3 10-6 16Z" />
      <path d="M40 24c-5-4-6-8-3-9 2-1 3 0 3 2 0-2 1-3 3-2 3 1 2 5-3 9Z" />
      <path d="M80 24c-5-4-6-8-3-9 2-1 3 0 3 2 0-2 1-3 3-2 3 1 2 5-3 9Z" />
    </>
  ),
  estrellas: (
    <>
      <path d="M60 6c1.6 8 4.4 10.8 12.4 12.4C64.4 20 61.6 22.8 60 30.8 58.4 22.8 55.6 20 47.6 18.4 55.6 16.8 58.4 14 60 6Z" />
      <path d="M38 16c.8 4 2.2 5.4 6.2 6.2-4 .8-5.4 2.2-6.2 6.2-.8-4-2.2-5.4-6.2-6.2 4-.8 5.4-2.2 6.2-6.2Z" />
      <path d="M82 16c.8 4 2.2 5.4 6.2 6.2-4 .8-5.4 2.2-6.2 6.2-.8-4-2.2-5.4-6.2-6.2 4-.8 5.4-2.2 6.2-6.2Z" />
    </>
  ),
  lazo: (
    <>
      <circle cx="60" cy="18" r="3" />
      <path d="M57 16c-4-6-12-8-15-4-2 4 3 8 9 8 3 0 5-1 6-2Z" />
      <path d="M63 16c4-6 12-8 15-4 2 4-3 8-9 8-3 0-5-1-6-2Z" />
      <path d="M58 21c-2 5-4 8-7 11" />
      <path d="M62 21c2 5 4 8 7 11" />
    </>
  ),
};

/**
 * El adorno de la plantilla. `filete` le pone la línea a cada lado, que es
 * como se usa bajo los títulos de sección.
 */
export function Adorno({
  motivo,
  className = "mx-auto h-8 w-28",
  filete = false,
  opacidad = 0.75,
}: {
  motivo: Motivo;
  className?: string;
  filete?: boolean;
  opacidad?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: opacidad }}
      aria-hidden="true"
    >
      {filete && (
        <>
          <path d="M2 20h26" opacity="0.55" />
          <path d="M92 20h26" opacity="0.55" />
        </>
      )}
      {TRAZOS[motivo]}
    </svg>
  );
}

/** Percha: el dibujo del código de vestimenta. */
export function IconoVestimenta({ className = "mx-auto h-10 w-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M32 14c0-5-4.6-4.6-4.6-8.4A4.4 4.4 0 0 1 32 1.4a4.4 4.4 0 0 1 4.6 4.2" />
      <path d="M32 14 4.4 31.4c-1.6 1-1 3.2.9 3.2h53.4c1.9 0 2.5-2.2.9-3.2Z" />
    </svg>
  );
}

/** Dos copas brindando: el dibujo de la cronología. */
export function IconoBrindis({ className = "mx-auto h-12 w-28" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g transform="rotate(-13 20 20)">
        <path d="M11 6h18l-9 13z" /><path d="M20 19v13" /><path d="M14 33h12" />
      </g>
      <g transform="rotate(13 44 20)">
        <path d="M35 6h18l-9 13z" /><path d="M44 19v13" /><path d="M38 33h12" />
      </g>
    </svg>
  );
}
