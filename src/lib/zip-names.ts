// Nombres de archivo del ZIP de descarga. En su propio módulo para poder
// probarlos sin arrancar la app.

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Nombre de un recuerdo dentro del ZIP. Va numerado para que al abrirlo salgan
 * en el orden del evento, y sin caracteres que rompan carpetas en Windows.
 */
export function zipEntryName(
  index: number,
  pathname: string | null,
  type: string,
): string {
  const original = pathname?.split("/").pop();
  const fallback = `recuerdo-${index}${type === "video" ? ".mp4" : ".jpg"}`;
  const safe = (original || fallback).replace(/[\\/:*?"<>|]/g, "_");
  return `${String(index).padStart(3, "0")}-${safe}`;
}
