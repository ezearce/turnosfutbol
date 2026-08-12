"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, MensajeError, BotonEnviar } from "@/components/campos";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

const horas = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

export function BloqueoForm({
  accion,
  complejoId,
  canchaId,
  fecha,
}: {
  accion: Accion;
  complejoId: string;
  canchaId: string;
  fecha: string;
}) {
  const [estado, action, pending] = useActionState(accion, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="complejoId" value={complejoId} />
      <input type="hidden" name="canchaId" value={canchaId} />
      <input type="hidden" name="fecha" value={fecha} />

      <div className="grid gap-3 sm:grid-cols-3">
        <CampoSelect label="Desde" name="desdeHora" defaultValue="18">
          {horas(0, 23).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Hasta" name="hastaHora" defaultValue="24">
          {horas(1, 24).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </CampoSelect>
        <Campo label="Motivo (opcional)" name="motivo" placeholder="Mantenimiento" />
      </div>

      <MensajeError>{estado?.error}</MensajeError>

      <div>
        <BotonEnviar pending={pending}>Bloquear rango</BotonEnviar>
      </div>
    </form>
  );
}
