// Escritor de ZIP en streaming.
//
// La versión anterior metía todas las fotos del álbum en memoria y luego
// generaba el ZIP de una vez: con una boda de 500 fotos (2 GB) el servidor se
// quedaba sin memoria y el organizador no recibía nada.
//
// Aquí se va escribiendo el ZIP archivo a archivo según se descarga cada uno
// del almacenamiento, así que la memoria usada es la de UN archivo, no la del
// álbum entero. Se guarda sin comprimir (método "store") porque las fotos y
// los vídeos ya vienen comprimidos: comprimir otra vez cuesta CPU y no ahorra
// casi nada.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Uint8Array, seed = 0): number {
  let c = ~seed >>> 0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** Fecha y hora en el formato MS-DOS que exige el ZIP. */
export function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 31),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

type Entry = { name: Uint8Array; crc: number; size: number; offset: number; time: number; date: number };

function u32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

export type ZipSource = {
  /** Nombre del archivo dentro del ZIP. */
  name: string;
  /** Fecha que se le pone dentro del ZIP. */
  date?: Date;
  /** Devuelve el contenido, o null si no se pudo obtener (se salta). */
  open: () => Promise<ReadableStream<Uint8Array> | null>;
};

/**
 * Devuelve un ReadableStream con el ZIP completo. Va pidiendo cada archivo
 * solo cuando le toca, así que nunca hay más de uno en memoria.
 */
export function createZipStream(sources: ZipSource[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const entries: Entry[] = [];
  let offset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Este generador se ejecuta una sola vez de principio a fin: `pull` se
      // llama tras encolar, y cerramos al terminar.
      for (const source of sources) {
        const stream = await source.open();
        if (!stream) continue;

        // El ZIP necesita el CRC y el tamaño ANTES del contenido si no usamos
        // descriptor de datos. Usamos el descriptor (bit 3 del flag) para no
        // tener que leer el archivo dos veces.
        const name = encoder.encode(source.name);
        const { time, date } = dosDateTime(source.date ?? new Date());

        const local = new Uint8Array(30 + name.length);
        const lv = new DataView(local.buffer);
        u32(lv, 0, 0x04034b50); // firma de cabecera local
        lv.setUint16(4, 20, true); // versión necesaria
        lv.setUint16(6, 0x0808, true); // bit 3: descriptor al final · bit 11: nombre en UTF-8
        lv.setUint16(8, 0, true); // método: sin comprimir
        lv.setUint16(10, time, true);
        lv.setUint16(12, date, true);
        u32(lv, 14, 0); // crc (va en el descriptor)
        u32(lv, 18, 0); // tamaño comprimido (idem)
        u32(lv, 22, 0); // tamaño sin comprimir (idem)
        lv.setUint16(26, name.length, true);
        lv.setUint16(28, 0, true); // sin campos extra
        local.set(name, 30);
        controller.enqueue(local);
        const entryOffset = offset;
        offset += local.length;

        let crc = 0;
        let size = 0;
        const reader = stream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            crc = crc32(value, crc);
            size += value.length;
            offset += value.length;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }

        const descriptor = new Uint8Array(16);
        const dv = new DataView(descriptor.buffer);
        u32(dv, 0, 0x08074b50);
        u32(dv, 4, crc);
        u32(dv, 8, size);
        u32(dv, 12, size);
        controller.enqueue(descriptor);
        offset += descriptor.length;

        entries.push({ name, crc, size, offset: entryOffset, time, date });
      }

      // Índice final: la lista de todo lo que lleva dentro.
      const centralStart = offset;
      for (const e of entries) {
        const header = new Uint8Array(46 + e.name.length);
        const hv = new DataView(header.buffer);
        u32(hv, 0, 0x02014b50);
        hv.setUint16(4, 20, true); // versión que lo creó
        hv.setUint16(6, 20, true); // versión necesaria
        hv.setUint16(8, 0x0808, true);
        hv.setUint16(10, 0, true);
        hv.setUint16(12, e.time, true);
        hv.setUint16(14, e.date, true);
        u32(hv, 16, e.crc);
        u32(hv, 20, e.size);
        u32(hv, 24, e.size);
        hv.setUint16(28, e.name.length, true);
        hv.setUint16(30, 0, true);
        hv.setUint16(32, 0, true);
        hv.setUint16(34, 0, true);
        hv.setUint16(36, 0, true);
        u32(hv, 38, 0);
        u32(hv, 42, e.offset);
        header.set(e.name, 46);
        controller.enqueue(header);
        offset += header.length;
      }

      const end = new Uint8Array(22);
      const ev = new DataView(end.buffer);
      u32(ev, 0, 0x06054b50);
      ev.setUint16(4, 0, true);
      ev.setUint16(6, 0, true);
      ev.setUint16(8, entries.length, true);
      ev.setUint16(10, entries.length, true);
      u32(ev, 12, offset - centralStart);
      u32(ev, 16, centralStart);
      ev.setUint16(20, 0, true);
      controller.enqueue(end);

      controller.close();
    },
  });
}
