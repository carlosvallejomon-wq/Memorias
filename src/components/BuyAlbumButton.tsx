import type { ReactNode } from "react";
import { CreditCard } from "lucide-react";

export function BuyAlbumButton({
  english = false,
  label,
  className = "w-full px-6 py-3",
}: {
  english?: boolean;
  label?: ReactNode;
  className?: string;
}) {
  return (
    <a href="/api/stripe/checkout" className={`btn btn-primary shimmer ${className}`}>
      <CreditCard size={18} />
      {label ?? (english ? "Get my album for $39" : "Obtener mi álbum por $39")}
    </a>
  );
}
