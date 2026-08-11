/**
 * Iconos dibujados para el Dotbook.
 *
 * Los invitados escriben con emoji, pero las fuentes del PDF no los saben
 * escribir. La primera solución fue traducirlos a texto (❤️ → <3), y funcionaba,
 * pero en un libro de recuerdos impreso eso se lee como un mensaje de móvil,
 * no como un álbum.
 *
 * Aquí van dibujados a mano en trazado vectorial, sobre una rejilla de 24×24,
 * y se pintan del mismo color que el texto que los rodea. Salen nítidos a
 * cualquier tamaño, pesan nada y van a juego con el resto del libro (que ya
 * usa vectores para la ramita de las esquinas).
 *
 * Cada icono puede tener relleno, trazo o los dos: una cara, por ejemplo, es
 * un círculo de trazo con los ojos rellenos.
 */
export type IconoDotbook = {
  /** Trazado que se pinta macizo. */
  relleno?: string;
  /** Trazado que se pinta solo de línea. */
  trazo?: string;
  /** Grosor de esa línea, en la rejilla de 24. */
  grosor?: number;
};

const CARA = "M12 3.2 A 8.8 8.8 0 1 1 11.99 3.2 Z";

export const ICONOS: Record<string, IconoDotbook> = {
  corazon: {
    relleno:
      "M12 20.8 C 12 20.8 3.2 14.4 3.2 8.9 C 3.2 5.8 5.6 3.4 8.5 3.4 C 10.2 3.4 11.4 4.3 12 5.2 C 12.6 4.3 13.8 3.4 15.5 3.4 C 18.4 3.4 20.8 5.8 20.8 8.9 C 20.8 14.4 12 20.8 12 20.8 Z",
  },
  sonrisa: {
    trazo: `${CARA} M7.8 14.2 C 9 16.2 15 16.2 16.2 14.2`,
    relleno: "M9 9.6 A 1.15 1.15 0 1 1 8.99 9.6 Z M15 9.6 A 1.15 1.15 0 1 1 14.99 9.6 Z",
    grosor: 1.3,
  },
  risa: {
    // Ojos cerrados de reír y boca abierta: se distingue de la sonrisa normal
    // incluso impreso a ocho puntos.
    trazo: `${CARA} M7.3 9.9 C 8.1 8.7 9.7 8.7 10.5 9.9 M13.5 9.9 C 14.3 8.7 15.9 8.7 16.7 9.9`,
    relleno: "M7.4 13.2 L 16.6 13.2 C 16.6 16.6 14.4 18.4 12 18.4 C 9.6 18.4 7.4 16.6 7.4 13.2 Z",
    grosor: 1.3,
  },
  llanto: {
    // La lágrima va despegada del ojo y por debajo: pegada a la boca se
    // confundía con ella y a tamaño de leyenda salía un borrón.
    trazo: `${CARA} M8.6 16.8 C 9.8 15 14.2 15 15.4 16.8`,
    relleno:
      "M9 9.4 A 1.15 1.15 0 1 1 8.99 9.4 Z M15 9.4 A 1.15 1.15 0 1 1 14.99 9.4 Z M16.9 11.8 C 18 13.5 18.5 14.4 18.5 15.1 A 1.6 1.6 0 0 1 15.3 15.1 C 15.3 14.4 15.8 13.5 16.9 11.8 Z",
    grosor: 1.3,
  },
  asombro: {
    trazo: CARA,
    relleno:
      "M9 9.4 A 1.15 1.15 0 1 1 8.99 9.4 Z M15 9.4 A 1.15 1.15 0 1 1 14.99 9.4 Z M12 13.2 A 2.3 2.6 0 1 1 11.99 13.2 Z",
    grosor: 1.3,
  },
  estrella: {
    relleno:
      "M12 2.6 L 14.9 8.9 L 21.6 9.7 L 16.7 14.4 L 18 21.1 L 12 17.8 L 6 21.1 L 7.3 14.4 L 2.4 9.7 L 9.1 8.9 Z",
  },
  destello: {
    relleno:
      "M12 2.2 C 13 8 14.2 9.4 20 10.8 C 14.2 12.2 13 13.6 12 19.4 C 11 13.6 9.8 12.2 4 10.8 C 9.8 9.4 11 8 12 2.2 Z",
  },
  tarta: {
    relleno:
      "M3.6 14.4 C 3.6 12.9 4.8 11.8 6.2 11.8 L 17.8 11.8 C 19.2 11.8 20.4 12.9 20.4 14.4 L 20.4 19.6 L 3.6 19.6 Z M11.3 5.2 C 11.3 4.2 12 3.2 12 3.2 C 12 3.2 12.7 4.2 12.7 5.2 C 12.7 5.9 12.4 6.4 12 6.4 C 11.6 6.4 11.3 5.9 11.3 5.2 Z",
    trazo: "M12 7 L 12 11.5",
    grosor: 1.1,
  },
  brindis: {
    // Dos copas de líneas rectas. Con las curvas del cáliz no se leía nada
    // impreso a tamaño pequeño: quedaban dos rayas sueltas.
    trazo:
      "M4.2 3.6 L 10.8 3.6 L 7.5 11.2 Z M7.5 11.2 L 7.5 18.4 M4.8 18.4 L 10.2 18.4 M13.2 3.6 L 19.8 3.6 L 16.5 11.2 Z M16.5 11.2 L 16.5 18.4 M13.8 18.4 L 19.2 18.4",
    grosor: 1.4,
  },
  anillo: {
    // El aro empieza en su punto más alto (y=9), no en el más bajo: arrancando
    // abajo el círculo se salía de la rejilla y quedaba suelto bajo el brillante.
    trazo: "M12 9 A 6 6 0 1 1 11.99 9 Z",
    relleno: "M12 1.6 L 15.5 5.6 L 12 9.6 L 8.5 5.6 Z",
    grosor: 1.6,
  },
  camara: {
    trazo:
      "M2.8 8 L 8 8 L 9.6 5.4 L 14.4 5.4 L 16 8 L 21.2 8 C 21.9 8 22.4 8.6 22.4 9.2 L 22.4 18 C 22.4 18.7 21.9 19.2 21.2 19.2 L 2.8 19.2 C 2.1 19.2 1.6 18.7 1.6 18 L 1.6 9.2 C 1.6 8.6 2.1 8 2.8 8 Z M12 17.4 A 4 4 0 1 1 11.99 17.4 Z",
    grosor: 1.4,
  },
  flor: {
    // Cinco pétalos y el corazón, solo de línea. Rellena salía una mancha con
    // forma de trébol: el círculo del centro era del mismo color y no se veía.
    trazo:
      "M12 4.4 A 3.4 3.4 0 1 1 11.99 4.4 Z M15.99 7.3 A 3.4 3.4 0 1 1 15.98 7.3 Z M14.47 12 A 3.4 3.4 0 1 1 14.46 12 Z M9.53 12 A 3.4 3.4 0 1 1 9.52 12 Z M8.01 7.3 A 3.4 3.4 0 1 1 8 7.3 Z M12 10 A 2 2 0 1 1 11.99 10 Z",
    grosor: 1.2,
  },
  regalo: {
    relleno:
      "M3.4 10.6 L 20.6 10.6 L 20.6 20.4 L 3.4 20.4 Z M2.4 6.6 L 21.6 6.6 L 21.6 9.6 L 2.4 9.6 Z",
    trazo: "M12 6.4 C 12 4 10.6 2.6 9 2.6 C 7.6 2.6 6.8 3.6 6.8 4.6 C 6.8 5.8 7.8 6.6 12 6.6 C 16.2 6.6 17.2 5.8 17.2 4.6 C 17.2 3.6 16.4 2.6 15 2.6 C 13.4 2.6 12 4 12 6.4 Z",
    grosor: 1.3,
  },
  globo: {
    trazo:
      "M12 2.6 C 15.4 2.6 18 5.4 18 9 C 18 12.8 15.2 16.2 12 16.2 C 8.8 16.2 6 12.8 6 9 C 6 5.4 8.6 2.6 12 2.6 Z M12 16.2 L 12 18 M12 18 C 13.2 19 10.8 19.6 12 21.4",
    grosor: 1.4,
  },
};

/**
 * Qué emoji se dibuja con qué icono.
 *
 * Se mapea con generosidad: todos los corazones al mismo corazón, todas las
 * caras contentas a la misma sonrisa. Lo que no esté aquí se quita del texto,
 * como antes — es preferible una frase limpia a un cuadrado vacío.
 */
export const EMOJI_A_ICONO: Record<string, keyof typeof ICONOS> = {};

function mapear(icono: keyof typeof ICONOS, emojis: string[]) {
  for (const e of emojis) EMOJI_A_ICONO[e] = icono;
}

mapear("corazon", ["❤", "🧡", "💛", "💚", "💙", "💜", "🤍", "🖤", "🤎", "💕", "💖", "💗", "💘", "💝", "💞", "💓", "♥", "😍", "🥰", "😘", "💑", "👩‍❤️‍👨"]);
mapear("risa", ["😂", "🤣", "😆", "😹"]);
mapear("sonrisa", ["😀", "😃", "😄", "😁", "🙂", "😊", "☺", "😌", "🥳"]);
mapear("llanto", ["😢", "😭", "🥹", "😥", "🥲"]);
mapear("asombro", ["😮", "😲", "😯", "🤩", "😱"]);
mapear("estrella", ["⭐", "🌟", "👏", "🙌", "💯", "🏆"]);
mapear("destello", ["✨", "🎇", "🎆", "💫"]);
mapear("tarta", ["🎂", "🧁", "🍰"]);
mapear("brindis", ["🥂", "🍾", "🍻", "🍷", "🥃"]);
mapear("anillo", ["💍", "👰", "🤵", "💒"]);
mapear("camara", ["📸", "📷", "🎥", "📹"]);
mapear("flor", ["🌹", "🌸", "💐", "🌺", "🌻", "🌷", "🏵"]);
mapear("regalo", ["🎁", "🎀"]);
mapear("globo", ["🎈", "🎉", "🎊", "🪅"]);
