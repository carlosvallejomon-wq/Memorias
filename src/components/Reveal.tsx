"use client";

import { useEffect, useRef, useState } from "react";

// Aparición suave al llegar a la sección. Con `prefers-reduced-motion` las
// animaciones quedan neutralizadas desde globals.css, así que no molesta a
// quien pide menos movimiento.
//
// Vive en su propio archivo (y no dentro de LandingPieces, donde nació)
// porque la invitación interactiva lo usa también y no debe arrastrar el
// resto de piezas de la portada a su paquete de JavaScript.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
