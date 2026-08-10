import assert from "node:assert/strict";
import test from "node:test";
import { formaDe, repartirEnPaginas, type CandidataMosaico } from "./dotbook-mosaico";

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

test("una foto con comentario no se agrupa nunca", () => {
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
  const paginas = repartirEnPaginas(Array.from({ length: 12 }, (_, i) => foto(i + 1, "apaisada")));
  const tipos = new Set(paginas.map((p) => p.tipo));
  assert.ok(tipos.size >= 3, `esperaba variedad, salió ${[...tipos].join(",")}`);
  // Ninguna foto se pierde ni se repite.
  const usados = paginas.flatMap((p) => p.indices);
  assert.deepEqual(usados.sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1));
});

test("dos verticales van lado a lado y dos apaisadas apiladas", () => {
  const verticales = repartirEnPaginas([foto(1, "vertical"), foto(2, "vertical")]);
  const apaisadas = repartirEnPaginas([foto(1, "apaisada"), foto(2, "apaisada")]);
  // La primera del ritmo es "sangre", que solo aplica a una vertical suelta.
  assert.ok(verticales.some((p) => p.tipo === "sangre" || p.tipo === "dosLado"));
  assert.ok(apaisadas.some((p) => p.tipo === "dosApiladas" || p.tipo === "una"));
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
