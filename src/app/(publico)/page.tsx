import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/formato";

const TIPO_LABEL: Record<string, string> = { F5: "F5", F7: "F7", F11: "F11" };

export default async function HomePage() {
  const complejos = await prisma.complejo.findMany({
    where: { activo: true, canchas: { some: { activa: true } } },
    orderBy: { creadoEn: "desc" },
    take: 6,
    select: {
      id: true,
      slug: true,
      nombre: true,
      ciudad: true,
      descripcion: true,
      canchas: {
        where: { activa: true },
        select: { tipo: true, precioBase: true },
      },
    },
  });

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-borde">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primario-suave via-fondo to-fondo"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primario-borde bg-primario-suave px-3 py-1 text-xs font-semibold text-primario">
            ⚽ Reservá en segundos
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Tu próxima cancha, a un{" "}
            <span className="text-primario">clic de distancia</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-suave">
            Encontrá complejos cerca tuyo, mirá la disponibilidad en tiempo real
            y asegurá tu turno online. Sin llamados, sin vueltas.
          </p>

          <form
            action="/canchas"
            method="get"
            className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-borde bg-superficie p-2 shadow-[var(--tf-sombra)] sm:flex-row"
          >
            <input
              type="text"
              name="q"
              placeholder="Buscá por complejo o ciudad…"
              className="flex-1 rounded-xl bg-transparent px-4 py-3 text-texto outline-none placeholder:text-suave"
            />
            <button
              type="submit"
              className="rounded-xl bg-primario px-6 py-3 font-semibold text-primario-contraste transition-colors hover:bg-primario-fuerte"
            >
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Complejos destacados */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Complejos disponibles</h2>
            <p className="mt-1 text-sm text-suave">Elegí dónde jugar hoy.</p>
          </div>
          <Link
            href="/canchas"
            className="text-sm font-semibold text-primario hover:text-primario-fuerte"
          >
            Ver todos →
          </Link>
        </div>

        {complejos.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-borde p-10 text-center text-suave">
            Todavía no hay complejos publicados. Volvé pronto.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {complejos.map((c) => {
              const tipos = [...new Set(c.canchas.map((x) => TIPO_LABEL[x.tipo] ?? x.tipo))];
              const desde = c.canchas
                .map((x) => (x.precioBase != null ? Number(x.precioBase) : null))
                .filter((n): n is number => n != null);
              const precioDesde = desde.length ? Math.min(...desde) : null;
              return (
                <Link
                  key={c.id}
                  href={`/cancha/${c.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-5 shadow-[var(--tf-sombra)] transition-all hover:-translate-y-0.5 hover:border-primario-borde"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{c.nombre}</h3>
                    <div className="flex shrink-0 gap-1">
                      {tipos.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-primario-suave px-1.5 py-0.5 text-[11px] font-semibold text-primario"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {c.ciudad ? (
                    <p className="text-sm text-suave">📍 {c.ciudad}</p>
                  ) : null}
                  {c.descripcion ? (
                    <p className="line-clamp-2 text-sm text-suave">{c.descripcion}</p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm text-suave">
                      {precioDesde != null ? (
                        <>
                          Desde{" "}
                          <span className="font-semibold text-texto">
                            {formatearPrecio(precioDesde)}
                          </span>
                        </>
                      ) : (
                        "Consultar precio"
                      )}
                    </span>
                    <span className="text-sm font-semibold text-primario group-hover:text-primario-fuerte">
                      Reservar →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
