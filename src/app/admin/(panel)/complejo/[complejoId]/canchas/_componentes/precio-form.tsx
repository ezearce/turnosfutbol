"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, MensajeError, BotonEnviar } from "@/components/campos";
import { DIAS } from "@/lib/horas";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

const horas = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

export function PrecioForm({
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
        <CampoSelect label="Día" name="diaSemana" defaultValue="">
          <option value="">Todos</option>
          {DIAS.map((nombre, i) => (
            <option key={i} value={i}>
              {nombre}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Desde (opc.)" name="desdeHora" defaultValue="">
          <option value="">—</option>
          {horas(0, 23).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Hasta (opc.)" name="hastaHora" defaultValue="">
          <option value="">—</option>
          {horas(1, 24).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </CampoSelect>
        <Campo
          label="Precio (ARS)"
          name="precio"
          type="number"
          min={0}
          step={100}
          required
        />
      </div>

      <MensajeError>{estado?.error}</MensajeError>

      <div>
        <BotonEnviar pending={pending}>Agregar regla</BotonEnviar>
      </div>
    </form>
  );
}
