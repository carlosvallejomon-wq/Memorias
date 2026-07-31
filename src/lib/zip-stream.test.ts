import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, createZipStream, dosDateTime } from "./zip-stream";

function streamOf(text: string, chunk = 7): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += chunk) c.enqueue(bytes.slice(i, i + chunk));
      c.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

test("crc32 coincide con el valor conocido de la especificación", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("crc32 da lo mismo troceado que de una vez", () => {
  const bytes = new TextEncoder().encode("hola mundo, esto se trocea");
  const entero = crc32(bytes);
  let parcial = 0;
  for (let i = 0; i < bytes.length; i += 5) parcial = crc32(bytes.slice(i, i + 5), parcial);
  assert.equal(parcial, entero);
});

test("dosDateTime no baja de 1980, que es el mínimo del formato ZIP", () => {
  const { date } = dosDateTime(new Date("1970-01-01T00:00:00Z"));
  assert.equal(date >> 9, 0); // año 1980
});

test("el ZIP generado lo abre el descompresor del sistema", async () => {
  const contenido = "hola mundo\n".repeat(40);
  const zip = createZipStream([
    { name: "001-hola.txt", date: new Date("2026-07-18T12:30:00Z"), open: async () => streamOf(contenido) },
    // Un archivo que no se puede descargar se salta sin romper el resto.
    { name: "002-roto.jpg", open: async () => null },
    { name: "003-ñandú.txt", open: async () => streamOf("acentos: ñáéíóú\n") },
  ]);

  const dir = mkdtempSync(join(tmpdir(), "zip-test-"));
  const file = join(dir, "prueba.zip");
  writeFileSync(file, await collect(zip));

  // -t comprueba las sumas CRC de todas las entradas.
  const salida = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
  assert.match(salida, /No errors detected/);
  assert.match(salida, /001-hola\.txt/);
  assert.match(salida, /003-ñandú\.txt/);
  assert.doesNotMatch(salida, /002-roto/);

  execFileSync("unzip", ["-o", "-d", dir, file]);
  const { readFileSync } = await import("node:fs");
  assert.equal(readFileSync(join(dir, "001-hola.txt"), "utf8"), contenido);
  assert.equal(readFileSync(join(dir, "003-ñandú.txt"), "utf8"), "acentos: ñáéíóú\n");
});
