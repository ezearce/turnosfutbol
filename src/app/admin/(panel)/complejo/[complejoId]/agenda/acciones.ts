"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requerirAccesoComplejo } from "@/lib/autorizacion";
import { crearReserva, crearBloqueo, cancelarReserva } from "@/lib/reservas";
import { parsear, reservaManualSchema, bloqueoSchema } from "@/lib/validaciones";
import type { EstadoFormulario } from "@/lib/formularios";

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

function rutaAgenda(complejoId: string, canchaId: string, fecha: string): string {
  return `/admin/complejo/${complejoId}/agenda?canchaId=${canchaId}&fecha=${fecha}`;
}

/** Verifica que la cancha pertenezca al complejo (evita cruces entre tenants). */
async function canchaDelComplejo(canchaId: string, complejoId: string) {
  return prisma.cancha.findFirst({ where: { id: canchaId, complejoId } });
}

/** Parsea el value "inicioMin-finMin" del select de turnos libres. */
function parsearTurno(valor: string): { inicioMin: number; finMin: number } | null {
  const [a, b] = valor.split("-").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return { inicioMin: a, finMin: b };
}

export async function reservarManual(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  const session = await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId)))
    return { error: "Cancha no encontrada." };

  const parseo = parsear(reservaManualSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  const turno = parsearTurno(d.turno);
  if (!turno) return { error: "Elegí un turno." };

  const resultado = await crearReserva({
    canchaId,
    fechaISO: d.fecha,
    inicioMin: turno.inicioMin,
    finMin: turno.finMin,
    cliente: {
      nombre: d.clienteNombre,
      apellido: d.clienteApellido,
      telefono: d.clienteTelefono,
      email: d.clienteEmail,
    },
    origen: "MANUAL",
    creadaPorId: session.user.id,
  });
  if (!resultado.ok) return { error: resultado.error };

  revalidatePath(rutaAgenda(complejoId, canchaId, d.fecha));
  redirect(rutaAgenda(complejoId, canchaId, d.fecha));
}

export async function bloquear(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  const session = await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId)))
    return { error: "Cancha no encontrada." };

  const parseo = parsear(bloqueoSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  const resultado = await crearBloqueo({
    canchaId,
    fechaISO: d.fecha,
    inicioMin: d.desdeHora! * 60,
    finMin: d.hastaHora! * 60,
    motivo: d.motivo,
    creadaPorId: session.user.id,
  });
  if (!resultado.ok) return { error: resultado.error };

  revalidatePath(rutaAgenda(complejoId, canchaId, d.fecha));
  redirect(rutaAgenda(complejoId, canchaId, d.fecha));
}

export async function cancelar(formData: FormData): Promise<void> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  const reservaId = texto(formData, "reservaId");
  const fecha = texto(formData, "fecha");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId))) return;

  // Sólo cancela si la reserva es de esa cancha (aislamiento multi-tenant).
  const reserva = await prisma.reserva.findFirst({
    where: { id: reservaId, canchaId, complejoId },
    select: { id: true },
  });
  if (!reserva) return;

  await cancelarReserva(reservaId);
  revalidatePath(rutaAgenda(complejoId, canchaId, fecha));
}
