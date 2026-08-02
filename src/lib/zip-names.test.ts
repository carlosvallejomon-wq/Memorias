import assert from "node:assert/strict";
import test from "node:test";
import { slugify, zipEntryName } from "./zip-names";

test("el nombre del ZIP quita acentos y caracteres raros", () => {
  assert.equal(slugify("Boda de Ana & Luis"), "boda-de-ana-luis");
  assert.equal(slugify("Cumpleaños de Martín"), "cumpleanos-de-martin");
  assert.equal(slugify("¡¡¡!!!"), "");
});

test("los recuerdos se numeran para que salgan en orden", () => {
  assert.equal(zipEntryName(1, "abc/IMG_001.jpg", "image"), "001-IMG_001.jpg");
  assert.equal(zipEntryName(42, "x/clip.mp4", "video"), "042-clip.mp4");
});

test("si no hay nombre original se inventa uno con la extensión correcta", () => {
  assert.equal(zipEntryName(7, null, "video"), "007-recuerdo-7.mp4");
  assert.equal(zipEntryName(7, null, "image"), "007-recuerdo-7.jpg");
});

test("se limpian los caracteres que rompen carpetas en Windows", () => {
  assert.equal(zipEntryName(3, 'x/fo:to*"raro".jpg', "image"), '003-fo_to__raro_.jpg');
});
