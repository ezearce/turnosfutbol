"use client";

import { useSyncExternalStore } from "react";

// Lee el tema del DOM (clase `dark` en <html>, que fija el script anti-flash) y
// se re-suscribe a sus cambios, así todos los toggles quedan sincronizados.
function subscribe(alCambiar: () => void) {
  const obs = new MutationObserver(alCambiar);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => obs.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

/** Botón para alternar tema claro/oscuro; persiste la preferencia en localStorage. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function alternar() {
    const proximo = !dark;
    document.documentElement.classList.toggle("dark", proximo);
    try {
      localStorage.setItem("tema", proximo ? "dark" : "light");
    } catch {
      // localStorage no disponible: no persistimos, no rompemos.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={dark ? "Modo claro" : "Modo oscuro"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-borde bg-superficie text-texto transition-colors hover:bg-superficie-2 ${className}`}
    >
      <span aria-hidden className="text-base leading-none">
        {dark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
