import assert from "node:assert/strict";
import test from "node:test";
import { isVideo, looksLikeHeic } from "./prepare-upload";

// `File` existe en Node 20+, así que se pueden probar sin navegador.
function archivo(name: string, type = ""): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

test("reconoce los HEIC del iPhone por tipo y por extensión", () => {
  assert.ok(looksLikeHeic(archivo("IMG_0001.HEIC")));
  assert.ok(looksLikeHeic(archivo("foto.heif")));
  // Android manda a veces el archivo sin declarar el tipo.
  assert.ok(looksLikeHeic(archivo("IMG_0002.heic", "")));
  assert.ok(looksLikeHeic(archivo("sin-extension", "image/heic")));
  assert.ok(looksLikeHeic(archivo("secuencia", "image/heic-sequence")));
});

test("no confunde un JPG normal con un HEIC", () => {
  assert.equal(looksLikeHeic(archivo("foto.jpg", "image/jpeg")), false);
  assert.equal(looksLikeHeic(archivo("foto.png", "image/png")), false);
  // Un nombre que contiene "heic" pero no acaba en .heic.
  assert.equal(looksLikeHeic(archivo("heicos-en-la-boda.jpg", "image/jpeg")), false);
});

test("reconoce vídeos por tipo y por extensión", () => {
  assert.ok(isVideo(archivo("clip.mp4", "video/mp4")));
  assert.ok(isVideo(archivo("IMG_1234.MOV")));
  assert.ok(isVideo(archivo("grabacion.webm")));
  assert.equal(isVideo(archivo("foto.jpg", "image/jpeg")), false);
});
