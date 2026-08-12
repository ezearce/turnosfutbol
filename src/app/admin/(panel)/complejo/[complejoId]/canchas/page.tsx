import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/formato";
import { alternarActivaCancha } from "./acciones";

const TIPO_LABEL: Record<string, string> = { F5: "Fútbol 5", F7: "Fútbol 7", F11: "Fútbol 11" };

export default async function CanchasPage({
  params,
}: {
  params: Promise<{ complejoId: string }>;
}) {
  const { complejoId } = await params;
  const canchas = await prisma.cancha.findMany({
    where: { complejoId },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Canchas</h1>
          <p className="text-sm text-marca-marron">
            {canchas.length} cancha{canchas.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/complejo/${complejoId}/calendario`}
            className="rounded-md border border-marca-borde px-4 py-2 text-sm font-medium text-marca-texto transition-colors hover:bg-marca-crema"
          >
            Calendario
          </Link>
          <Link
            href={`/admin/complejo/${complejoId}/agenda`}
            className="rounded-md border border-marca-borde px-4 py-2 text-sm font-medium text-marca-texto transition-colors hover:bg-marca-crema"
          >
            Agenda
          </Link>
          <Link
            href={`/admin/complejo/${complejoId}/canchas/nueva`}
            className="rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
          >
            Nueva cancha
          </Link>
        </div>
      </div>

      {canchas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-marca-borde bg-white p-8 text-center text-sm text-marca-marron">
          Todavía no hay canchas. Creá la primera.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-marca-borde bg-white">
          <table className="w-full text-sm">
            <thead className="bg-marca-crema text-left text-marca-marron">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Precio base</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-marca-borde">
              {canchas.map((c) => (
                <tr key={c.id} className="hover:bg-marca-crema/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nombre}</div>
                    {c.techada ? (
                      <div className="text-xs text-marca-marron/70">Techada</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-marca-marron">
                    {TIPO_LABEL[c.tipo] ?? c.tipo}
                  </td>
                  <td className="px-4 py-3 text-marca-marron">
                    {c.precioBase != null ? formatearPrecio(c.precioBase) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.activa
                          ? "rounded-full bg-marca-verde-claro px-2 py-0.5 text-xs font-medium text-marca-verde-oscuro"
                          : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
                      }
                    >
                      {c.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/complejo/${complejoId}/canchas/${c.id}`}
                        className="font-medium text-marca-verde hover:text-marca-verde-oscuro"
                      >
                        Configurar
                      </Link>
                      <form action={alternarActivaCancha}>
                        <input type="hidden" name="complejoId" value={complejoId} />
                        <input type="hidden" name="canchaId" value={c.id} />
                        <button
                          type="submit"
                          className="text-marca-marron hover:text-marca-marron-oscuro"
                        >
                          {c.activa ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
