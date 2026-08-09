import assert from "node:assert/strict";
import test from "node:test";
import { textoParaPdf } from "./build-dotbook";

// Las fuentes estándar del PDF lanzan una excepción con cualquier carácter
// fuera de WinAnsi. Como los comentarios los escriben los invitados desde el
// móvil, un solo emoji tumbaba la descarga del Dotbook entero.
test("el español entero pasa intacto", () => {
  const frase = "¡Qué día! La abuela Begoña cumplió 90 años — ¿te acuerdas?";
  assert.equal(textoParaPdf(frase), "¡Qué día! La abuela Begoña cumplió 90 años - ¿te acuerdas?");
});

test("los emoji corrientes se cambian por su equivalente escrito", () => {
  assert.equal(textoParaPdf("Qué guapos ❤️"), "Qué guapos <3");
  assert.equal(textoParaPdf("No puedo parar de reír 😂"), "No puedo parar de reír :D");
  assert.equal(textoParaPdf("Enhorabuena 👏"), "Enhorabuena !");
});

test("lo que no se puede escribir se quita, sin dejar la frase rota", () => {
  assert.equal(textoParaPdf("Felicidades 🎂🎈 pareja"), "Felicidades pareja");
  assert.equal(textoParaPdf("拍照 fotos"), "fotos");
});

test("las comillas y guiones tipográficos se cambian por los normales", () => {
  assert.equal(textoParaPdf("“Hola” y ‘adiós’…"), '"Hola" y \'adiós\'...');
});

test("todo lo que sale se puede escribir en WinAnsi", async () => {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const entradas = [
    "❤️😂🎉 Enhorabuena a los dos 👏👏",
    "こんにちは",
    "Que seáis muy felices — Los primos ✨",
    "🥹",
    "",
  ];
  for (const e of entradas) {
    // Si algo no fuera representable, esto lanzaría; el test es que no lo haga.
    assert.doesNotThrow(() => font.widthOfTextAtSize(textoParaPdf(e), 12));
  }
});

// El encabezado de cada página lleva espacios de más a propósito, para que las
// letras salgan separadas. Colapsar espacios se lo cargaba.
test("los espacios puestos a propósito no se tocan", () => {
  assert.equal(
    textoParaPdf("M E M O R I A S   V I V A S"),
    "M E M O R I A S   V I V A S",
  );
});
