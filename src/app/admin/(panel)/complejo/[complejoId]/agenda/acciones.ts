"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requerirAccesoComplejo } from "@/lib/autorizacion";
import { crearReserva, crearBloqueo, cancelarReserva } from "@/lib/reservas";
import { esFechaISOValida } from "@/lib/zona";
import type { EstadoFormulario } from "@/lib/formularios";

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroOpcional(valor: string): number | null {
  if (valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
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

  const fecha = texto(formData, "fecha");
  if (!esFechaISOValida(fecha)) return { error: "Fecha inválida." };

  const turno = parsearTurno(texto(formData, "turno"));
  if (!turno) return { error: "Elegí un turno." };

  const nombre = texto(formData, "clienteNombre");
  if (nombre.length < 1) return { error: "El nombre del cliente es obligatorio." };

  const resultado = await crearReserva({
    canchaId,
    fechaISO: fecha,
    inicioMin: turno.inicioMin,
    finMin: turno.finMin,
    cliente: {
      nombre,
      apellido: texto(formData, "clienteApellido") || null,
      telefono: texto(formData, "clienteTelefono") || null,
      email: texto(formData, "clienteEmail") || null,
    },
    origen: "MANUAL",
    creadaPorId: session.user.id,
  });
  if (!resultado.ok) return { error: resultado.error };

  revalidatePath(rutaAgenda(complejoId, canchaId, fecha));
  redirect(rutaAgenda(complejoId, canchaId, fecha));
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

  const fecha = texto(formData, "fecha");
  if (!esFechaISOValida(fecha)) return { error: "Fecha inválida." };

  const desdeHora = numeroOpcional(texto(formData, "desdeHora"));
  const hastaHora = numeroOpcional(texto(formData, "hastaHora"));
  if (desdeHora === null || hastaHora === null)
    return { error: "Completá desde y hasta." };
  if (hastaHora <= desdeHora)
    return { error: "El fin debe ser posterior al inicio." };

  const resultado = await crearBloqueo({
    canchaId,
    fechaISO: fecha,
    inicioMin: desdeHora * 60,
    finMin: hastaHora * 60,
    motivo: texto(formData, "motivo") || null,
    creadaPorId: session.user.id,
  });
  if (!resultado.ok) return { error: resultado.error };

  revalidatePath(rutaAgenda(complejoId, canchaId, fecha));
  redirect(rutaAgenda(complejoId, canchaId, fecha));
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
