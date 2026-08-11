/**
 * Cómo se reparten las fotos por las páginas del libro.
 *
 * Una foto por hoja, doscientas veces seguidas, es lo que hacía que el
 * Dotbook pareciera un listado y no un álbum: todas las páginas idénticas y
 * media hoja desaprovechada en cuanto la foto era apaisada. Un álbum de
 * verdad alterna — una a toda página, dos juntas, una grande con dos
 * pequeñas — y ese ritmo es la mitad de lo que hace que se vea cuidado.
 *
 * Reglas, en orden:
 *
 * 1. Una foto con **mucho que leer** —varios comentarios, o uno largo— va
 *    sola: el texto es de alguien y merece sitio. Un comentario corto NO
 *    obliga a página entera; se imprime de pie de foto dentro del mosaico.
 *    (Antes bastaba un comentario para separarla, y en un álbum real donde la
 *    gente comenta casi todo el libro volvía a ser una foto por hoja.)
 * 2. Un **vídeo** también va solo, porque lleva su QR y su leyenda.
 * 3. Lo que **no se puede incrustar** (un HEIC, un formato raro) va solo, con
 *    su QR grande.
 * 4. El resto se agrupa siguiendo un ritmo fijo: páginas de dos, de tres, y
 *    de vez en cuando una vertical a toda hoja.
 *
 * El ritmo es fijo a propósito (no aleatorio): el mismo álbum genera siempre
 * el mismo libro, que es lo que se espera al volver a descargarlo.
 */

export type FormaFoto = "vertical" | "apaisada" | "cuadrada";

export type CandidataMosaico = {
  /** Índice dentro de la lista de recuerdos, para numerar las páginas. */
  indice: number;
  forma: FormaFoto;
  /** Si va sola sí o sí: tiene comentarios, es vídeo o no se pudo incrustar. */
  sola: boolean;
};

export type Composicion = {
  /**
   * Cuántas fotos lleva la página. Si van apiladas o lado a lado no se decide
   * aquí: eso depende de los píxeles de verdad de cada foto, que solo conoce
   * quien la dibuja. Aquí solo se sabe la forma a grandes rasgos.
   */
  tipo: "sangre" | "una" | "dos" | "tres";
  indices: number[];
};

/**
 * Hasta aquí cabe un comentario como pie de foto dentro de un mosaico. Más
 * largo que esto pide su propia página para poder leerse.
 */
export const PIE_MAX_CARACTERES = 90;

export function cabeDePie(comentarios: string[]): boolean {
  return comentarios.length === 1 && comentarios[0].trim().length <= PIE_MAX_CARACTERES;
}

export function formaDe(ancho: number, alto: number): FormaFoto {
  const r = alto / ancho;
  if (r > 1.15) return "vertical";
  if (r < 0.87) return "apaisada";
  return "cuadrada";
}

/**
 * El ritmo del libro. Se recorre en bucle, y de cada posición se coge lo que
 * quepa.
 *
 * Solo hay **una** página de foto suelta en la vuelta entera, y es a
 * propósito: cuando una composición no se puede montar —toca "tres" y solo
 * quedan dos agrupables, o toca una a sangre y la foto es apaisada— se junta
 * lo que haya en vez de sacar la foto sola. Antes esos casos caían todos en
 * "una" y el libro volvía a llenarse de páginas de una foto sin quererlo.
 */
const RITMO: Composicion["tipo"][] = ["dos", "tres", "sangre", "dos", "tres", "una"];

export function repartirEnPaginas(fotos: CandidataMosaico[]): Composicion[] {
  const paginas: Composicion[] = [];
  let i = 0;
  let paso = 0;

  while (i < fotos.length) {
    if (fotos[i].sola) {
      paginas.push({ tipo: "una", indices: [fotos[i].indice] });
      i++;
      continue;
    }

    // Cuántas agrupables hay seguidas a partir de aquí.
    let seguidas = 0;
    while (i + seguidas < fotos.length && !fotos[i + seguidas].sola) seguidas++;

    const quiere = RITMO[paso % RITMO.length];
    paso++;

    const a = fotos[i];
    const b = seguidas > 1 ? fotos[i + 1] : null;
    const c = seguidas > 2 ? fotos[i + 2] : null;

    if (quiere === "tres" && c) {
      paginas.push({ tipo: "tres", indices: [a.indice, b!.indice, c.indice] });
      i += 3;
      continue;
    }

    // Una a sangre solo luce con una foto vertical: es la que llena la hoja.
    // Si la que toca es apaisada, mejor emparejarla que dejarla suelta.
    const quiereDos =
      quiere === "dos" || quiere === "tres" || (quiere === "sangre" && a.forma !== "vertical");

    if (quiereDos && b) {
      paginas.push({ tipo: "dos", indices: [a.indice, b.indice] });
      i += 2;
      continue;
    }

    if (quiere === "sangre" && a.forma === "vertical") {
      paginas.push({ tipo: "sangre", indices: [a.indice] });
      i++;
      continue;
    }

    paginas.push({ tipo: "una", indices: [a.indice] });
    i++;
  }

  return paginas;
}
