"use client";

import { useCallback, useState } from "react";
import { Hourglass, Play } from "lucide-react";
import { computeJustifiedRows, useElementWidth } from "@/lib/justified-layout";
import {
  ApproveMediaButton,
  DeleteMediaButton,
  RejectMediaButton,
} from "@/components/OwnerActions";

export type OwnerMediaItem = {
  id: string;
  url: string;
  type: string;
  uploaderName: string | null;
};

// Galería del organizador con las mismas filas justificadas que ve el
// invitado: cada foto conserva su forma y las filas quedan alineadas, en vez
// del masonry por columnas que dejaba huecos y tamaños desiguales.
export function OwnerGallery({
  items,
  mode = "contenido",
}: {
  items: OwnerMediaItem[];
  mode?: "contenido" | "pendientes";
}) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [containerRef, width] = useElementWidth<HTMLDivElement>();

  const handleRatio = useCallback((id: string, ratio: number) => {
    setRatios((prev) => (prev[id] ? prev : { ...prev, [id]: ratio }));
  }, []);

  const rowHeight = width < 480 ? 120 : 170;
  const gap = 8;
  const rows = computeJustifiedRows(items, ratios, width, rowHeight, gap);

  return (
    <div ref={containerRef} className="mt-3 flex flex-col" style={{ gap }}>
      {rows.map((row, i) => (
        <div key={i} className="flex" style={{ gap }}>
          {row.map(({ item, width: w, height: h }) => (
            <figure
              key={item.id}
              style={{ width: w, height: h }}
              className="card-interactive group relative shrink-0 overflow-hidden rounded-xl bg-arena shadow-soft"
            >
              {item.type === "video" ? (
                <>
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth && v.videoHeight)
                        handleRatio(item.id, v.videoWidth / v.videoHeight);
                    }}
                  />
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white">
                    <Play size={11} fill="white" />
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight)
                      handleRatio(item.id, img.naturalWidth / img.naturalHeight);
                  }}
                />
              )}

              {mode === "pendientes" ? (
                <>
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-tinta/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Hourglass size={10} /> Pendiente
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <ApproveMediaButton mediaId={item.id} />
                    <RejectMediaButton mediaId={item.id} />
                  </div>
                </>
              ) : (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/65 to-transparent p-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <span className="truncate text-xs text-white">
                    {item.uploaderName || "Anónimo"}
                  </span>
                  <DeleteMediaButton mediaId={item.id} />
                </div>
              )}
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}
