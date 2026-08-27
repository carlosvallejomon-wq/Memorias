import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureInvitationSchema } from "@/db/ensure-invitation-schema";
import { invitations } from "@/db/schema";
import { parseInvitationState, type InvitationLinkState } from "@/lib/invitation-link";

/**
 * La invitación guardada de un álbum, si la hay.
 *
 * La leen las dos pantallas que montan el editor (el panel y la de cliente)
 * para que al abrirlo aparezca lo de la última vez en vez de una invitación
 * en blanco.
 */
export async function cargarInvitacion(albumId: string): Promise<InvitationLinkState | null> {
  await ensureInvitationSchema();
  const [fila] = await db()
    .select({ data: invitations.data })
    .from(invitations)
    .where(eq(invitations.albumId, albumId))
    .limit(1);
  return fila ? parseInvitationState(fila.data) : null;
}
