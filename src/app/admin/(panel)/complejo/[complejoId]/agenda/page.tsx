import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { disponibilidadCancha } from "@/lib/disponibilidad";
import { localAInstante, hoyISO, horaLocalHHMM, esFechaISOValida } from "@/lib/zona";
import { minutosAHHMM } from "@/lib/horas";
import { formatearPrecio } from "@/lib/formato";
import { ReservaManualForm, type TurnoLibre } from "./_componentes/reserva-manual-form";
import { BloqueoForm } from "./_componentes/bloqueo-form";
import { reservarManual, bloquear, cancelar } from "./acciones";

const ESTADO_SLOT: Record<string, { texto: string; clase: string }> = {
  LIBRE: {
    texto: "Libre",
    clase: "bg-marca-verde-claro text-marca-verde-oscuro",
  },
  OCUPADO: { texto: "Ocupado", clase: "bg-neutral-200 text-neutral-600" },
  PASADO: { texto: "Pasado", clase: "bg-neutral-100 text-neutral-400" },
};

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ complejoId: string }>;
  searchParams: Promise<{ canchaId?: string; fecha?: string }>;
}) {
  const { complejoId } = await params;
  const sp = await searchParams;

  const canchas = await prisma.cancha.findMany({
    where: { complejoId },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  // Cancha seleccionada: la del query si pertenece al complejo, si no la primera.
  const canchaId =
    canchas.find((c) => c.id === sp.canchaId)?.id ?? canchas[0]?.id ?? "";
  const fecha =
    sp.fecha && esFechaISOValida(sp.fecha) ? sp.fecha : hoyISO();

  const slots = canchaId ? await disponibilidadCancha(canchaId, fecha) : [];

  const turnosLibres: TurnoLibre[] = slots
    .filter((s) => s.estado === "LIBRE")
    .map((s) => ({
      valor: `${s.inicioMin}-${s.finMin}`,
      etiqueta: `${minutosAHHMM(s.inicioMin)}–${minutosAHHMM(s.finMin)}${
        s.precio != null ? ` · ${formatearPrecio(s.precio)}` : ""
      }`,
    }));

  // Reservas y bloqueos activos del día (para la lista con cancelación).
  const inicioDia = localAInstante(fecha, 0);
  const finDia = localAInstante(fecha, 24 * 60);
  const reservas = canchaId
    ? await prisma.reserva.findMany({
        where: {
          canchaId,
          estado: { not: "CANCELADA" },
          iniciaEn: { lt: finDia },
          terminaEn: { gt: inicioDia },
        },
        orderBy: { iniciaEn: "asc" },
      })
    : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Link
          href={`/admin/complejo/${complejoId}/canchas`}
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          Canchas →
        </Link>
      </div>

      {canchas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-marca-borde bg-white p-8 text-center text-sm text-marca-marron">
          Primero cargá una cancha con horarios para poder tomar reservas.
        </p>
      ) : (
        <>
          {/* Selector de cancha + fecha (navegación GET) */}
          <form
            method="get"
            className="flex flex-wrap items-end gap-3 rounded-lg border border-marca-borde bg-white p-4"
          >
            <label className="flex flex-col gap-1 text-sm font-medium">
              Cancha
              <select
                name="canchaId"
                defaultValue={canchaId}
                className="rounded-md border border-marca-borde bg-white px-3 py-2 outline-none focus:border-marca-verde"
              >
                {canchas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Fecha
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                className="rounded-md border border-marca-borde bg-white px-3 py-2 outline-none focus:border-marca-verde"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
            >
              Ver
            </button>
          </form>

          {/* Grilla de turnos del día */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Turnos del día</h2>
            {slots.length === 0 ? (
              <p className="text-sm text-marca-marron">
                Esta cancha no tiene horarios de atención para ese día.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => {
                  const est = ESTADO_SLOT[s.estado];
                  return (
                    <div
                      key={`${s.inicioMin}-${s.finMin}`}
                      className={`flex flex-col rounded-md px-3 py-2 text-sm ${est.clase}`}
                    >
                      <span className="font-medium">
                        {minutosAHHMM(s.inicioMin)}–{minutosAHHMM(s.finMin)}
                      </span>
                      <span className="text-xs opacity-80">
                        {est.texto}
                        {s.estado === "LIBRE" && s.precio != null
                          ? ` · ${formatearPrecio(s.precio)}`
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reserva manual */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Reserva manual</h2>
            <div className="rounded-lg border border-marca-borde bg-white p-4">
              <ReservaManualForm
                accion={reservarManual}
                complejoId={complejoId}
                canchaId={canchaId}
                fecha={fecha}
                turnosLibres={turnosLibres}
              />
            </div>
          </section>

          {/* Bloqueo */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Bloquear horario</h2>
            <div className="rounded-lg border border-marca-borde bg-white p-4">
              <BloqueoForm
                accion={bloquear}
                complejoId={complejoId}
                canchaId={canchaId}
                fecha={fecha}
              />
            </div>
          </section>

          {/* Lista del día */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Reservas y bloqueos del día</h2>
            {reservas.length === 0 ? (
              <p className="text-sm text-marca-marron">Nada agendado para este día.</p>
            ) : (
              <ul className="divide-y divide-marca-borde rounded-lg border border-marca-borde bg-white">
                {reservas.map((r) => {
                  const esBloqueo = r.tipo === "BLOQUEO";
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {horaLocalHHMM(r.iniciaEn)}–{horaLocalHHMM(r.terminaEn)}
                        </span>{" "}
                        <span
                          className={
                            esBloqueo
                              ? "rounded-full bg-marca-marron/10 px-2 py-0.5 text-xs font-medium text-marca-marron"
                              : "rounded-full bg-marca-verde-claro px-2 py-0.5 text-xs font-medium text-marca-verde-oscuro"
                          }
                        >
                          {esBloqueo ? "Bloqueo" : "Reserva"}
                        </span>
                        <div className="text-marca-marron">
                          {esBloqueo
                            ? r.motivoBloqueo ?? "Sin motivo"
                            : [r.clienteNombre, r.clienteApellido]
                                .filter(Boolean)
                                .join(" ") || "Sin nombre"}
                          {!esBloqueo && r.clienteTelefono
                            ? ` · ${r.clienteTelefono}`
                            : ""}
                          {!esBloqueo ? ` · ${formatearPrecio(r.precio)}` : ""}
                        </div>
                      </div>
                      <form action={cancelar}>
                        <input type="hidden" name="complejoId" value={complejoId} />
                        <input type="hidden" name="canchaId" value={canchaId} />
                        <input type="hidden" name="fecha" value={fecha} />
                        <input type="hidden" name="reservaId" value={r.id} />
                        <button
                          type="submit"
                          className="text-marca-marron hover:text-red-600"
                        >
                          Cancelar
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
