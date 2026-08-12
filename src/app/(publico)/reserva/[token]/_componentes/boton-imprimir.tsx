"use client";

/** Dispara el diálogo de impresión del navegador (permite "Guardar como PDF"). */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-xl border border-borde px-4 py-2 text-sm font-medium transition-colors hover:bg-superficie-2"
    >
      🖨️ Descargar / Imprimir
    </button>
  );
}
