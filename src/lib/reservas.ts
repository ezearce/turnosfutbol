// Núcleo de reservas (Fase 5). Reutilizable por el panel admin (reservas
// manuales / bloqueos) y por el sitio público (Fase 7). La garantía contra
// superposiciones vive en la BD (constraint EXCLUDE con btree_gist); acá sólo
// capturamos su error (código Postgres 23P01) para devolver un mensaje amable.
//
// Invariantes respetadas:
//  - Precio congelado: se resuelve con `resolverPrecio` al crear y se guarda en
//    `reservas.precio`; cambios de precio futuros no afectan esta reserva.
//  - Nunca confiar en el frontend para la exclusión temporal: la BD es la verdad.
//  - Cancelar no borra: pasa la fila a estado CANCELADA.

import { prisma } from "@/lib/prisma";
import { resolverPrecio } from "@/lib/disponibilidad";
import { localAInstante, diaSemana } from "@/lib/zona";
import { enviarComprobanteReserva } from "@/lib/email";
import type {
  OrigenReserva,
  EstadoReserva,
  TipoReserva,
} from "@/generated/prisma/client";

export type ResultadoReserva =
  | { ok: true; id: string; token: string }
  | { ok: false; error: string };

/** Horas mínimas de antelación para que un cliente cancele su propia reserva. */
export const HORAS_CANCELACION_CLIENTE = 2;

/** ¿El cliente todavía está a tiempo de cancelar (≥ N h antes del inicio)? */
export function puedeCancelarCliente(iniciaEn: Date, ahora: Date = new Date()): boolean {
  return (
    iniciaEn.getTime() - ahora.getTime() >=
    HORAS_CANCELACION_CLIENTE * 60 * 60 * 1000
  );
}

export type EstadoCancelacionCliente = "CANCELABLE" | "FUERA_DE_PLAZO" | "NO_APLICA";

/** Estado de la cancelación por parte del cliente, para decidir qué mostrar en el
 *  comprobante. Encapsula el uso de la hora actual (no debe hacerse en el render). */
export function estadoCancelacionCliente(
  reserva: { estado: EstadoReserva; tipo: TipoReserva; iniciaEn: Date },
  ahora: Date = new Date(),
): EstadoCancelacionCliente {
  if (reserva.tipo !== "RESERVA" || reserva.estado === "CANCELADA") return "NO_APLICA";
  if (reserva.iniciaEn.getTime() <= ahora.getTime()) return "NO_APLICA"; // ya empezó/pasó
  return puedeCancelarCliente(reserva.iniciaEn, ahora) ? "CANCELABLE" : "FUERA_DE_PLAZO";
}

/** Error de negocio dentro de la transacción (se traduce a { ok:false }). */
class ErrorReserva extends Error {}

/**
 * Detecta el error del constraint anti-superposición (Postgres `23P01`,
 * exclusion_violation) recorriendo la cadena de causas del error, porque Prisma
 * no mapea los EXCLUDE a un código propio y el detalle puede venir anidado.
 */
export function esErrorSuperposicion(e: unknown): boolean {
  const vistos = new Set<unknown>();
  let actual: unknown = e;
  while (actual && typeof actual === "object" && !vistos.has(actual)) {
    vistos.add(actual);
    const o = actual as Record<string, unknown>;
    if (o.code === "23P01") return true;
    const texto = [
      typeof o.message === "string" ? o.message : "",
      o.meta ? JSON.stringify(o.meta) : "",
    ].join(" ");
    if (/23P01|reservas_sin_superposicion|exclusion/i.test(texto)) return true;
    actual = o.cause;
  }
  return false;
}

type DatosReserva = {
  canchaId: string;
  fechaISO: string; // 'YYYY-MM-DD'
  inicioMin: number; // minutos locales desde medianoche
  finMin: number;
  cliente?: {
    nombre?: string | null;
    apellido?: string | null;
    telefono?: string | null;
    email?: string | null;
  };
  origen: OrigenReserva;
  creadaPorId?: string | null;
};

/**
 * Crea una reserva (tipo RESERVA) para un turno. Congela el precio con
 * `resolverPrecio` dentro de una transacción y confía en el constraint EXCLUDE
 * para la concurrencia. Devuelve un resultado tipado (no lanza en el camino
 * feliz ni ante "turno ocupado").
 */
export async function crearReserva(datos: DatosReserva): Promise<ResultadoReserva> {
  const dia = diaSemana(datos.fechaISO);
  const inicia = localAInstante(datos.fechaISO, datos.inicioMin);
  const termina = localAInstante(datos.fechaISO, datos.finMin);

  if (datos.finMin <= datos.inicioMin)
    return { ok: false, error: "El turno tiene un rango inválido." };
  if (inicia.getTime() <= Date.now())
    return { ok: false, error: "Ese turno ya pasó." };

  try {
    // Datos para el email del comprobante, capturados dentro de la transacción.
    let datosEmail: { canchaNombre: string; complejoNombre: string; precio: number } | null =
      null;

    const reserva = await prisma.$transaction(async (tx) => {
      const cancha = await tx.cancha.findUnique({
        where: { id: datos.canchaId },
        include: {
          reglasPrecio: true,
          complejo: { select: { activo: true, nombre: true } },
        },
      });
      if (!cancha || !cancha.activa || !cancha.complejo.activo)
        throw new ErrorReserva("La cancha no está disponible.");

      const precio = resolverPrecio(cancha, dia, datos.inicioMin, datos.finMin) ?? 0;
      datosEmail = {
        canchaNombre: cancha.nombre,
        complejoNombre: cancha.complejo.nombre,
        precio,
      };

      return tx.reserva.create({
        data: {
          complejoId: cancha.complejoId,
          canchaId: datos.canchaId,
          iniciaEn: inicia,
          terminaEn: termina,
          tipo: "RESERVA",
          estado: "CONFIRMADA",
          precio,
          clienteNombre: datos.cliente?.nombre ?? null,
          clienteApellido: datos.cliente?.apellido ?? null,
          clienteTelefono: datos.cliente?.telefono ?? null,
          clienteEmail: datos.cliente?.email ?? null,
          origen: datos.origen,
          creadaPorId: datos.creadaPorId ?? null,
        },
        select: { id: true, token: true },
      });
    });

    // Comprobante por email (si hay email y proveedor configurado). No bloquea
    // ni voltea la reserva si el envío falla: enviarComprobanteReserva no lanza.
    const email = datos.cliente?.email;
    if (email && datosEmail) {
      const d = datosEmail as { canchaNombre: string; complejoNombre: string; precio: number };
      await enviarComprobanteReserva({
        email,
        clienteNombre: datos.cliente?.nombre ?? null,
        complejoNombre: d.complejoNombre,
        canchaNombre: d.canchaNombre,
        fechaISO: datos.fechaISO,
        inicioMin: datos.inicioMin,
        finMin: datos.finMin,
        precio: d.precio,
        token: reserva.token,
      });
    }

    return { ok: true, id: reserva.id, token: reserva.token };
  } catch (e) {
    if (e instanceof ErrorReserva) return { ok: false, error: e.message };
    if (esErrorSuperposicion(e))
      return { ok: false, error: "Ese turno se acaba de ocupar. Probá con otro." };
    throw e;
  }
}

type DatosBloqueo = {
  canchaId: string;
  fechaISO: string;
  inicioMin: number;
  finMin: number;
  motivo?: string | null;
  creadaPorId?: string | null;
};

/**
 * Crea un bloqueo (tipo BLOQUEO, estado BLOQUEADA, precio 0) para un rango del
 * día. Ocupa el tiempo igual que una reserva (el constraint EXCLUDE los trata
 * por igual mientras no estén CANCELADA).
 */
export async function crearBloqueo(datos: DatosBloqueo): Promise<ResultadoReserva> {
  if (datos.finMin <= datos.inicioMin)
    return { ok: false, error: "El fin debe ser posterior al inicio." };

  const cancha = await prisma.cancha.findUnique({
    where: { id: datos.canchaId },
    select: { complejoId: true },
  });
  if (!cancha) return { ok: false, error: "Cancha no encontrada." };

  const inicia = localAInstante(datos.fechaISO, datos.inicioMin);
  const termina = localAInstante(datos.fechaISO, datos.finMin);

  try {
    const bloqueo = await prisma.reserva.create({
      data: {
        complejoId: cancha.complejoId,
        canchaId: datos.canchaId,
        iniciaEn: inicia,
        terminaEn: termina,
        tipo: "BLOQUEO",
        estado: "BLOQUEADA",
        precio: 0,
        motivoBloqueo: datos.motivo ?? null,
        origen: "MANUAL",
        creadaPorId: datos.creadaPorId ?? null,
      },
      select: { id: true, token: true },
    });
    return { ok: true, id: bloqueo.id, token: bloqueo.token };
  } catch (e) {
    if (esErrorSuperposicion(e))
      return {
        ok: false,
        error: "Ese rango se superpone con una reserva o bloqueo existente.",
      };
    throw e;
  }
}

/** Cancela una reserva o bloqueo (no borra: pasa a estado CANCELADA). */
export async function cancelarReserva(id: string, motivo?: string): Promise<void> {
  await prisma.reserva.update({
    where: { id },
    data: {
      estado: "CANCELADA",
      canceladaEn: new Date(),
      motivoCancelacion: motivo ?? null,
    },
  });
}
