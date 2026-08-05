import {
  Baby,
  Cake,
  Camera,
  Church,
  Users,
  Flower2,
  Footprints,
  Gift,
  GraduationCap,
  Heart,
  Music,
  PartyPopper,
  PawPrint,
  Plane,
  Smile,
  Sparkles,
  Sunrise,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

// Catálogo de iconos de los retos. En la base de datos se guarda la clave
// (p. ej. "brindis") en la columna `emoji`; los retos antiguos guardaban un
// emoji de verdad y se siguen pintando tal cual, así nada se rompe.
//
// Cada icono lleva su propio color, elegido a juego con el tema (el brindis
// dorado, las flores rosas, el viaje azul...). Antes eran todos del mismo
// gris y la fila parecía una barra de herramientas; con color se leen de un
// vistazo y el conjunto parece un juego de iconos de verdad. Los tonos son
// apagados a propósito, de la misma familia que el resto de la app, para que
// no chillen al lado del contenido.
export type ChallengeIconInfo = {
  Icon: LucideIcon;
  label: string;
  /** Color del trazo del icono. */
  color: string;
  /** Fondo suave a juego, para la pastilla que lo rodea. */
  bg: string;
};

export const CHALLENGE_ICONS: Record<string, ChallengeIconInfo> = {
  camara: { Icon: Camera, label: "Foto", color: "#4a5568", bg: "#eef1f5" },
  brindis: { Icon: Wine, label: "Brindis", color: "#a8741a", bg: "#faf1de" },
  baile: { Icon: Music, label: "Baile", color: "#6b4a9c", bg: "#f1ecf9" },
  grupo: { Icon: Users, label: "Grupo", color: "#2f6b6b", bg: "#e6f2f2" },
  tarta: { Icon: Cake, label: "Tarta", color: "#c2571b", bg: "#fbeee3" },
  regalo: { Icon: Gift, label: "Regalo", color: "#b03a5b", bg: "#fbebf0" },
  detalles: { Icon: Sparkles, label: "Detalles", color: "#9a7b1f", bg: "#f9f3dd" },
  amor: { Icon: Heart, label: "Cariño", color: "#c2405e", bg: "#fceaee" },
  risa: { Icon: Smile, label: "Risas", color: "#c98a12", bg: "#fdf3df" },
  fiesta: { Icon: PartyPopper, label: "Fiesta", color: "#c2571b", bg: "#fbeee3" },
  flores: { Icon: Flower2, label: "Flores", color: "#b5537f", bg: "#fbecf3" },
  mascota: { Icon: PawPrint, label: "Mascota", color: "#8a5a2b", bg: "#f7efe5" },
  amanecer: { Icon: Sunrise, label: "Paisaje", color: "#c07d1a", bg: "#fbf0dd" },
  comida: { Icon: UtensilsCrossed, label: "Comida", color: "#7a6a2f", bg: "#f4f1e2" },
  viaje: { Icon: Plane, label: "Viaje", color: "#2c6291", bg: "#e7f0f8" },
  zapatos: { Icon: Footprints, label: "Zapatos", color: "#5b5f73", bg: "#eeeff4" },
  bebe: { Icon: Baby, label: "Bebé", color: "#5a8fa8", bg: "#e9f3f7" },
  ceremonia: { Icon: Church, label: "Ceremonia", color: "#6b7a45", bg: "#f0f3e6" },
  graduacion: { Icon: GraduationCap, label: "Graduación", color: "#2a3a63", bg: "#e9ecf5" },
};

export const CHALLENGE_ICON_IDS = Object.keys(CHALLENGE_ICONS);

export const DEFAULT_CHALLENGE_ICON = "camara";

export function isChallengeIconId(value: string | null | undefined): boolean {
  return !!value && value in CHALLENGE_ICONS;
}

export function challengeIconOf(value: string | null | undefined): LucideIcon | null {
  return value && value in CHALLENGE_ICONS ? CHALLENGE_ICONS[value].Icon : null;
}

/**
 * Estilo listo para la pastilla del icono (fondo suave + trazo de color).
 * Los retos antiguos guardaban un emoji y no tienen color: devuelve
 * undefined y se queda con el aspecto neutro de siempre.
 */
export function challengeIconStyle(
  value: string | null | undefined,
): { backgroundColor: string; color: string } | undefined {
  if (!value || !(value in CHALLENGE_ICONS)) return undefined;
  const { color, bg } = CHALLENGE_ICONS[value];
  return { backgroundColor: bg, color };
}
