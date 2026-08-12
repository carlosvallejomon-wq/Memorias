import { ICONOS } from "@/lib/dotbook-icons";
import { EMOJI_A_REACCION, type Reaccion } from "@/lib/guest-types";

/**
 * Los iconos de reaccionar, dibujados.
 *
 * Antes eran los emoji del sistema, y ahí está el problema: cada móvil dibuja
 * los suyos. El de aplaudir salía en Android como una mano suelta que no se
 * entendía, y en escritorio ni eso. Además desentonaban con el resto de la
 * pantalla, que ya va con iconos de línea.
 *
 * Son los mismos trazados que se imprimen en el Dotbook
 * (`src/lib/dotbook-icons.ts`), así que la app y el libro se ven de la misma
 * familia: quien reacciona con un corazón encuentra ese mismo corazón impreso
 * junto a su comentario.
 *
 * Se pintan con `currentColor`, de modo que el color lo pone el botón según
 * esté marcado o no.
 */
export function IconoReaccion({
  emoji,
  size = 22,
}: {
  emoji: Reaccion;
  size?: number;
}) {
  const icono = ICONOS[EMOJI_A_REACCION[emoji]];
  if (!icono) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {icono.relleno && <path d={icono.relleno} fill="currentColor" />}
      {icono.trazo && (
        <path
          d={icono.trazo}
          fill="none"
          stroke="currentColor"
          strokeWidth={icono.grosor ?? 1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
