import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  hoyISO,
  inicioSemanaISO,
  sumarDiasISO,
  esFechaISOValida,
  localAInstante,
  minutosLocales,
  horaLocalHHMM,
  diaSemana,
} from "@/lib/zona";
import { nombreDia } from "@/lib/horas";
import { formatearPrecio } from "@/lib/formato";

const PX_HORA = 48; // alto de una hora en el grid
const ALTO_HEADER = 40;

/** 'YYYY-MM-DD' → 'dd/mm' para los encabezados. */
function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ complejoId: string }>;
  searchParams: Promise<{ canchaId?: string; semana?: string }>;
}) {
  const { complejoId } = await params;
  const sp = await searchParams;

  const canchas = await prisma.cancha.findMany({
    where: { complejoId },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  const canchaId =
    canchas.find((c) => c.id === sp.canchaId)?.id ?? canchas[0]?.id ?? "";
  const refSemana =
    sp.semana && esFechaISOValida(sp.semana) ? sp.semana : hoyISO();
  const lunes = inicioSemanaISO(refSemana);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDiasISO(lunes, i));
  const hoy = hoyISO();

  // Rango horario del grid: según los horarios de atención de la cancha.
  const horarios = canchaId
    ? await prisma.horarioAtencion.findMany({
        where: { canchaId },
        select: { aperturaMin: true, cierreMin: true },
      })
    : [];
  const hInicio =
    horarios.length > 0
      ? Math.floor(Math.min(...horarios.map((h) => h.aperturaMin)) / 60)
      : 8;
  const hFin =
    horarios.length > 0
      ? Math.ceil(Math.max(...horarios.map((h) => h.cierreMin)) / 60)
      : 24;
  const horas = Array.from({ length: hFin - hInicio + 1 }, (_, i) => hInicio + i);
  const altoGrid = (hFin - hInicio) * PX_HORA;

  // Reservas y bloqueos de la semana (no canceladas).
  const inicioSemanaInstante = localAInstante(lunes, 0);
  const finSemanaInstante = localAInstante(sumarDiasISO(lunes, 7), 0);
  const eventos = canchaId
    ? await prisma.reserva.findMany({
        where: {
          canchaId,
          estado: { not: "CANCELADA" },
          iniciaEn: { lt: finSemanaInstante },
          terminaEn: { gt: inicioSemanaInstante },
        },
        orderBy: { iniciaEn: "asc" },
      })
    : [];

  // Bucketea cada evento por día y calcula su posición vertical.
  function eventosDelDia(diaISO: string) {
    const ini = localAInstante(diaISO, 0);
    const fin = localAInstante(sumarDiasISO(diaISO, 1), 0);
    return eventos
      .filter((e) => e.iniciaEn >= ini && e.iniciaEn < fin)
      .map((e) => {
        const inicioMin = minutosLocales(e.iniciaEn);
        let finMin = minutosLocales(e.terminaEn);
        if (finMin <= inicioMin) finMin = 24 * 60; // termina a medianoche
        const top = ((inicioMin - hInicio * 60) / 60) * PX_HORA;
        const alto = Math.max(((finMin - inicioMin) / 60) * PX_HORA, 20);
        return { ...e, inicioMin, top: Math.max(top, 0), alto };
      });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <Link
          href={`/admin/complejo/${complejoId}/canchas`}
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          Canchas →
        </Link>
      </div>

      {canchas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-marca-borde bg-marca-superficie p-8 text-center text-sm text-marca-marron">
          Primero cargá una cancha con horarios para ver el calendario.
        </p>
      ) : (
        <>
          {/* Controles: cancha + navegación de semana */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <form method="get" className="flex items-end gap-2">
              <input type="hidden" name="semana" value={lunes} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                Cancha
                <select
                  name="canchaId"
                  defaultValue={canchaId}
                  className="rounded-md border border-marca-borde bg-marca-superficie px-3 py-2 outline-none focus:border-marca-verde"
                >
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
              >
                Ver
              </button>
            </form>

            <div className="flex items-center gap-2 text-sm">
              <Link
                href={`/admin/complejo/${complejoId}/calendario?canchaId=${canchaId}&semana=${sumarDiasISO(lunes, -7)}`}
                className="rounded-md border border-marca-borde px-3 py-2 font-medium transition-colors hover:bg-marca-crema"
              >
                ← Anterior
              </Link>
              <Link
                href={`/admin/complejo/${complejoId}/calendario?canchaId=${canchaId}&semana=${hoy}`}
                className="rounded-md border border-marca-borde px-3 py-2 font-medium transition-colors hover:bg-marca-crema"
              >
                Hoy
              </Link>
              <Link
                href={`/admin/complejo/${complejoId}/calendario?canchaId=${canchaId}&semana=${sumarDiasISO(lunes, 7)}`}
                className="rounded-md border border-marca-borde px-3 py-2 font-medium transition-colors hover:bg-marca-crema"
              >
                Siguiente →
              </Link>
            </div>
          </div>

          <p className="text-sm text-marca-marron">
            Semana del {ddmm(lunes)} al {ddmm(sumarDiasISO(lunes, 6))}. Tocá un
            turno o el día para gestionarlo en la agenda.
          </p>

          {/* Grid semanal */}
          <div className="overflow-x-auto rounded-lg border border-marca-borde bg-marca-superficie">
            <div className="flex min-w-[720px]">
              {/* Eje de horas */}
              <div className="w-14 shrink-0">
                <div style={{ height: ALTO_HEADER }} />
                <div className="relative" style={{ height: altoGrid }}>
                  {horas.map((h) => (
                    <div
                      key={h}
                      className="absolute right-2 -translate-y-1/2 text-xs text-marca-marron"
                      style={{ top: (h - hInicio) * PX_HORA }}
                    >
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Columnas por día */}
              <div className="flex flex-1">
                {dias.map((diaISO) => {
                  const esHoy = diaISO === hoy;
                  const delDia = eventosDelDia(diaISO);
                  return (
                    <div key={diaISO} className="flex-1 border-l border-marca-borde">
                      <Link
                        href={`/admin/complejo/${complejoId}/agenda?canchaId=${canchaId}&fecha=${diaISO}`}
                        className={`flex flex-col items-center justify-center border-b border-marca-borde text-xs transition-colors hover:bg-marca-crema ${
                          esHoy ? "bg-marca-verde-claro font-semibold" : ""
                        }`}
                        style={{ height: ALTO_HEADER }}
                      >
                        <span className="uppercase text-marca-marron">
                          {nombreDia(diaSemana(diaISO)).slice(0, 3)}
                        </span>
                        <span>{ddmm(diaISO)}</span>
                      </Link>
                      <div
                        className={`relative ${esHoy ? "bg-marca-verde-claro/20" : ""}`}
                        style={{ height: altoGrid }}
                      >
                        {/* Líneas de hora */}
                        {horas.map((h) => (
                          <div
                            key={h}
                            className="absolute inset-x-0 border-t border-marca-borde/40"
                            style={{ top: (h - hInicio) * PX_HORA }}
                          />
                        ))}
                        {/* Eventos */}
                        {delDia.map((e) => {
                          const esBloqueo = e.tipo === "BLOQUEO";
                          const titulo = esBloqueo
                            ? e.motivoBloqueo ?? "Bloqueo"
                            : [e.clienteNombre, e.clienteApellido]
                                .filter(Boolean)
                                .join(" ") || "Reserva";
                          return (
                            <Link
                              key={e.id}
                              href={`/admin/complejo/${complejoId}/agenda?canchaId=${canchaId}&fecha=${diaISO}`}
                              className={`absolute inset-x-0.5 overflow-hidden rounded px-1.5 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-90 ${
                                esBloqueo
                                  ? "bg-suave text-superficie"
                                  : "bg-primario text-primario-contraste"
                              }`}
                              style={{ top: e.top, height: e.alto }}
                            >
                              <div className="font-medium">
                                {horaLocalHHMM(e.iniciaEn)}
                              </div>
                              <div className="truncate">{titulo}</div>
                              {!esBloqueo && Number(e.precio) > 0 ? (
                                <div className="truncate opacity-80">
                                  {formatearPrecio(e.precio)}
                                </div>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
