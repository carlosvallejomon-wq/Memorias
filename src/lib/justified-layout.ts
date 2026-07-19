import { useEffect, useRef, useState } from "react";

// Relación de aspecto de respaldo mientras no se conoce la real (la imagen o
// el vídeo todavía no ha cargado sus dimensiones naturales).
const DEFAULT_RATIO = 4 / 3;

export type JustifiedItem<T> = { item: T; width: number; height: number };

// Mide el ancho real del contenedor (sin el padding) para poder calcular
// filas "justificadas" que llenen todo el ancho disponible sin recortar
// ninguna foto — a diferencia de una cuadrícula o un masonry por columnas,
// aquí cada fila tiene una altura común y el ancho de cada foto es
// proporcional a su relación de aspecto real.
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function fitRow<T extends { id: string }>(
  row: { item: T; ratio: number }[],
  containerWidth: number,
  rowHeight: number,
  gap: number,
  isLastRow: boolean,
): JustifiedItem<T>[] {
  const totalGap = gap * (row.length - 1);
  const naturalWidthSum = row.reduce((sum, r) => sum + rowHeight * r.ratio, 0);
  let scale = (containerWidth - totalGap) / naturalWidthSum;
  // La última fila puede tener pocas fotos; sin este límite se estirarían
  // hasta verse gigantes para llenar el ancho.
  if (isLastRow) scale = Math.min(scale, 1.4);
  const height = Math.max(1, Math.round(rowHeight * scale));
  return row.map((r) => ({ item: r.item, width: Math.round(height * r.ratio), height }));
}

// Distribuye `items` en filas justificadas: cada foto conserva su relación
// de aspecto real (nada de recortes), y cada fila se escala para llenar
// exactamente el ancho del contenedor, como una galería de fotos "a la
// Google Fotos" en vez de un masonry por columnas.
export function computeJustifiedRows<T extends { id: string }>(
  items: T[],
  ratios: Record<string, number>,
  containerWidth: number,
  rowHeight: number,
  gap: number,
): JustifiedItem<T>[][] {
  if (containerWidth <= 0 || items.length === 0) return [];

  const rows: JustifiedItem<T>[][] = [];
  let row: { item: T; ratio: number }[] = [];
  let rowWidth = 0;

  for (const item of items) {
    const ratio = ratios[item.id] ?? DEFAULT_RATIO;
    const w = rowHeight * ratio;
    const gapIfAdded = row.length > 0 ? gap : 0;
    if (rowWidth + gapIfAdded + w > containerWidth && row.length > 0) {
      rows.push(fitRow(row, containerWidth, rowHeight, gap, false));
      row = [];
      rowWidth = 0;
    }
    row.push({ item, ratio });
    rowWidth += (row.length > 1 ? gap : 0) + w;
  }
  if (row.length > 0) rows.push(fitRow(row, containerWidth, rowHeight, gap, true));

  return rows;
}
