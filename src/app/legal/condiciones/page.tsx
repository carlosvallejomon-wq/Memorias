import type { Metadata } from "next";
import Link from "next/link";
import {
  MAX_FILE_BYTES,
  MAX_ITEMS_PER_ALBUM,
  MAX_ITEMS_PER_GUEST,
  formatMb,
} from "@/lib/limits";

export const metadata: Metadata = {
  title: "Condiciones de uso",
  description: "Las reglas del juego al usar Memorias Vivas: qué se puede subir y qué no.",
};

export default function CondicionesPage() {
  return (
    <>
      <h1>Condiciones de uso</h1>
      <p className="lead">
        Las reglas del juego, en corto. Al crear un álbum o subir una foto,
        aceptas esto.
      </p>

      <h2>Qué es esto</h2>
      <p>
        Un servicio para compartir las fotos y vídeos de un evento. El
        organizador crea un álbum y comparte un enlace o un código QR; los
        invitados suben sus recuerdos desde el móvil sin registrarse.
      </p>

      <h2>De quién son las fotos</h2>
      <p>
        Tuyas. Subir una foto no nos da su propiedad. Solo se guarda y se enseña
        dentro del álbum donde la subiste, para que la vean los demás invitados.
      </p>

      <h2>Qué te comprometes a no subir</h2>
      <ul>
        <li>Contenido que no sea tuyo o para el que no tengas permiso.</li>
        <li>
          Fotos de personas que no quieran salir, y en particular de menores sin
          el permiso de sus padres o tutores.
        </li>
        <li>Contenido ilegal, violento, sexual o que acose a alguien.</li>
      </ul>
      <p>
        El organizador del álbum puede borrar cualquier contenido. Si un álbum
        se usa para algo de lo anterior, se retira.
      </p>

      <h2>Límites técnicos</h2>
      <ul>
        <li>Hasta {formatMb(MAX_FILE_BYTES)} por archivo.</li>
        <li>Hasta {MAX_ITEMS_PER_ALBUM.toLocaleString("es-ES")} recuerdos por álbum.</li>
        <li>Hasta {MAX_ITEMS_PER_GUEST} recuerdos por invitado y álbum.</li>
      </ul>
      <p>
        Estos topes existen para que el servicio siga funcionando para todos y
        pueden ajustarse.
      </p>

      <h2>Copias de seguridad</h2>
      <p>
        Esto no es un archivo eterno. Descarga el álbum completo en ZIP cuando
        termine el evento y guárdalo donde guardes tus cosas importantes. Si el
        organizador borra el álbum, no hay vuelta atrás.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El servicio se presta tal cual, sin garantía de disponibilidad
        ininterrumpida. No respondemos de la pérdida de contenido: por eso lo
        anterior sobre descargar tu copia.
      </p>

      <h2>Privacidad</h2>
      <p>
        Qué datos se guardan y cómo pedir que se borren está en la{" "}
        <Link href="/legal/privacidad">página de privacidad</Link>.
      </p>

      <p className="mt-8 text-sm">Última actualización: julio de 2026.</p>
    </>
  );
}
