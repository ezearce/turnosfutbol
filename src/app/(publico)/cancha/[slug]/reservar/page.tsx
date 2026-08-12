import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { disponibilidadCancha } from "@/lib/disponibilidad";
import { hoyISO, esFechaISOValida, fechaLargaAR } from "@/lib/zona";
import { minutosAHHMM } from "@/lib/horas";
import { formatearPrecio } from "@/lib/formato";
import { ReservaClienteForm } from "./_componentes/reserva-cliente-form";
import { reservarPublico } from "./acciones";

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    canchaId?: string;
    fecha?: string;
    inicio?: string;
    fin?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const complejo = await prisma.complejo.findFirst({
    where: { slug, activo: true },
    select: {
      slug: true,
      nombre: true,
      canchas: {
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, tipo: true },
      },
    },
  });
  if (!complejo) notFound();
  if (complejo.canchas.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold">{complejo.nombre}</h1>
        <p className="mt-4 text-suave">
          Este complejo no tiene canchas disponibles para reservar.
        </p>
      </main>
    );
  }

  const cancha =
    complejo.canchas.find((c) => c.id === sp.canchaId) ?? complejo.canchas[0];
  const hoy = hoyISO();
  const fecha = sp.fecha && esFechaISOValida(sp.fecha) ? sp.fecha : hoy;

  const slots = await disponibilidadCancha(cancha.id, fecha);

  const inicio = Number(sp.inicio);
  const fin = Number(sp.fin);
  const seleccionado =
    Number.isFinite(inicio) && Number.isFinite(fin)
      ? slots.find(
          (s) => s.inicioMin === inicio && s.finMin === fin && s.estado === "LIBRE",
        )
      : undefined;

  const rutaBase = `/cancha/${complejo.slug}/reservar`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href={`/cancha/${complejo.slug}`}
        className="text-sm text-suave transition-colors hover:text-primario"
      >
        ← {complejo.nombre}
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Reservar turno</h1>

      {/* Pasos */}
      <ol className="mt-4 flex items-center gap-2 text-sm">
        <li className={seleccionado ? "text-suave" : "font-semibold text-primario"}>
          1. Elegí turno
        </li>
        <li className="text-suave" aria-hidden>
          →
        </li>
        <li className={seleccionado ? "font-semibold text-primario" : "text-suave"}>
          2. Tus datos
        </li>
      </ol>

      {/* Selector de cancha + fecha */}
      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-[var(--tf-sombra)]"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Cancha
          <select
            name="canchaId"
            defaultValue={cancha.id}
            className="rounded-xl border border-borde bg-superficie px-3 py-2 text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario/20"
          >
            {complejo.canchas.map((c) => (
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
            min={hoy}
            className="rounded-xl border border-borde bg-superficie px-3 py-2 text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario/20"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-primario px-5 py-2 font-semibold text-primario-contraste transition-colors hover:bg-primario-fuerte"
        >
          Ver turnos
        </button>
      </form>

      {seleccionado ? (
        // ── Paso 2: datos del cliente ──
        <section className="mt-8">
          <div className="rounded-2xl border border-primario-borde bg-primario-suave p-4 text-sm">
            <div className="font-semibold text-primario">
              {cancha.nombre} · {fechaLargaAR(fecha)}
            </div>
            <div className="text-texto">
              {minutosAHHMM(seleccionado.inicioMin)}–
              {minutosAHHMM(seleccionado.finMin)}
              {seleccionado.precio != null
                ? ` · ${formatearPrecio(seleccionado.precio)}`
                : ""}
            </div>
            <Link
              href={`${rutaBase}?canchaId=${cancha.id}&fecha=${fecha}`}
              className="mt-1 inline-block font-medium text-primario underline hover:text-primario-fuerte"
            >
              Cambiar turno
            </Link>
          </div>

          <h2 className="mt-6 text-lg font-semibold">Tus datos</h2>
          <p className="text-sm text-suave">
            Completá tus datos para confirmar. El pago es en el complejo.
          </p>
          <div className="mt-3">
            <ReservaClienteForm
              accion={reservarPublico}
              slug={complejo.slug}
              canchaId={cancha.id}
              fecha={fecha}
              inicioMin={seleccionado.inicioMin}
              finMin={seleccionado.finMin}
            />
          </div>
        </section>
      ) : (
        // ── Paso 1: elegir turno ──
        <section className="mt-8">
          {sp.inicio ? (
            <p className="mb-4 rounded-xl border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              Ese turno ya no está disponible. Elegí otro.
            </p>
          ) : null}
          <h2 className="text-lg font-semibold">Turnos del {fechaLargaAR(fecha)}</h2>

          {slots.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-borde p-8 text-center text-suave">
              La cancha no atiende ese día. Probá con otra fecha.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((s) => {
                const libre = s.estado === "LIBRE";
                const etiqueta = `${minutosAHHMM(s.inicioMin)}–${minutosAHHMM(s.finMin)}`;
                if (!libre) {
                  return (
                    <div
                      key={`${s.inicioMin}-${s.finMin}`}
                      className="flex flex-col rounded-xl border border-borde bg-superficie-2 px-3 py-2 text-sm text-suave opacity-70"
                    >
                      <span className="font-medium line-through">{etiqueta}</span>
                      <span className="text-xs">
                        {s.estado === "OCUPADO" ? "Ocupado" : "No disponible"}
                      </span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={`${s.inicioMin}-${s.finMin}`}
                    href={`${rutaBase}?canchaId=${cancha.id}&fecha=${fecha}&inicio=${s.inicioMin}&fin=${s.finMin}`}
                    className="flex flex-col rounded-xl border border-primario-borde bg-primario-suave px-3 py-2 text-sm text-primario transition-transform hover:-translate-y-0.5"
                  >
                    <span className="font-semibold">{etiqueta}</span>
                    <span className="text-xs">
                      {s.precio != null ? formatearPrecio(s.precio) : "Reservar"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
