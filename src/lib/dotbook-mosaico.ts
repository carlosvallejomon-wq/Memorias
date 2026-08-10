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
 * 1. Una foto **con comentarios** siempre va sola: el comentario es de
 *    alguien y merece sitio para leerse.
 * 2. Un **vídeo** también va solo, porque lleva su QR y su leyenda.
 * 3. Lo que **no se puede incrustar** (un HEIC, un formato raro) va solo, con
 *    su QR grande.
 * 4. El resto se agrupa siguiendo un ritmo fijo, ajustado a la forma de las
 *    fotos: dos apaisadas se apilan, dos verticales van lado a lado, y una
 *    vertical suelta puede ir a sangre.
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
  tipo: "sangre" | "una" | "dosApiladas" | "dosLado" | "tres";
  indices: number[];
};

export function formaDe(ancho: number, alto: number): FormaFoto {
  const r = alto / ancho;
  if (r > 1.15) return "vertical";
  if (r < 0.87) return "apaisada";
  return "cuadrada";
}

/**
 * El ritmo del libro. Se recorre en bucle y de cada posición se coge lo que
 * quepa: si toca "tres" pero solo quedan dos fotas agrupables, se hace "dos".
 */
const RITMO: Composicion["tipo"][] = ["sangre", "dosApiladas", "una", "tres", "dosLado", "una"];

export function repartirEnPaginas(fotos: CandidataMosaico[]): Composicion[] {
  const paginas: Composicion[] = [];
  let i = 0;
  let paso = 0;

  while (i < fotos.length) {
    const foto = fotos[i];

    if (foto.sola) {
      paginas.push({ tipo: "una", indices: [foto.indice] });
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

    if ((quiere === "dosApiladas" || quiere === "dosLado") && b) {
      // La forma manda sobre el ritmo: dos verticales lado a lado aprovechan
      // la hoja, apiladas saldrían diminutas. Y al revés con las apaisadas.
      const dosVerticales = a.forma === "vertical" && b.forma === "vertical";
      paginas.push({
        tipo: dosVerticales ? "dosLado" : "dosApiladas",
        indices: [a.indice, b.indice],
      });
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
