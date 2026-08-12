"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

const claseInput =
  "rounded-xl border border-borde bg-superficie px-3 py-2 text-texto outline-none transition-colors focus:border-primario focus:ring-2 focus:ring-primario/20";

export function ReservaClienteForm({
  accion,
  slug,
  canchaId,
  fecha,
  inicioMin,
  finMin,
}: {
  accion: Accion;
  slug: string;
  canchaId: string;
  fecha: string;
  inicioMin: number;
  finMin: number;
}) {
  const [estado, action, pending] = useActionState(accion, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="canchaId" value={canchaId} />
      <input type="hidden" name="fecha" value={fecha} />
      <input type="hidden" name="inicioMin" value={inicioMin} />
      <input type="hidden" name="finMin" value={finMin} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input name="nombre" required className={claseInput} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Apellido
          <input name="apellido" className={claseInput} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Teléfono
          <input name="telefono" required className={claseInput} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email (opcional)
          <input name="email" type="email" className={claseInput} />
        </label>
      </div>

      {estado?.error ? (
        <p className="rounded-xl bg-peligro-suave px-3 py-2 text-sm text-peligro">
          {estado.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primario px-5 py-2.5 font-semibold text-primario-contraste transition-colors hover:bg-primario-fuerte disabled:opacity-50"
      >
        {pending ? "Confirmando…" : "Confirmar reserva"}
      </button>
    </form>
  );
}
