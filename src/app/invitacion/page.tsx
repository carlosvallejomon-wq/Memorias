"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InvitationView } from "@/components/InvitationView";
import { decodeInvitationLink } from "@/lib/invitation-link";

// Enlace largo: la invitación entera viaja dentro de la URL. Sigue aquí
// porque los QR repartidos con la versión anterior apuntan a esta página; las
// que se guardan desde el panel usan el enlace corto `/i/<código>`, que sí se
// puede editar después.
function DesdeElEnlace() {
  const params = useSearchParams();
  const raw = params.get("d");
  const state = raw ? decodeInvitationLink(raw) : null;

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arena p-6 text-center text-tinta/70">
        Este enlace de invitación no es válido.
      </div>
    );
  }
  return <InvitationView state={state} abierto={params.get("abierto") === "1"} />;
}

export default function InvitacionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-arena text-sm text-tinta/50">
          Cargando…
        </div>
      }
    >
      <DesdeElEnlace />
    </Suspense>
  );
}
