import type { Metadata } from "next";
import { WHATSAPP_SUPPORT_URL } from "@/components/WhatsAppSupport";

export const metadata: Metadata = {
  title: "Reembolsos",
  description: "Política de reembolsos de Memorias Vivas.",
};

export default function ReembolsosPage() {
  return (
    <article>
      <p className="eyebrow">Memorias Vivas</p>
      <h1>Política de reembolsos</h1>
      <p className="lead">
        Queremos que tu álbum de recuerdos funcione como esperas desde el primer día.
      </p>

      <h2>Reembolso por falla técnica</h2>
      <p>
        Puedes solicitar un reembolso dentro de los 7 días posteriores a la compra
        si una falla técnica de Memorias Vivas impide crear o utilizar tu álbum.
      </p>

      <h2>Cuándo no aplica</h2>
      <p>
        El reembolso no aplica después de que el álbum haya sido creado y utilizado,
        salvo que exista una falla comprobable del servicio que impida su uso normal.
      </p>

      <h2>Cómo solicitar ayuda</h2>
      <p>
        Escríbenos por WhatsApp con el nombre del álbum, la fecha de compra y una
        breve descripción del problema. Revisaremos tu caso y te responderemos lo
        antes posible.
      </p>
      <p>
        <a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noreferrer">
          Contactar a Memorias Vivas por WhatsApp
        </a>
      </p>

      <p className="mt-10 text-sm text-tinta/50">Última actualización: 20 de agosto de 2026.</p>
    </article>
  );
}
