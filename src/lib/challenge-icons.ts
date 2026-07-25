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
export const CHALLENGE_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  camara: { Icon: Camera, label: "Foto" },
  brindis: { Icon: Wine, label: "Brindis" },
  baile: { Icon: Music, label: "Baile" },
  grupo: { Icon: Users, label: "Grupo" },
  tarta: { Icon: Cake, label: "Tarta" },
  regalo: { Icon: Gift, label: "Regalo" },
  detalles: { Icon: Sparkles, label: "Detalles" },
  amor: { Icon: Heart, label: "Cariño" },
  risa: { Icon: Smile, label: "Risas" },
  fiesta: { Icon: PartyPopper, label: "Fiesta" },
  flores: { Icon: Flower2, label: "Flores" },
  mascota: { Icon: PawPrint, label: "Mascota" },
  amanecer: { Icon: Sunrise, label: "Paisaje" },
  comida: { Icon: UtensilsCrossed, label: "Comida" },
  viaje: { Icon: Plane, label: "Viaje" },
  zapatos: { Icon: Footprints, label: "Zapatos" },
  bebe: { Icon: Baby, label: "Bebé" },
  ceremonia: { Icon: Church, label: "Ceremonia" },
  graduacion: { Icon: GraduationCap, label: "Graduación" },
};

export const CHALLENGE_ICON_IDS = Object.keys(CHALLENGE_ICONS);

export const DEFAULT_CHALLENGE_ICON = "camara";

export function isChallengeIconId(value: string | null | undefined): boolean {
  return !!value && value in CHALLENGE_ICONS;
}

export function challengeIconOf(value: string | null | undefined): LucideIcon | null {
  return value && value in CHALLENGE_ICONS ? CHALLENGE_ICONS[value].Icon : null;
}
