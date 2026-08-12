// Métricas del panel admin (Fase 6). Todo filtra por complejoId (aislamiento
// multi-tenant) y respeta la zona horaria argentina para los cortes de día.

import { prisma } from "@/lib/prisma";
import { hoyISO, localAInstante, sumarDiasISO } from "@/lib/zona";

export type ResumenComplejo = {
  reservasHoy: number;
  bloqueosHoy: number;
  ingresoHoy: number; // suma de precios de reservas confirmadas de hoy
  reservasProximos7: number;
};

/** Resumen del día y la semana entrante para el dashboard de un complejo. */
export async function resumenComplejo(complejoId: string): Promise<ResumenComplejo> {
  const hoy = hoyISO();
  const inicioHoy = localAInstante(hoy, 0);
  const finHoy = localAInstante(sumarDiasISO(hoy, 1), 0);
  const fin7 = localAInstante(sumarDiasISO(hoy, 7), 0);

  const [deHoy, reservasProximos7] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        complejoId,
        estado: { not: "CANCELADA" },
        iniciaEn: { gte: inicioHoy, lt: finHoy },
      },
      select: { tipo: true, estado: true, precio: true },
    }),
    prisma.reserva.count({
      where: {
        complejoId,
        tipo: "RESERVA",
        estado: { not: "CANCELADA" },
        iniciaEn: { gte: inicioHoy, lt: fin7 },
      },
    }),
  ]);

  const reservasHoy = deHoy.filter((r) => r.tipo === "RESERVA").length;
  const bloqueosHoy = deHoy.filter((r) => r.tipo === "BLOQUEO").length;
  const ingresoHoy = deHoy
    .filter((r) => r.tipo === "RESERVA")
    .reduce((acc, r) => acc + Number(r.precio), 0);

  return { reservasHoy, bloqueosHoy, ingresoHoy, reservasProximos7 };
}
