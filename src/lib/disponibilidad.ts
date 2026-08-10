import { prisma } from "@/lib/prisma";
import { localAInstante, diaSemana } from "@/lib/zona";
import type { Cancha, HorarioAtencion, ReglaPrecio } from "@/generated/prisma/client";

export type EstadoSlot = "LIBRE" | "OCUPADO" | "PASADO";

export type Slot = {
  inicia: string; // ISO UTC
  termina: string; // ISO UTC
  inicioMin: number; // minutos locales desde medianoche (para render "18:00")
  finMin: number;
  estado: EstadoSlot;
  precio: number | null;
};

type CanchaConReglas = Pick<Cancha, "precioBase"> & { reglasPrecio: ReglaPrecio[] };

/**
 * Precio de un slot: la regla que matchea con mayor prioridad; si ninguna,
 * el precio base de la cancha. Una regla con franja aplica sólo si el slot cae
 * completamente dentro de ella.
 */
export function resolverPrecio(
  cancha: CanchaConReglas,
  dia: number,
  inicioMin: number,
  finMin: number,
): number | null {
  const candidatas = cancha.reglasPrecio.filter((r) => {
    if (r.diaSemana != null && r.diaSemana !== dia) return false;
    if (r.inicioMin != null && r.finMin != null) {
      if (inicioMin < r.inicioMin || finMin > r.finMin) return false;
    }
    return true;
  });
  if (candidatas.length === 0) {
    return cancha.precioBase != null ? Number(cancha.precioBase) : null;
  }
  candidatas.sort((a, b) => b.prioridad - a.prioridad);
  return Number(candidatas[0].precio);
}

/** Genera los slots (con estado y precio) de una cancha para una fecha 'YYYY-MM-DD'. */
export async function disponibilidadCancha(
  canchaId: string,
  fechaISO: string,
  ahora: Date = new Date(),
): Promise<Slot[]> {
  const dia = diaSemana(fechaISO);

  const cancha = await prisma.cancha.findUnique({
    where: { id: canchaId },
    include: {
      horarios: { where: { diaSemana: dia } },
      reglasPrecio: true,
      complejo: { select: { activo: true } },
    },
  });
  if (!cancha || !cancha.activa || !cancha.complejo.activo) return [];

  // Reservas activas que tocan ese día (para marcar ocupados).
  const inicioDia = localAInstante(fechaISO, 0);
  const finDia = localAInstante(fechaISO, 24 * 60);
  const reservas = await prisma.reserva.findMany({
    where: {
      canchaId,
      estado: { not: "CANCELADA" },
      iniciaEn: { lt: finDia },
      terminaEn: { gt: inicioDia },
    },
    select: { iniciaEn: true, terminaEn: true },
  });

  const slots: Slot[] = [];
  for (const h of cancha.horarios as HorarioAtencion[]) {
    for (
      let ini = h.aperturaMin;
      ini + h.minutosTurno <= h.cierreMin;
      ini += h.minutosTurno
    ) {
      const fin = ini + h.minutosTurno;
      const inicia = localAInstante(fechaISO, ini);
      const termina = localAInstante(fechaISO, fin);

      const ocupado = reservas.some(
        (r) => r.iniciaEn < termina && r.terminaEn > inicia,
      );
      const pasado = inicia.getTime() <= ahora.getTime();

      slots.push({
        inicia: inicia.toISOString(),
        termina: termina.toISOString(),
        inicioMin: ini,
        finMin: fin,
        estado: ocupado ? "OCUPADO" : pasado ? "PASADO" : "LIBRE",
        precio: resolverPrecio(cancha, dia, ini, fin),
      });
    }
  }

  slots.sort((a, b) => a.inicioMin - b.inicioMin);
  return slots;
}
