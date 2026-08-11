import assert from "node:assert/strict";
import test from "node:test";
import { cabeDePie, formaDe, repartirEnPaginas, type CandidataMosaico } from "./dotbook-mosaico";

const foto = (indice: number, forma: CandidataMosaico["forma"], sola = false): CandidataMosaico => ({
  indice,
  forma,
  sola,
});

test("reconoce la forma de la foto", () => {
  assert.equal(formaDe(3000, 4000), "vertical");
  assert.equal(formaDe(4000, 3000), "apaisada");
  assert.equal(formaDe(2000, 2000), "cuadrada");
});

test("lo que va solo no se agrupa nunca", () => {
  const paginas = repartirEnPaginas([
    foto(1, "apaisada", true),
    foto(2, "apaisada", true),
    foto(3, "apaisada", true),
  ]);
  assert.deepEqual(
    paginas.map((p) => p.tipo),
    ["una", "una", "una"],
  );
});

test("las fotos sueltas se reparten en composiciones distintas", () => {
  // Mezcladas, como llegan de un evento: así el ritmo puede usar también la
  // página a sangre, que solo luce con una vertical.
  const paginas = repartirEnPaginas(
    Array.from({ length: 12 }, (_, i) => foto(i + 1, i % 2 ? "vertical" : "apaisada")),
  );
  const tipos = new Set(paginas.map((p) => p.tipo));
  assert.ok(tipos.size >= 3, `esperaba variedad, salió ${[...tipos].join(",")}`);
  // Ninguna foto se pierde ni se repite.
  const usados = paginas.flatMap((p) => p.indices);
  assert.deepEqual(usados.sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
});

test("un comentario corto no obliga a página entera", () => {
  assert.equal(cabeDePie(["Qué día tan bonito"]), true);
  assert.equal(cabeDePie(["uno", "dos"]), false, "dos comentarios piden su página");
  assert.equal(cabeDePie(["x".repeat(200)]), false, "uno largo también");
  assert.equal(cabeDePie([]), false);
});

test("no se saca una foto sola cuando se puede emparejar", () => {
  // Ocho agrupables seguidas: ninguna debería acabar sola salvo la que el
  // ritmo reserva a propósito. Antes, cada composición que no cabía degeneraba
  // en una página de una foto y el libro volvía a ser un listado.
  const paginas = repartirEnPaginas(Array.from({ length: 8 }, (_, i) => foto(i + 1, "apaisada")));
  const sueltas = paginas.filter((p) => p.indices.length === 1).length;
  assert.ok(sueltas <= 1, `esperaba como mucho una suelta, salieron ${sueltas}`);
});

test("con pocas fotos no se inventa una composición que no cabe", () => {
  const paginas = repartirEnPaginas([foto(1, "apaisada")]);
  assert.equal(paginas.length, 1);
  assert.equal(paginas[0].indices.length, 1);
});

test("nunca se pierde ni se duplica una foto, agrupables o no", () => {
  const mezcla = [
    foto(1, "vertical"), foto(2, "apaisada", true), foto(3, "vertical"),
    foto(4, "cuadrada"), foto(5, "apaisada"), foto(6, "vertical", true),
    foto(7, "apaisada"), foto(8, "vertical"), foto(9, "cuadrada"),
  ];
  const usados = repartirEnPaginas(mezcla).flatMap((p) => p.indices);
  assert.deepEqual(usados.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
