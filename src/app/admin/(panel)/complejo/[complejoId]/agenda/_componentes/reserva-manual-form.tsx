"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, MensajeError, BotonEnviar } from "@/components/campos";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

export type TurnoLibre = { valor: string; etiqueta: string };

export function ReservaManualForm({
  accion,
  complejoId,
  canchaId,
  fecha,
  turnosLibres,
}: {
  accion: Accion;
  complejoId: string;
  canchaId: string;
  fecha: string;
  turnosLibres: TurnoLibre[];
}) {
  const [estado, action, pending] = useActionState(accion, null);

  if (turnosLibres.length === 0) {
    return (
      <p className="text-sm text-marca-marron">
        No hay turnos libres para reservar en esta fecha.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="complejoId" value={complejoId} />
      <input type="hidden" name="canchaId" value={canchaId} />
      <input type="hidden" name="fecha" value={fecha} />

      <CampoSelect label="Turno" name="turno">
        {turnosLibres.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.etiqueta}
          </option>
        ))}
      </CampoSelect>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nombre" name="clienteNombre" required />
        <Campo label="Apellido" name="clienteApellido" />
        <Campo label="Teléfono" name="clienteTelefono" />
        <Campo label="Email" name="clienteEmail" type="email" />
      </div>

      <MensajeError>{estado?.error}</MensajeError>

      <div>
        <BotonEnviar pending={pending}>Reservar turno</BotonEnviar>
      </div>
    </form>
  );
}
