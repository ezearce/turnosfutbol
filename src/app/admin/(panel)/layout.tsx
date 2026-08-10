import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

// Protege todo el panel: sin sesión válida, redirige al login.
// El login vive fuera de este route group, así que no queda protegido.
export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  const esAdminGeneral = session.user.rol === "ADMIN_GENERAL";

  return (
    <div className="flex min-h-screen flex-col bg-marca-crema text-marca-texto">
      <header className="border-b border-marca-borde bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-base font-bold text-marca-verde"
            >
              <span aria-hidden>⚽</span> TurnosFutbol
            </Link>
            <Link
              href="/admin"
              className="text-marca-marron transition-colors hover:text-marca-verde"
            >
              Panel
            </Link>
            {esAdminGeneral ? (
              <Link
                href="/admin/plataforma/complejos"
                className="text-marca-marron transition-colors hover:text-marca-verde"
              >
                Complejos
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-marca-marron sm:inline">
              {session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-marca-borde px-3 py-1.5 font-medium text-marca-texto transition-colors hover:bg-marca-crema"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
