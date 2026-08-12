"use client";

type AccionCancelar = (formData: FormData) => Promise<void>;

/** Form de cancelación con confirmación previa (evita cancelar por error). */
export function FormCancelar({
  accion,
  complejoId,
  canchaId,
  fecha,
  reservaId,
  descripcion,
}: {
  accion: AccionCancelar;
  complejoId: string;
  canchaId: string;
  fecha: string;
  reservaId: string;
  descripcion: string;
}) {
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!window.confirm(`¿Cancelar ${descripcion}? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="complejoId" value={complejoId} />
      <input type="hidden" name="canchaId" value={canchaId} />
      <input type="hidden" name="fecha" value={fecha} />
      <input type="hidden" name="reservaId" value={reservaId} />
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-marca-marron transition-colors hover:bg-peligro-suave hover:text-peligro"
      >
        Cancelar
      </button>
    </form>
  );
}
