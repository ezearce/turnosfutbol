import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ComplejoForm } from "../_componentes/complejo-form";
import { AdminForm } from "../_componentes/admin-form";
import { editarComplejo, crearAdminComplejo, quitarAdminComplejo } from "../acciones";

export default async function EditarComplejoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const complejo = await prisma.complejo.findUnique({
    where: { id },
    include: {
      miembros: {
        include: { usuario: true },
        orderBy: { usuario: { nombre: "asc" } },
      },
    },
  });

  if (!complejo) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10">
      <div>
        <Link
          href="/admin/plataforma/complejos"
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          ← Volver a complejos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{complejo.nombre}</h1>
        <p className="text-sm text-marca-marron/70">/{complejo.slug}</p>
        <Link
          href={`/admin/complejo/${complejo.id}/canchas`}
          className="mt-3 inline-block rounded-md bg-marca-verde px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-marca-verde-oscuro"
        >
          Gestionar canchas
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Datos del complejo</h2>
        <ComplejoForm
          accion={editarComplejo}
          idComplejo={complejo.id}
          textoBoton="Guardar cambios"
          valores={{
            nombre: complejo.nombre,
            slug: complejo.slug,
            ciudad: complejo.ciudad ?? undefined,
            direccion: complejo.direccion ?? undefined,
            telefono: complejo.telefono ?? undefined,
            whatsapp: complejo.whatsapp ?? undefined,
            email: complejo.email ?? undefined,
            descripcion: complejo.descripcion ?? undefined,
          }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Administradores</h2>

        {complejo.miembros.length === 0 ? (
          <p className="text-sm text-marca-marron">
            Este complejo todavía no tiene administradores.
          </p>
        ) : (
          <ul className="divide-y divide-marca-borde rounded-lg border border-marca-borde bg-white">
            {complejo.miembros.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{m.usuario.nombre}</div>
                  <div className="text-marca-marron">{m.usuario.email}</div>
                </div>
                <form action={quitarAdminComplejo}>
                  <input type="hidden" name="membresiaId" value={m.id} />
                  <input type="hidden" name="complejoId" value={complejo.id} />
                  <button
                    type="submit"
                    className="text-marca-marron hover:text-red-600"
                  >
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-marca-borde bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Nuevo administrador</h3>
          <AdminForm accion={crearAdminComplejo} complejoId={complejo.id} />
        </div>
      </section>
    </main>
  );
}
