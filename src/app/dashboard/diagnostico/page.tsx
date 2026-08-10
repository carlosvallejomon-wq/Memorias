"use client";

import { useState } from "react";
import { probarAccionDeServidor, type Diagnostico } from "./acciones";

export default function DiagnosticoPage() {
  const [estado, setEstado] = useState<"listo" | "probando" | "hecho" | "roto">("listo");
  const [datos, setDatos] = useState<Diagnostico | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  async function probar() {
    setEstado("probando");
    setFallo(null);
    setDatos(null);
    try {
      // Si la acción no llega a ejecutarse —bundle antiguo, middleware,
      // despliegue a medias— esto lanza, y ese error es justo el que hace
      // falta ver: es el mismo que se traga la pantalla de "algo se ha
      // torcido" al crear o borrar un álbum.
      const r = await probarAccionDeServidor();
      setDatos(r);
      setEstado("hecho");
    } catch (err) {
      setFallo(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      setEstado("roto");
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        Comprobación de acciones
      </h1>
      <p className="mt-2 text-tinta/70">
        Crear y borrar un álbum pasan por una &laquo;acción de servidor&raquo;.
        Este botón hace lo mismo que ellas, pero sin tocar nada, y enseña el
        resultado en vez de esconderlo.
      </p>

      <button onClick={probar} disabled={estado === "probando"} className="btn btn-primary mt-6 px-5 py-2.5">
        {estado === "probando" ? "Probando…" : "Probar ahora"}
      </button>

      {estado === "roto" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">La acción no llegó a ejecutarse.</p>
          <p className="mt-2 break-words text-sm text-red-700/90">{fallo}</p>
          <p className="mt-3 text-sm text-tinta/70">
            Este es el motivo real por el que fallan crear y borrar. Copia esta
            línea entera.
          </p>
        </div>
      )}

      {estado === "hecho" && datos && (
        <div className="glass mt-6 rounded-xl p-4">
          <dl className="space-y-2 text-sm">
            <Fila que="La acción se ejecutó" valor={datos.accionEjecutada ? "sí" : "no"} bien={datos.accionEjecutada} />
            <Fila que="Versión desplegada" valor={datos.version} bien />
            <Fila
              que="Reconoce tu sesión"
              valor={datos.sesion}
              bien={datos.sesion === "sí"}
            />
            <Fila
              que="Puede escribir en la base"
              valor={datos.escritura}
              bien={datos.escritura === "ok"}
            />
          </dl>
          <p className="mt-4 text-sm text-tinta/70">
            Si todo sale bien aquí y sigue sin dejarte crear álbumes, el
            problema está en la pantalla de crear, no en el servidor.
          </p>
        </div>
      )}
    </main>
  );
}

function Fila({ que, valor, bien }: { que: string; valor: string; bien: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-tinta/8 pb-2">
      <dt className="text-tinta/70">{que}</dt>
      <dd className={`text-right font-semibold ${bien ? "text-green-700" : "text-red-700"}`}>
        {valor}
      </dd>
    </div>
  );
}
