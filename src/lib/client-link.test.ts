import assert from "node:assert/strict";
import test from "node:test";
import { clientLinkPath, clientToken, isValidClientToken } from "./client-link";

const ALBUM = "11111111-1111-1111-1111-111111111111";
const OTRO = "22222222-2222-2222-2222-222222222222";

test("el token vale solo para su álbum", () => {
  assert.ok(isValidClientToken(ALBUM, clientToken(ALBUM)));
  assert.ok(!isValidClientToken(OTRO, clientToken(ALBUM)));
});

test("no cuela nada que no sea el token exacto", () => {
  const bueno = clientToken(ALBUM);
  assert.ok(!isValidClientToken(ALBUM, null));
  assert.ok(!isValidClientToken(ALBUM, ""));
  assert.ok(!isValidClientToken(ALBUM, bueno.slice(0, -1)));
  assert.ok(!isValidClientToken(ALBUM, bueno + "0"));
  assert.ok(!isValidClientToken(ALBUM, bueno.slice(0, -1) + (bueno.endsWith("a") ? "b" : "a")));
});

test("el token es estable: el mismo enlace sigue valiendo mañana", () => {
  assert.equal(clientToken(ALBUM), clientToken(ALBUM));
});

test("el enlace lleva el código de compartir y el token", () => {
  const ruta = clientLinkPath("bodaana", ALBUM);
  assert.equal(ruta, `/a/bodaana/personalizar?k=${clientToken(ALBUM)}`);
});
