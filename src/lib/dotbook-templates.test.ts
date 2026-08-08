import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { TEMPLATE_COVER_LIST, isTemplateDotbookStyle } from "./dotbook-templates";

const DIR = join(process.cwd(), "public", "dotbook-templates");

async function existe(ruta: string) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

// Añadir una portada son tres pasos (imagen, miniatura y línea en la lista) y
// olvidarse de uno no rompe la compilación: la plantilla se puede elegir pero
// sale en blanco, o existe el archivo y nadie la ve. Esto lo detecta antes.
test("cada portada del catálogo tiene su imagen y su miniatura", async () => {
  for (const t of TEMPLATE_COVER_LIST) {
    assert.ok(await existe(join(DIR, t.file)), `falta la portada ${t.file}`);
    assert.ok(
      await existe(join(DIR, "thumbs", t.file)),
      `falta la miniatura de ${t.file}`,
    );
  }
});

test("no hay identificadores ni archivos repetidos", () => {
  const ids = TEMPLATE_COVER_LIST.map((t) => t.id);
  const files = TEMPLATE_COVER_LIST.map((t) => t.file);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(files).size, files.length);
});

test("solo se aceptan estilos que estén en el catálogo", () => {
  assert.ok(isTemplateDotbookStyle("realBodaCorazon"));
  assert.ok(!isTemplateDotbookStyle("realLoQueSea"));
  assert.ok(!isTemplateDotbookStyle("toString"));
});
