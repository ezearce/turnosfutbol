import Link from "next/link";
import { CanchaForm } from "../_componentes/cancha-form";
import { crearCancha } from "../acciones";

export default async function NuevaCanchaPage({
  params,
}: {
  params: Promise<{ complejoId: string }>;
}) {
  const { complejoId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/admin/complejo/${complejoId}/canchas`}
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          ← Volver a canchas
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nueva cancha</h1>
      </div>
      <CanchaForm
        accion={crearCancha}
        complejoId={complejoId}
        textoBoton="Crear cancha"
      />
    </main>
  );
}
