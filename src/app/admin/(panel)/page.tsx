import Link from "next/link";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const usuario = session!.user;
  const esAdminGeneral = usuario.rol === "ADMIN_GENERAL";

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
        <div className="rounded-lg border border-marca-borde bg-white p-4">
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
      ) : (
        <p className="text-sm text-marca-marron">
          La gestión de tu complejo (canchas, horarios, reservas) llega en las
          próximas fases.
        </p>
      )}
    </main>
  );
}
