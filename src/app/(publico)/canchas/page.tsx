import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/formato";
import type { Prisma } from "@/generated/prisma/client";

const TIPO_LABEL: Record<string, string> = { F5: "F5", F7: "F7", F11: "F11" };

export default async function ListadoCanchasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ciudad?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const ciudad = (sp.ciudad ?? "").trim();

  const where: Prisma.ComplejoWhereInput = {
    activo: true,
    canchas: { some: { activa: true } },
  };
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { ciudad: { contains: q, mode: "insensitive" } },
      { descripcion: { contains: q, mode: "insensitive" } },
    ];
  }
  if (ciudad) where.ciudad = ciudad;

  const [complejos, ciudadesRaw] = await Promise.all([
    prisma.complejo.findMany({
      where,
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        slug: true,
        nombre: true,
        ciudad: true,
        direccion: true,
        descripcion: true,
        canchas: {
          where: { activa: true },
          select: { tipo: true, precioBase: true },
        },
      },
    }),
    prisma.complejo.findMany({
      where: { activo: true, ciudad: { not: null } },
      distinct: ["ciudad"],
      orderBy: { ciudad: "asc" },
      select: { ciudad: true },
    }),
  ]);

  const ciudades = ciudadesRaw
    .map((c) => c.ciudad)
    .filter((c): c is string => Boolean(c));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Buscar canchas</h1>
      <p className="mt-1 text-sm text-suave">
        Filtrá por complejo o ciudad y reservá tu turno.
      </p>

      {/* Filtros */}
      <form
        method="get"
        className="mt-5 flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-[var(--tf-sombra)] sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Búsqueda
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Complejo, ciudad…"
            className="rounded-xl border border-borde bg-superficie px-3 py-2 text-texto outline-none transition-colors focus:border-primario focus:ring-2 focus:ring-primario/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Ciudad
          <select
            name="ciudad"
            defaultValue={ciudad}
            className="rounded-xl border border-borde bg-superficie px-3 py-2 text-texto outline-none transition-colors focus:border-primario focus:ring-2 focus:ring-primario/20"
          >
            <option value="">Todas</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-primario px-5 py-2 font-semibold text-primario-contraste transition-colors hover:bg-primario-fuerte"
        >
          Filtrar
        </button>
      </form>

      <p className="mt-6 text-sm text-suave">
        {complejos.length} resultado{complejos.length === 1 ? "" : "s"}
        {q || ciudad ? " · " : ""}
        {q ? `“${q}”` : ""}
        {ciudad ? ` en ${ciudad}` : ""}
      </p>

      {/* Área de resultados: min-height fija para que la página no “salte”. */}
      <div className="mt-4 min-h-[45vh]">
        {complejos.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-borde px-6 py-20 text-center">
            <div>
              <div className="text-4xl" aria-hidden>
                🔍
              </div>
              <p className="mt-3 font-medium">No encontramos complejos con esos filtros.</p>
              <p className="mt-1 text-sm text-suave">Probá con otra ciudad o quitá los filtros.</p>
              <Link
                href="/canchas"
                className="mt-4 inline-block rounded-xl border border-borde px-4 py-2 text-sm font-medium transition-colors hover:bg-superficie-2"
              >
                Ver todos
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    <h2 className="font-semibold leading-tight">{c.nombre}</h2>
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
                  <p className="text-sm text-suave">
                    📍 {[c.ciudad, c.direccion].filter(Boolean).join(" · ") || "—"}
                  </p>
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
                        "Consultar"
                      )}
                    </span>
                    <span className="text-sm font-semibold text-primario group-hover:text-primario-fuerte">
                      Ver y reservar →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
