"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requerirAdminGeneral } from "@/lib/autorizacion";
import { slugify } from "@/lib/slug";
import { parsear, complejoSchema, adminComplejoSchema } from "@/lib/validaciones";
import type { EstadoFormulario } from "@/lib/formularios";

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Busca un slug libre a partir de una base, ignorando un complejo existente. */
async function slugUnico(base: string, exceptoId?: string): Promise<string> {
  const raiz = base || "complejo";
  let slug = raiz;
  let i = 2;
  // Reintenta con sufijo numérico hasta encontrar uno libre.
  for (;;) {
    const existente = await prisma.complejo.findUnique({ where: { slug } });
    if (!existente || existente.id === exceptoId) return slug;
    slug = `${raiz}-${i++}`;
  }
}

export async function crearComplejo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirAdminGeneral();
  const parseo = parsear(complejoSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  const slug = await slugUnico(slugify(d.slug ?? d.nombre));
  await prisma.complejo.create({
    data: {
      nombre: d.nombre,
      slug,
      descripcion: d.descripcion,
      direccion: d.direccion,
      ciudad: d.ciudad,
      telefono: d.telefono,
      whatsapp: d.whatsapp,
      email: d.email,
    },
  });

  revalidatePath("/admin/plataforma/complejos");
  redirect("/admin/plataforma/complejos");
}

export async function editarComplejo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirAdminGeneral();
  const id = texto(formData, "id");
  if (!id) return { error: "Complejo no encontrado." };

  const parseo = parsear(complejoSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  const slug = await slugUnico(slugify(d.slug ?? d.nombre), id);
  await prisma.complejo.update({
    where: { id },
    data: {
      nombre: d.nombre,
      slug,
      descripcion: d.descripcion,
      direccion: d.direccion,
      ciudad: d.ciudad,
      telefono: d.telefono,
      whatsapp: d.whatsapp,
      email: d.email,
    },
  });

  revalidatePath("/admin/plataforma/complejos");
  revalidatePath(`/admin/plataforma/complejos/${id}`);
  redirect("/admin/plataforma/complejos");
}

/** Activa/desactiva un complejo. Form action simple (sin useActionState). */
export async function alternarActivoComplejo(formData: FormData): Promise<void> {
  await requerirAdminGeneral();
  const id = texto(formData, "id");
  const complejo = await prisma.complejo.findUnique({ where: { id } });
  if (complejo) {
    await prisma.complejo.update({
      where: { id },
      data: { activo: !complejo.activo },
    });
    revalidatePath("/admin/plataforma/complejos");
  }
}

export async function crearAdminComplejo(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requerirAdminGeneral();
  const complejoId = texto(formData, "complejoId");
  if (!complejoId) return { error: "Complejo no encontrado." };

  const parseo = parsear(adminComplejoSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const { nombre, email, password } = parseo.data;

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { error: "Ya existe un usuario con ese email." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: { email, nombre, rol: "ADMIN_COMPLEJO", passwordHash },
    });
    await tx.complejoUsuario.create({
      data: { usuarioId: usuario.id, complejoId, rol: "ADMIN_COMPLEJO" },
    });
  });

  revalidatePath(`/admin/plataforma/complejos/${complejoId}`);
  redirect(`/admin/plataforma/complejos/${complejoId}`);
}

/** Quita a un administrador de un complejo (no borra el usuario). */
export async function quitarAdminComplejo(formData: FormData): Promise<void> {
  await requerirAdminGeneral();
  const membresiaId = texto(formData, "membresiaId");
  const complejoId = texto(formData, "complejoId");
  if (membresiaId) {
    await prisma.complejoUsuario.delete({ where: { id: membresiaId } });
    revalidatePath(`/admin/plataforma/complejos/${complejoId}`);
  }
}
