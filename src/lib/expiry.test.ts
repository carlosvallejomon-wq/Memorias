import assert from "node:assert/strict";
import test from "node:test";
import { daysUntil, expiryWarning, isExpired } from "./expiry";

const AHORA = new Date("2026-07-31T12:00:00Z").getTime();
const enDias = (d: number) => new Date(AHORA + d * 24 * 60 * 60 * 1000);

test("sin fecha, un álbum no caduca nunca", () => {
  assert.equal(isExpired(null), false);
  assert.equal(isExpired(undefined), false);
  assert.equal(expiryWarning(null), null);
});

test("caduca solo cuando la fecha ya pasó", () => {
  assert.equal(isExpired(enDias(1), AHORA), false);
  assert.equal(isExpired(enDias(-1), AHORA), true);
  // Justo en el instante marcado ya cuenta como caducado.
  assert.equal(isExpired(new Date(AHORA), AHORA), true);
});

test("cuenta bien los días que faltan", () => {
  assert.equal(daysUntil(enDias(10), AHORA), 10);
  assert.equal(daysUntil(enDias(-3), AHORA), -3);
});

test("el aviso se vuelve urgente según se acerca", () => {
  assert.equal(expiryWarning(enDias(200), AHORA)?.urgente, false);
  assert.equal(expiryWarning(enDias(20), AHORA)?.urgente, false);
  assert.equal(expiryWarning(enDias(5), AHORA)?.urgente, true);
  assert.equal(expiryWarning(enDias(1), AHORA)?.urgente, true);
  assert.match(expiryWarning(enDias(1), AHORA)!.texto, /mañana/);
  assert.match(expiryWarning(enDias(-2), AHORA)!.texto, /ya se ha cerrado/);
});

test("a más de un mes vista se dice la fecha, no la cuenta atrás", () => {
  const aviso = expiryWarning(new Date("2027-01-15T12:00:00Z"), AHORA)!;
  assert.match(aviso.texto, /15 de enero de 2027/);
  assert.equal(aviso.urgente, false);
});
