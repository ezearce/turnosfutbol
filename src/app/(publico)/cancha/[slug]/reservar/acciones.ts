"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearReserva } from "@/lib/reservas";
import { esFechaISOValida } from "@/lib/zona";
import type { EstadoFormulario } from "@/lib/formularios";

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

export async function reservarPublico(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const slug = texto(formData, "slug");
  const canchaId = texto(formData, "canchaId");
  const fecha = texto(formData, "fecha");
  const inicioMin = Number(texto(formData, "inicioMin"));
  const finMin = Number(texto(formData, "finMin"));

  if (!esFechaISOValida(fecha)) return { error: "Fecha inválida." };
  if (!Number.isFinite(inicioMin) || !Number.isFinite(finMin) || finMin <= inicioMin)
    return { error: "Turno inválido." };

  // La cancha debe pertenecer a un complejo activo con ese slug (evita usar un
  // canchaId de otro complejo con un slug cualquiera).
  const cancha = await prisma.cancha.findFirst({
    where: { id: canchaId, activa: true, complejo: { slug, activo: true } },
    select: { id: true },
  });
  if (!cancha) return { error: "La cancha no está disponible." };

  const nombre = texto(formData, "nombre");
  const telefono = texto(formData, "telefono");
  if (nombre.length < 1) return { error: "Ingresá tu nombre." };
  if (telefono.length < 6) return { error: "Ingresá un teléfono de contacto." };

  const resultado = await crearReserva({
    canchaId,
    fechaISO: fecha,
    inicioMin,
    finMin,
    cliente: {
      nombre,
      apellido: texto(formData, "apellido") || null,
      telefono,
      email: texto(formData, "email") || null,
    },
    origen: "WEB",
  });
  if (!resultado.ok) return { error: resultado.error };

  redirect(`/reserva/${resultado.token}`);
}
