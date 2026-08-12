import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Layout del sitio público. Usa los tokens de tema (claro/oscuro).
export default function PublicoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fondo text-texto">
      <header className="no-print sticky top-0 z-20 border-b border-borde bg-superficie/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg bg-primario text-primario-contraste"
            >
              ⚽
            </span>
            <span>
              Turnos<span className="text-primario">Futbol</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium sm:gap-4">
            <Link
              href="/canchas"
              className="rounded-lg px-3 py-2 text-suave transition-colors hover:bg-superficie-2 hover:text-texto"
            >
              Buscar canchas
            </Link>
            <Link
              href="/admin"
              className="hidden rounded-lg px-3 py-2 text-suave transition-colors hover:bg-superficie-2 hover:text-texto sm:block"
            >
              Soy dueño
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="no-print border-t border-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-suave sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} TurnosFutbol · Reservá tu cancha online.</span>
          <Link href="/admin" className="hover:text-texto">
            Acceso administradores
          </Link>
        </div>
      </footer>
    </div>
  );
}
