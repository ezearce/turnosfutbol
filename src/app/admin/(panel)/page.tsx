import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const usuario = session!.user;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 text-sm">
        <p>
          Sesión iniciada como <strong>{usuario.name}</strong> ({usuario.email})
        </p>
        <p className="mt-1 text-neutral-500">
          Rol: <code>{usuario.rol}</code> · Complejos:{" "}
          <code>{usuario.complejoIds.length}</code>
        </p>
      </div>

      <p className="text-sm text-neutral-400">
        Fase 1 (datos + auth) — dashboard completo en la Fase 6.
      </p>
    </main>
  );
}
