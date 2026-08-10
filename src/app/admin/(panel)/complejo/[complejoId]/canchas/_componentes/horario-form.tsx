"use client";

import { useActionState } from "react";
import { CampoSelect, MensajeError, BotonEnviar } from "@/components/campos";
import { DIAS } from "@/lib/horas";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

const horas = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

export function HorarioForm({
  accion,
  complejoId,
  canchaId,
}: {
  accion: Accion;
  complejoId: string;
  canchaId: string;
}) {
  const [estado, action, pending] = useActionState(accion, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="complejoId" value={complejoId} />
      <input type="hidden" name="canchaId" value={canchaId} />

      <div className="grid gap-3 sm:grid-cols-4">
        <CampoSelect label="Día" name="diaSemana" defaultValue="1">
          {DIAS.map((nombre, i) => (
            <option key={i} value={i}>
              {nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Apertura" name="aperturaHora" defaultValue="18">
          {horas(0, 23).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Cierre" name="cierreHora" defaultValue="24">
          {horas(1, 24).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Duración turno" name="minutosTurno" defaultValue="60">
          <option value="60">60 min</option>
          <option value="90">90 min</option>
          <option value="120">120 min</option>
        </CampoSelect>
      </div>

      <MensajeError>{estado?.error}</MensajeError>

      <div>
        <BotonEnviar pending={pending}>Agregar horario</BotonEnviar>
      </div>
    </form>
  );
}
