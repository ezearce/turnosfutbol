"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearReserva } from "@/lib/reservas";
import { parsear, reservaPublicaSchema } from "@/lib/validaciones";
import { limitar, ipCliente } from "@/lib/rate-limit";
import type { EstadoFormulario } from "@/lib/formularios";

export async function reservarPublico(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // Rate limit por IP: freno básico contra abuso del endpoint público.
  const { ok: dentroDelLimite } = limitar(`reserva:${await ipCliente()}`, 8, 60_000);
  if (!dentroDelLimite)
    return { error: "Demasiados intentos. Esperá un momento e intentá de nuevo." };

  const parseo = parsear(reservaPublicaSchema, Object.fromEntries(formData));
  if (!parseo.ok) return { error: parseo.error };
  const d = parseo.data;

  // La cancha debe pertenecer a un complejo activo con ese slug (evita usar un
  // canchaId de otro complejo con un slug cualquiera).
  const cancha = await prisma.cancha.findFirst({
    where: { id: d.canchaId, activa: true, complejo: { slug: d.slug, activo: true } },
    select: { id: true },
  });
  if (!cancha) return { error: "La cancha no está disponible." };

  const resultado = await crearReserva({
    canchaId: d.canchaId,
    fechaISO: d.fecha,
    inicioMin: d.inicioMin,
    finMin: d.finMin,
    cliente: {
      nombre: d.nombre,
      apellido: d.apellido,
      telefono: d.telefono,
      email: d.email,
    },
    origen: "WEB",
  });
  if (!resultado.ok) return { error: resultado.error };

  redirect(`/reserva/${resultado.token}`);
}
