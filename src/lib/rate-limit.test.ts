import assert from "node:assert/strict";
import test from "node:test";
import { allow, clientKey } from "./rate-limit";

test("deja pasar hasta el tope y luego frena", () => {
  const clave = `prueba-${Math.random()}`;
  for (let i = 0; i < 5; i++) assert.ok(allow(clave, 5, 60_000), `intento ${i + 1}`);
  assert.equal(allow(clave, 5, 60_000), false);
});

test("al pasar la ventana vuelve a dejar pasar", async () => {
  const clave = `ventana-${Math.random()}`;
  assert.ok(allow(clave, 1, 30));
  assert.equal(allow(clave, 1, 30), false);
  await new Promise((r) => setTimeout(r, 45));
  assert.ok(allow(clave, 1, 30));
});

test("cada IP y cada acción cuentan por separado", () => {
  const a = `ip-a-${Math.random()}`;
  const b = `ip-b-${Math.random()}`;
  assert.ok(allow(a, 1, 60_000));
  assert.equal(allow(a, 1, 60_000), false);
  assert.ok(allow(b, 1, 60_000));
});

test("la clave sale de la cabecera del proxy", () => {
  const req = new Request("https://ejemplo.test", {
    headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
  });
  assert.equal(clientKey(req, "comentario"), "comentario:203.0.113.5");
  assert.equal(clientKey(new Request("https://ejemplo.test"), "x"), "x:desconocido");
});
