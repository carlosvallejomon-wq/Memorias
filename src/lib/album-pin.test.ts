import assert from "node:assert/strict";
import test from "node:test";
import {
  accessCookieValue,
  hasAccess,
  hashPin,
  isValidPin,
  verifyPin,
} from "./album-pin";

test("acepta códigos de 4 a 8 dígitos y rechaza el resto", () => {
  assert.ok(isValidPin("1234"));
  assert.ok(isValidPin("12345678"));
  assert.equal(isValidPin("123"), false);
  assert.equal(isValidPin("123456789"), false);
  assert.equal(isValidPin("12a4"), false);
  assert.equal(isValidPin(""), false);
});

test("el código no se guarda en claro", () => {
  const guardado = hashPin("2468");
  assert.ok(!guardado.includes("2468"));
  assert.ok(guardado.startsWith("scrypt:"));
});

test("verifica el código correcto y rechaza el equivocado", () => {
  const guardado = hashPin("2468");
  assert.ok(verifyPin("2468", guardado));
  assert.equal(verifyPin("2469", guardado), false);
  assert.equal(verifyPin("", guardado), false);
});

test("un álbum sin código deja pasar a cualquiera", () => {
  assert.ok(verifyPin("loquesea", null));
  assert.ok(hasAccess("album-1", null, undefined));
});

test("con código, solo pasa quien trae la cookie correcta", () => {
  const guardado = hashPin("1111");
  const cookie = accessCookieValue("album-1", guardado);
  assert.ok(hasAccess("album-1", guardado, cookie));
  assert.equal(hasAccess("album-1", guardado, undefined), false);
  assert.equal(hasAccess("album-1", guardado, "inventada"), false);
  // La cookie de un álbum no sirve para otro.
  assert.equal(hasAccess("album-2", guardado, cookie), false);
});

test("cambiar el código invalida los permisos ya dados", () => {
  const viejo = hashPin("1111");
  const cookieVieja = accessCookieValue("album-1", viejo);
  const nuevo = hashPin("2222");
  assert.equal(hasAccess("album-1", nuevo, cookieVieja), false);
});

test("quitar el código vuelve a abrir el álbum a todos", () => {
  assert.ok(hasAccess("album-1", null, "cualquier-cosa"));
});
