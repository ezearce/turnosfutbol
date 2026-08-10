"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Campo, CampoTextarea, MensajeError, BotonEnviar } from "@/components/campos";
import type { EstadoFormulario } from "@/lib/formularios";

type Accion = (
  prev: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

export type ValoresComplejo = {
  nombre?: string;
  slug?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  descripcion?: string;
};

export function ComplejoForm({
  accion,
  idComplejo,
  valores = {},
  textoBoton = "Guardar",
}: {
  accion: Accion;
  idComplejo?: string;
  valores?: ValoresComplejo;
  textoBoton?: string;
}) {
  const [estado, action, pending] = useActionState(accion, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {idComplejo ? <input type="hidden" name="id" value={idComplejo} /> : null}

      <Campo label="Nombre" name="nombre" required defaultValue={valores.nombre} />
      <Campo
        label="Slug (opcional, se genera del nombre)"
        name="slug"
        defaultValue={valores.slug}
        placeholder="complejo-los-pibes"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Ciudad" name="ciudad" defaultValue={valores.ciudad} />
        <Campo label="Dirección" name="direccion" defaultValue={valores.direccion} />
        <Campo label="Teléfono" name="telefono" defaultValue={valores.telefono} />
        <Campo label="WhatsApp" name="whatsapp" defaultValue={valores.whatsapp} />
      </div>
      <Campo label="Email" name="email" type="email" defaultValue={valores.email} />
      <CampoTextarea label="Descripción" name="descripcion" defaultValue={valores.descripcion} />

      <MensajeError>{estado?.error}</MensajeError>

      <div className="flex items-center gap-3">
        <BotonEnviar pending={pending}>{textoBoton}</BotonEnviar>
        <Link
          href="/admin/plataforma/complejos"
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
