import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

  const bytes = await collect(zip);
  const dir = mkdtempSync(join(tmpdir(), "zip-test-"));
  const file = join(dir, "prueba.zip");
  writeFileSync(file, bytes);

  if (process.platform === "win32") {
    const destino = join(dir, "extraido");
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "& { param($zip, $destino) Expand-Archive -LiteralPath $zip -DestinationPath $destino -Force }",
      file,
      destino,
    ]);
    assert.equal(readFileSync(join(destino, "001-hola.txt"), "utf8"), contenido);
  } else {
    const salida = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
    assert.match(salida, /No errors detected/);
    assert.match(salida, /001-hola\.txt/);
    assert.doesNotMatch(salida, /002-roto/);

    execFileSync("unzip", ["-o", "-d", dir, file]);
    assert.equal(readFileSync(join(dir, "001-hola.txt"), "utf8"), contenido);
  }

  // Los nombres con acentos no se comprueban leyendo lo que imprime `unzip`:
  // cómo los dibuja depende del idioma configurado en la máquina (en el
  // servidor de GitHub salen ilegibles aunque el ZIP esté perfecto). Se miran
  // los bytes del propio archivo, que es lo que de verdad importa.
  const { nombres, banderas } = leerNombres(bytes);
  assert.deepEqual(nombres, ["001-hola.txt", "003-ñandú.txt"]);
  // Bit 11 encendido = "el nombre va en UTF-8", que es lo que hace que
  // Windows y macOS lo abran bien.
  assert.ok(
    banderas.every((f) => (f & 0x800) !== 0),
    "los nombres deben ir marcados como UTF-8",
  );
});

/** Lee los nombres de las cabeceras locales del ZIP, sin descomprimir nada. */
function leerNombres(zip: Uint8Array): { nombres: string[]; banderas: number[] } {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const nombres: string[] = [];
  const banderas: number[] = [];
  for (let i = 0; i + 30 <= zip.length; i++) {
    if (view.getUint32(i, true) !== 0x04034b50) continue;
    const bandera = view.getUint16(i + 6, true);
    const largo = view.getUint16(i + 26, true);
    nombres.push(new TextDecoder("utf-8").decode(zip.slice(i + 30, i + 30 + largo)));
    banderas.push(bandera);
  }
  return { nombres, banderas };
}
