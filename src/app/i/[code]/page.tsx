import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, invitations } from "@/db/schema";
import { isExpired } from "@/lib/expiry";
import { parseInvitationState } from "@/lib/invitation-link";
import { InvitationView } from "@/components/InvitationView";

export const dynamic = "force-dynamic";

async function cargar(code: string) {
  const [fila] = await db()
    .select({ data: invitations.data, name: albums.name, expiresAt: albums.expiresAt })
    .from(invitations)
    .innerJoin(albums, eq(invitations.albumId, albums.id))
    .where(eq(albums.shareCode, code))
    .limit(1);
  if (!fila || isExpired(fila.expiresAt)) return null;
  const state = parseInvitationState(fila.data);
  return state ? { state, name: fila.name } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const invitacion = await cargar(code);
  const titulo = invitacion?.state.n || invitacion?.name || "Invitación";
  return {
    title: titulo,
    description: "Estás invitado. Abre el sobre para ver todos los detalles.",
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: "Estás invitado. Abre el sobre para ver todos los detalles." },
  };
}

/**
 * Enlace corto de la invitación.
 *
 * A diferencia de `/invitacion?d=…`, el contenido no viaja en la URL: se lee
 * de la tabla `invitations`. Por eso el organizador puede seguir puliéndola
 * —o corregir una hora— sin que el QR que ya imprimió deje de valer.
 */
export default async function InvitacionGuardadaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const invitacion = await cargar(code);
  if (!invitacion) notFound();
  return <InvitationView state={invitacion.state} />;
}
