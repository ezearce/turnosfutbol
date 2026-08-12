"use client";

type AccionCancelar = (formData: FormData) => Promise<void>;

/** Botón para que el cliente cancele su reserva desde el comprobante, con
 *  confirmación previa. */
export function BotonCancelar({
  accion,
  token,
}: {
  accion: AccionCancelar;
  token: string;
}) {
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!window.confirm("¿Seguro que querés cancelar tu turno? No se puede deshacer.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        className="rounded-xl border border-peligro/40 px-4 py-2 text-sm font-medium text-peligro transition-colors hover:bg-peligro-suave"
      >
        Cancelar turno
      </button>
    </form>
  );
}
