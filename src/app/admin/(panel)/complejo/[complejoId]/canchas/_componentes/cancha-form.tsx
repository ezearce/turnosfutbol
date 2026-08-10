"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Campo,
  CampoSelect,
  CampoCheckbox,
  MensajeError,
  BotonEnviar,
} from "@/components/campos";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

export type ValoresCancha = {
  nombre?: string;
  tipo?: string;
  superficie?: string;
  techada?: boolean;
  precioBase?: string;
};

export function CanchaForm({
  accion,
  complejoId,
  canchaId,
  valores = {},
  textoBoton = "Guardar",
}: {
  accion: Accion;
  complejoId: string;
  canchaId?: string;
  valores?: ValoresCancha;
  textoBoton?: string;
}) {
  const [estado, action, pending] = useActionState(accion, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="complejoId" value={complejoId} />
      {canchaId ? <input type="hidden" name="canchaId" value={canchaId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre" name="nombre" required defaultValue={valores.nombre} />
        <CampoSelect label="Tipo" name="tipo" defaultValue={valores.tipo ?? "F5"}>
          <option value="F5">Fútbol 5</option>
          <option value="F7">Fútbol 7</option>
          <option value="F11">Fútbol 11</option>
        </CampoSelect>
        <Campo
          label="Superficie"
          name="superficie"
          placeholder="Césped sintético"
          defaultValue={valores.superficie}
        />
        <Campo
          label="Precio base (ARS)"
          name="precioBase"
          type="number"
          min={0}
          step={100}
          defaultValue={valores.precioBase}
        />
      </div>

      <CampoCheckbox
        label="Cancha techada"
        name="techada"
        defaultChecked={valores.techada}
      />

      <MensajeError>{estado?.error}</MensajeError>

      <div className="flex items-center gap-3">
        <BotonEnviar pending={pending}>{textoBoton}</BotonEnviar>
        <Link
          href={`/admin/complejo/${complejoId}/canchas`}
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
