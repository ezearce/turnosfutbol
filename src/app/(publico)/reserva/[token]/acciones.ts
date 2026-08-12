"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cancelarReserva, puedeCancelarCliente } from "@/lib/reservas";

/** Cancela una reserva usando su token (la "llave" del comprobante). Sólo si es
 *  una RESERVA activa y todavía dentro de la ventana de cancelación del cliente. */
export async function cancelarReservaPorToken(formData: FormData): Promise<void> {
  const token = typeof formData.get("token") === "string"
    ? (formData.get("token") as string)
    : "";
  if (!token) return;

  const reserva = await prisma.reserva.findUnique({
    where: { token },
    select: { id: true, estado: true, tipo: true, iniciaEn: true },
  });
  if (!reserva) return;
  if (reserva.tipo !== "RESERVA") return; // los bloqueos no se cancelan por acá
  if (reserva.estado === "CANCELADA") return;
  if (!puedeCancelarCliente(reserva.iniciaEn)) return; // fuera de plazo

  await cancelarReserva(reserva.id, "Cancelada por el cliente");
  revalidatePath(`/reserva/${token}`);
}
