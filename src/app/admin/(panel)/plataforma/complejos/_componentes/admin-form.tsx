"use client";

import { useActionState } from "react";
import { Campo, MensajeError, BotonEnviar } from "@/components/campos";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

export function AdminForm({
  accion,
  complejoId,
}: {
  accion: Accion;
  complejoId: string;
}) {
  const [estado, action, pending] = useActionState(accion, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="complejoId" value={complejoId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre" name="nombre" required />
        <Campo label="Email" name="email" type="email" required autoComplete="off" />
      </div>
      <Campo
        label="Contraseña temporal (mín. 8 caracteres)"
        name="password"
        type="text"
        required
        minLength={8}
        autoComplete="off"
        placeholder="Se la compartís al dueño"
      />
      <MensajeError>{estado?.error}</MensajeError>
      <div>
        <BotonEnviar pending={pending}>Crear administrador</BotonEnviar>
      </div>
    </form>
  );
}
