import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { alternarActivoComplejo } from "./acciones";

export default async function ComplejosPage() {
  const complejos = await prisma.complejo.findMany({
    orderBy: { creadoEn: "desc" },
    include: { _count: { select: { canchas: true, miembros: true } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Complejos</h1>
          <p className="text-sm text-marca-marron">
            {complejos.length} complejo{complejos.length === 1 ? "" : "s"} en la
            plataforma
          </p>
        </div>
        <Link
          href="/admin/plataforma/complejos/nuevo"
          className="rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
        >
          Nuevo complejo
        </Link>
      </div>

      {complejos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-marca-borde bg-white p-8 text-center text-sm text-marca-marron">
          Todavía no hay complejos. Creá el primero.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-marca-borde bg-white">
          <table className="w-full text-sm">
            <thead className="bg-marca-crema text-left text-marca-marron">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Ciudad</th>
                <th className="px-4 py-2 font-medium">Canchas</th>
                <th className="px-4 py-2 font-medium">Admins</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-marca-borde">
              {complejos.map((c) => (
                <tr key={c.id} className="hover:bg-marca-crema/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nombre}</div>
                    <div className="text-xs text-marca-marron/70">/{c.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-marca-marron">{c.ciudad ?? "—"}</td>
                  <td className="px-4 py-3 text-marca-marron">{c._count.canchas}</td>
                  <td className="px-4 py-3 text-marca-marron">{c._count.miembros}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.activo
                          ? "rounded-full bg-marca-verde-claro px-2 py-0.5 text-xs font-medium text-marca-verde-oscuro"
                          : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
                      }
                    >
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/plataforma/complejos/${c.id}`}
                        className="font-medium text-marca-verde hover:text-marca-verde-oscuro"
                      >
                        Editar
                      </Link>
                      <form action={alternarActivoComplejo}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="text-marca-marron hover:text-marca-marron-oscuro"
                        >
                          {c.activo ? "Desactivar" : "Activar"}
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
