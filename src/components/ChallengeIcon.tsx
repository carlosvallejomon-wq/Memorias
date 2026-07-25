import { Camera } from "lucide-react";
import { challengeIconOf } from "@/lib/challenge-icons";

// Pinta el icono de un reto. Si lo guardado no es una clave del catálogo se
// asume que es un emoji de los retos antiguos y se muestra tal cual.
export function ChallengeIcon({
  icon,
  size = 18,
  className,
}: {
  icon: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = challengeIconOf(icon);
  if (Icon) return <Icon size={size} className={className} />;
  if (icon && icon.trim()) {
    return (
      <span
        aria-hidden
        className={className}
        style={{ fontSize: size, lineHeight: 1 }}
      >
        {icon}
      </span>
    );
  }
  return <Camera size={size} className={className} />;
}
