import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nombreDia, minutosAHHMM } from "@/lib/horas";
import { formatearPrecio } from "@/lib/formato";
import { CanchaForm } from "../_componentes/cancha-form";
import { HorarioForm } from "../_componentes/horario-form";
import { PrecioForm } from "../_componentes/precio-form";
import { FotosCancha } from "../_componentes/fotos-cancha";
import {
  editarCancha,
  quitarHorario,
  agregarHorario,
  quitarReglaPrecio,
  agregarReglaPrecio,
} from "../acciones";

export default async function ConfigurarCanchaPage({
  params,
}: {
  params: Promise<{ complejoId: string; canchaId: string }>;
}) {
  const { complejoId, canchaId } = await params;

  const cancha = await prisma.cancha.findFirst({
    where: { id: canchaId, complejoId },
    include: {
      horarios: { orderBy: [{ diaSemana: "asc" }, { aperturaMin: "asc" }] },
      reglasPrecio: { orderBy: [{ prioridad: "desc" }, { diaSemana: "asc" }] },
      fotos: { orderBy: { posicion: "asc" } },
    },
  });
  if (!cancha) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10">
      <div>
        <Link
          href={`/admin/complejo/${complejoId}/canchas`}
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          ← Volver a canchas
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{cancha.nombre}</h1>
      </div>

      {/* Datos de la cancha */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Datos de la cancha</h2>
        <CanchaForm
          accion={editarCancha}
          complejoId={complejoId}
          canchaId={cancha.id}
          textoBoton="Guardar cambios"
          valores={{
            nombre: cancha.nombre,
            tipo: cancha.tipo,
            superficie: cancha.superficie ?? undefined,
            techada: cancha.techada,
            precioBase: cancha.precioBase != null ? String(cancha.precioBase) : undefined,
          }}
        />
      </section>

      {/* Fotos */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Fotos</h2>
          <p className="text-sm text-marca-marron">
            Se muestran en el sitio público. La primera es la portada.
          </p>
        </div>
        <FotosCancha
          complejoId={complejoId}
          canchaId={cancha.id}
          fotos={cancha.fotos.map((f) => ({ id: f.id, url: f.url }))}
        />
      </section>

      {/* Horarios de atención */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Horarios de atención</h2>
          <p className="text-sm text-marca-marron">
            Definí los días y el rango horario. De acá se generan los turnos.
          </p>
        </div>

        {cancha.horarios.length === 0 ? (
          <p className="text-sm text-marca-marron">Sin horarios cargados.</p>
        ) : (
          <ul className="divide-y divide-marca-borde rounded-lg border border-marca-borde bg-marca-superficie">
            {cancha.horarios.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{nombreDia(h.diaSemana)}</span>{" "}
                  {minutosAHHMM(h.aperturaMin)}–{minutosAHHMM(h.cierreMin)}
                  <span className="text-marca-marron">
                    {" "}· turnos de {h.minutosTurno} min
                  </span>
                </span>
                <form action={quitarHorario}>
                  <input type="hidden" name="complejoId" value={complejoId} />
                  <input type="hidden" name="canchaId" value={cancha.id} />
                  <input type="hidden" name="horarioId" value={h.id} />
                  <button type="submit" className="text-marca-marron hover:text-red-600">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-marca-borde bg-marca-superficie p-4">
          <h3 className="mb-3 text-sm font-semibold">Agregar horario</h3>
          <HorarioForm accion={agregarHorario} complejoId={complejoId} canchaId={cancha.id} />
        </div>
      </section>

      {/* Precios */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Precios</h2>
          <p className="text-sm text-marca-marron">
            Precio base:{" "}
            <strong>
              {cancha.precioBase != null ? formatearPrecio(cancha.precioBase) : "sin definir"}
            </strong>
            . Las reglas más específicas (día / franja) tienen prioridad.
          </p>
        </div>

        {cancha.reglasPrecio.length === 0 ? (
          <p className="text-sm text-marca-marron">
            Sin reglas. Se usa el precio base para todos los turnos.
          </p>
        ) : (
          <ul className="divide-y divide-marca-borde rounded-lg border border-marca-borde bg-marca-superficie">
            {cancha.reglasPrecio.map((r) => {
              const franja =
                r.inicioMin != null && r.finMin != null
                  ? `${minutosAHHMM(r.inicioMin)}–${minutosAHHMM(r.finMin)}`
                  : "todo el día";
              const dia = r.diaSemana != null ? nombreDia(r.diaSemana) : "Todos los días";
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{formatearPrecio(r.precio)}</span>
                    <span className="text-marca-marron"> · {dia} · {franja}</span>
                  </span>
                  <form action={quitarReglaPrecio}>
                    <input type="hidden" name="complejoId" value={complejoId} />
                    <input type="hidden" name="canchaId" value={cancha.id} />
                    <input type="hidden" name="reglaId" value={r.id} />
                    <button type="submit" className="text-marca-marron hover:text-red-600">
                      Quitar
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-lg border border-marca-borde bg-marca-superficie p-4">
          <h3 className="mb-3 text-sm font-semibold">Agregar regla de precio</h3>
          <PrecioForm accion={agregarReglaPrecio} complejoId={complejoId} canchaId={cancha.id} />
        </div>
      </section>
    </main>
  );
}
