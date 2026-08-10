import Link from "next/link";
import { ComplejoForm } from "../_componentes/complejo-form";
import { crearComplejo } from "../acciones";

export default function NuevoComplejoPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href="/admin/plataforma/complejos"
          className="text-sm text-marca-marron hover:text-marca-verde"
        >
          ← Volver a complejos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nuevo complejo</h1>
      </div>
      <ComplejoForm accion={crearComplejo} textoBoton="Crear complejo" />
    </main>
  );
}
