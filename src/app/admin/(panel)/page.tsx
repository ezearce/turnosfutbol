import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resumenComplejo } from "@/lib/panel";
import { formatearPrecio } from "@/lib/formato";

export default async function DashboardPage() {
  const session = await auth();
  const usuario = session!.user;
  const esAdminGeneral = usuario.rol === "ADMIN_GENERAL";

  const complejosBase = esAdminGeneral
    ? []
    : await prisma.complejo.findMany({
        where: { id: { in: usuario.complejoIds } },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, ciudad: true },
      });

  const misComplejos = await Promise.all(
    complejosBase.map(async (c) => ({
      ...c,
      resumen: await resumenComplejo(c.id),
    })),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Hola, {usuario.name}</h1>
        <p className="mt-1 text-sm text-marca-marron">
          Rol: <code>{usuario.rol}</code>
          {!esAdminGeneral ? (
            <>
              {" "}
              · Complejos: <code>{usuario.complejoIds.length}</code>
            </>
          ) : null}
        </p>
      </div>

      {esAdminGeneral ? (
        <div className="rounded-lg border border-marca-borde bg-marca-superficie p-4">
          <h2 className="text-sm font-semibold">Administración de la plataforma</h2>
          <p className="mt-1 text-sm text-marca-marron">
            Gestioná los complejos y sus administradores.
          </p>
          <Link
            href="/admin/plataforma/complejos"
            className="mt-3 inline-block rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
          >
            Ver complejos
          </Link>
        </div>
      ) : misComplejos.length === 0 ? (
        <p className="text-sm text-marca-marron">
          Todavía no tenés complejos asignados. Contactá al administrador de la
          plataforma.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Mis complejos</h2>
          {misComplejos.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-4 rounded-lg border border-marca-borde bg-marca-superficie p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-sm text-marca-marron">{c.ciudad ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Link
                    href={`/admin/complejo/${c.id}/calendario`}
                    className="rounded-md bg-marca-verde px-3 py-1.5 font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
                  >
                    Calendario
                  </Link>
                  <Link
                    href={`/admin/complejo/${c.id}/agenda`}
                    className="rounded-md border border-marca-borde px-3 py-1.5 font-medium text-marca-texto transition-colors hover:bg-marca-crema"
                  >
                    Agenda
                  </Link>
                  <Link
                    href={`/admin/complejo/${c.id}/canchas`}
                    className="text-marca-marron transition-colors hover:text-marca-verde"
                  >
                    Canchas
                  </Link>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metrica etiqueta="Reservas hoy" valor={c.resumen.reservasHoy} />
                <Metrica
                  etiqueta="Ingreso hoy"
                  valor={formatearPrecio(c.resumen.ingresoHoy)}
                />
                <Metrica etiqueta="Bloqueos hoy" valor={c.resumen.bloqueosHoy} />
                <Metrica
                  etiqueta="Próx. 7 días"
                  valor={c.resumen.reservasProximos7}
                />
              </dl>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Metrica({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <div className="rounded-md bg-marca-crema px-3 py-2">
      <dt className="text-xs text-marca-marron">{etiqueta}</dt>
      <dd className="text-lg font-semibold">{valor}</dd>
    </div>
  );
}
