"use client";

import { useTransition } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { setModerationEnabled } from "@/app/dashboard/actions";

export function ModerationToggle({
  albumId,
  enabled,
}: {
  albumId: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => setModerationEnabled(albumId, !enabled))}
      className={`shimmer flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
        enabled
          ? "border-teja/30 bg-teja/10 text-teja-oscuro"
          : "border-tinta/15 bg-white text-tinta/70 hover:bg-arena"
      }`}
      title="Si lo activas, las fotos de los invitados no se muestran hasta que las apruebes"
    >
      {enabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
      {enabled ? "Revisión activada" : "Revisar antes de publicar"}
    </button>
  );
}
