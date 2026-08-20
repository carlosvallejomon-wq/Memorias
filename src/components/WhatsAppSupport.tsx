import { MessageCircle } from "lucide-react";

export const WHATSAPP_SUPPORT_URL =
  "https://wa.me/14694340980?text=Hola%2C%20necesito%20ayuda%20con%20Memorias%20Vivas.";

// Un canal directo da confianza antes de pagar y evita obligar a montar un
// sistema de tickets o un correo corporativo desde el primer día.
export function WhatsAppSupport() {
  return (
    <a
      href={WHATSAPP_SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir a Memorias Vivas por WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-[#1fb85a] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30"
    >
      <MessageCircle size={20} aria-hidden="true" />
      <span className="hidden sm:inline">¿Necesitas ayuda?</span>
    </a>
  );
}
