"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requerirAccesoComplejo } from "@/lib/autorizacion";
import {
  parsear,
  canchaSchema,
  horarioSchema,
  reglaPrecioSchema,
} from "@/lib/validaciones";
import { subirImagen, eliminarImagen, publicIdDesdeUrl } from "@/lib/cloudinary";
import type { EstadoFormulario } from "@/lib/formularios";
import type { TipoCancha } from "@/generated/prisma/client";

/** Límites de subida de fotos. */
const MAX_FOTOS_POR_CANCHA = 8;
const MAX_BYTES_FOTO = 5 * 1024 * 1024; // 5 MB

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

function rutaCancha(complejoId: string, canchaId: string): string {
  return `/admin/complejo/${complejoId}/canchas/${canchaId}`;
}

/** Verifica que la cancha pertenezca al complejo (evita cruces entre tenants). */
async function canchaDelComplejo(canchaId: string, complejoId: string) {
  return prisma.cancha.findFirst({ where: { id: canchaId, complejoId } });
}

// ─────────────────────────── Canchas ───────────────────────────

export async function crearCancha(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  await requerirAccesoComplejo(complejoId);

  const parseo = parsear(canchaSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

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

  const parseo = parsear(canchaSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

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

// ─────────────────────────── Fotos (Cloudinary) ───────────────────────────

export async function agregarFotoCancha(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId)))
    return { error: "Cancha no encontrada." };

  const archivo = formData.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0)
    return { error: "Elegí una imagen para subir." };
  if (!archivo.type.startsWith("image/"))
    return { error: "El archivo debe ser una imagen." };
  if (archivo.size > MAX_BYTES_FOTO)
    return { error: "La imagen no puede superar los 5 MB." };

  const cantidad = await prisma.canchaFoto.count({ where: { canchaId } });
  if (cantidad >= MAX_FOTOS_POR_CANCHA)
    return { error: `Máximo ${MAX_FOTOS_POR_CANCHA} fotos por cancha.` };

  let subida;
  try {
    subida = await subirImagen(archivo);
  } catch (e) {
    console.error("[fotos] Falló la subida a Cloudinary:", e);
    return { error: "No se pudo subir la imagen. Revisá la configuración de Cloudinary." };
  }

  await prisma.canchaFoto.create({
    data: { canchaId, url: subida.url, posicion: cantidad },
  });

  revalidatePath(rutaCancha(complejoId, canchaId));
  revalidatePath(`/admin/complejo/${complejoId}/canchas`);
  return null;
}

export async function quitarFotoCancha(formData: FormData): Promise<void> {
  const complejoId = texto(formData, "complejoId");
  const canchaId = texto(formData, "canchaId");
  const fotoId = texto(formData, "fotoId");
  await requerirAccesoComplejo(complejoId);
  if (!(await canchaDelComplejo(canchaId, complejoId))) return;

  // Sólo borra la foto si es de esa cancha (aislamiento multi-tenant).
  const foto = await prisma.canchaFoto.findFirst({
    where: { id: fotoId, canchaId },
    select: { id: true, url: true },
  });
  if (!foto) return;

  await prisma.canchaFoto.delete({ where: { id: foto.id } });

  // Best-effort: borrar también el archivo en Cloudinary (no bloquea).
  const publicId = publicIdDesdeUrl(foto.url);
  if (publicId) await eliminarImagen(publicId);

  revalidatePath(rutaCancha(complejoId, canchaId));
  revalidatePath(`/admin/complejo/${complejoId}/canchas`);
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

  const parseo = parsear(horarioSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  await prisma.horarioAtencion.create({
    data: {
      canchaId,
      diaSemana: d.diaSemana,
      aperturaMin: d.aperturaHora * 60,
      cierreMin: d.cierreHora * 60,
      minutosTurno: d.minutosTurno,
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

  const parseo = parsear(reglaPrecioSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  const tieneFranja = d.desdeHora !== null && d.hastaHora !== null;
  // Prioridad automática: más específica gana (día + franja).
  const prioridad = (d.diaSemana !== null ? 2 : 0) + (tieneFranja ? 1 : 0);

  await prisma.reglaPrecio.create({
    data: {
      canchaId,
      diaSemana: d.diaSemana,
      inicioMin: tieneFranja ? d.desdeHora! * 60 : null,
      finMin: tieneFranja ? d.hastaHora! * 60 : null,
      precio: d.precio!,
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
