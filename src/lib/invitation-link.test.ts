import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeInvitationLink, encodeInvitationLink, type InvitationLinkState } from "./invitation-link";

const base: InvitationLinkState = {
  t: "quince-pastel",
  n: "Los XV de Valentina",
  u: "https://ejemplo.com/a/abc123",
  tx: { x: 1, y: 2, fontSize: 10, fontFamily: "serif", color: "#000", maxWidth: 100 },
  q: { x: 1, y: 2, size: 10 },
};

/** Lo que hace el navegador: el enlace se arma y `useSearchParams` lo lee. */
function idaYVuelta(state: InvitationLinkState) {
  const url = new URL(`https://ejemplo.com/invitacion?d=${encodeInvitationLink(state)}`);
  return decodeInvitationLink(url.searchParams.get("d") ?? "");
}

test("una invitación se recupera igual que se guardó", () => {
  assert.deepEqual(idaYVuelta(base), base);
});

test("un texto con % no rompe el enlace", () => {
  // Antes se decodificaba dos veces y "10%" dejaba un escape a medias, así
  // que la invitación entera se abría con «este enlace no es válido».
  const conPorcentaje = { ...base, ho: "Hotel Plaza · 10% con el código XV" };
  assert.deepEqual(idaYVuelta(conPorcentaje), conPorcentaje);
});

test("se aceptan también los enlaces que llegan sin decodificar", () => {
  const crudo = encodeInvitationLink(base);
  assert.deepEqual(decodeInvitationLink(crudo), base);
});

test("acentos, saltos de línea y comillas sobreviven", () => {
  const raro = { ...base, av: 'Solo adultos\nTraed "algo" para brindar\n50% ñ é ✦' };
  assert.deepEqual(idaYVuelta(raro), raro);
});

test("una invitación incompleta se rechaza", () => {
  assert.equal(decodeInvitationLink('{"n":"sin plantilla"}'), null);
  assert.equal(decodeInvitationLink("no es json"), null);
});
