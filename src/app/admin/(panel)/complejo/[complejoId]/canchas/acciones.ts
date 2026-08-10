"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requerirAccesoComplejo } from "@/lib/autorizacion";
import type { EstadoFormulario } from "@/lib/formularios";
import type { TipoCancha } from "@/generated/prisma/client";

const TIPOS_CANCHA = ["F5", "F7", "F11"] as const;

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Parsea un número o devuelve null si está vacío/ inválido. */
function numeroOpcional(valor: string): number | null {
  if (valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function rutaCancha(complejoId: string, canchaId: string): string {
  return `/admin/complejo/${complejoId}/canchas/${canchaId}`;
}

/** Verifica que la cancha pertenezca al complejo (evita cruces entre tenants). */
async function canchaDelComplejo(canchaId: string, complejoId: string) {
  return prisma.cancha.findFirst({ where: { id: canchaId, complejoId } });
}

// ─────────────────────────── Canchas ───────────────────────────

function datosCancha(formData: FormData) {
  return {
    nombre: texto(formData, "nombre"),
    tipo: texto(formData, "tipo"),
    superficie: texto(formData, "superficie") || null,
    techada: formData.get("techada") === "on",
    precioBase: numeroOpcional(texto(formData, "precioBase")),
  };
}

function validarCancha(d: ReturnType<typeof datosCancha>): string | null {
  if (d.nombre.length < 1) return "El nombre es obligatorio.";
  if (!TIPOS_CANCHA.includes(d.tipo as (typeof TIPOS_CANCHA)[number]))
    return "Elegí un tipo de cancha válido.";
  if (d.precioBase !== null && d.precioBase < 0)
    return "El precio base no puede ser negativo.";
  return null;
}

export async function crearCancha(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  await requerirAccesoComplejo(complejoId);

  const d = datosCancha(formData);
  const error = validarCancha(d);
  if (error) return { error };

  await prisma.cancha.create({
    data: {
      complejoId,
      nombre: d.nombre,
      tipo: d.tipo as TipoCancha,
      superficie: d.superficie,
      techada: d.techada,
      precioBase: d.precioBase,
    },
  });

  revalidatePath(`/admin/complejo/${complejoId}/canchas`);
  redirect(`/admin/complejo/${complejoId}/canchas`);
}

export async function editarCancha(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId)))
    return { error: "Cancha no encontrada." };

  const d = datosCancha(formData);
  const error = validarCancha(d);
  if (error) return { error };

  await prisma.cancha.update({
    where: { id: canchaId },
    data: {
      nombre: d.nombre,
      tipo: d.tipo as TipoCancha,
      superficie: d.superficie,
      techada: d.techada,
      precioBase: d.precioBase,
    },
  });

  revalidatePath(`/admin/complejo/${complejoId}/canchas`);
  revalidatePath(rutaCancha(complejoId, canchaId));
  redirect(`/admin/complejo/${complejoId}/canchas`);
}

export async function alternarActivaCancha(formData: FormData): Promise<void> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  await requerirAccesoComplejo(complejoId);
  const cancha = await canchaDelComplejo(canchaId, complejoId);
  if (cancha) {
    await prisma.cancha.update({
      where: { id: canchaId },
      data: { activa: !cancha.activa },
    });
    revalidatePath(`/admin/complejo/${complejoId}/canchas`);
  }
}

// ─────────────────────────── Horarios ───────────────────────────

export async function agregarHorario(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId)))
    return { error: "Cancha no encontrada." };

  const diaSemana = numeroOpcional(texto(formData, "diaSemana"));
  const aperturaHora = numeroOpcional(texto(formData, "aperturaHora"));
  const cierreHora = numeroOpcional(texto(formData, "cierreHora"));
  const minutosTurno = numeroOpcional(texto(formData, "minutosTurno"));

  if (diaSemana === null || diaSemana < 0 || diaSemana > 6)
    return { error: "Elegí un día válido." };
  if (aperturaHora === null || cierreHora === null)
    return { error: "Completá la hora de apertura y cierre." };
  if (aperturaHora >= cierreHora)
    return { error: "La apertura debe ser anterior al cierre." };
  if (!minutosTurno || minutosTurno <= 0)
    return { error: "Elegí la duración del turno." };

  await prisma.horarioAtencion.create({
    data: {
      canchaId,
      diaSemana,
      aperturaMin: aperturaHora * 60,
      cierreMin: cierreHora * 60,
      minutosTurno,
    },
  });

  revalidatePath(rutaCancha(complejoId, canchaId));
  redirect(rutaCancha(complejoId, canchaId));
}

export async function quitarHorario(formData: FormData): Promise<void> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  const horarioId = texto(formData, "horarioId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId))) return;

  // Sólo borra si el horario es de esa cancha.
  await prisma.horarioAtencion.deleteMany({
    where: { id: horarioId, canchaId },
  });
  revalidatePath(rutaCancha(complejoId, canchaId));
}

// ─────────────────────────── Precios ───────────────────────────

export async function agregarReglaPrecio(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId)))
    return { error: "Cancha no encontrada." };

  const diaSemana = numeroOpcional(texto(formData, "diaSemana")); // null = todos
  const desdeHora = numeroOpcional(texto(formData, "desdeHora"));
  const hastaHora = numeroOpcional(texto(formData, "hastaHora"));
  const precio = numeroOpcional(texto(formData, "precio"));

  if (precio === null || precio < 0) return { error: "Ingresá un precio válido." };
  if (diaSemana !== null && (diaSemana < 0 || diaSemana > 6))
    return { error: "Día inválido." };

  const tieneFranja = desdeHora !== null && hastaHora !== null;
  if ((desdeHora !== null) !== (hastaHora !== null))
    return { error: "Completá desde y hasta, o dejá ambos vacíos." };
  if (tieneFranja && desdeHora! >= hastaHora!)
    return { error: "La franja: desde debe ser anterior a hasta." };

  // Prioridad automática: más específica gana (día + franja).
  const prioridad = (diaSemana !== null ? 2 : 0) + (tieneFranja ? 1 : 0);

  await prisma.reglaPrecio.create({
    data: {
      canchaId,
      diaSemana,
      inicioMin: tieneFranja ? desdeHora! * 60 : null,
      finMin: tieneFranja ? hastaHora! * 60 : null,
      precio,
      prioridad,
    },
  });

  revalidatePath(rutaCancha(complejoId, canchaId));
  redirect(rutaCancha(complejoId, canchaId));
}

export async function quitarReglaPrecio(formData: FormData): Promise<void> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  const reglaId = texto(formData, "reglaId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId))) return;

  await prisma.reglaPrecio.deleteMany({ where: { id: reglaId, canchaId } });
  revalidatePath(rutaCancha(complejoId, canchaId));
}
