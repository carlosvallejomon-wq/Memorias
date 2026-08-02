// Fecha OPCIONAL de borrado automático por álbum.
//
// Por defecto no hay ninguna: un álbum vive para siempre, que es lo que la
// gente espera de sus fotos. Solo se borra si el organizador elige una fecha a
// mano, y aun así se le avisa por todas partes antes de que llegue.

const DIA_MS = 24 * 60 * 60 * 1000;

export function isExpired(expiresAt: Date | string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(t) && t <= now;
}

/** Días que faltan (0 = hoy, negativo = ya pasó). */
export function daysUntil(expiresAt: Date | string, now = Date.now()): number {
  const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Math.ceil((t - now) / DIA_MS);
}

export function formatDate(expiresAt: Date | string): string {
  const d = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Aviso para el organizador y para los invitados. Devuelve null cuando aún
 * falta mucho: no hace falta meterle prisa a nadie un año antes.
 */
export function expiryWarning(
  expiresAt: Date | string | null | undefined,
  now = Date.now(),
): { texto: string; urgente: boolean } | null {
  if (!expiresAt) return null;
  const dias = daysUntil(expiresAt, now);
  if (dias < 0) return { texto: "Este álbum ya se ha cerrado.", urgente: true };
  if (dias === 0) return { texto: "Este álbum se borra hoy.", urgente: true };
  if (dias === 1) return { texto: "Este álbum se borra mañana.", urgente: true };
  if (dias <= 30) {
    return {
      texto: `Este álbum se borrará en ${dias} días (el ${formatDate(expiresAt)}).`,
      urgente: dias <= 7,
    };
  }
  return {
    texto: `Este álbum se borrará el ${formatDate(expiresAt)}.`,
    urgente: false,
  };
}
