import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatearPrecio } from "@/lib/formato";

const TIPO_LABEL: Record<string, string> = {
  F5: "Fútbol 5",
  F7: "Fútbol 7",
  F11: "Fútbol 11",
};

export default async function PerfilComplejoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const complejo = await prisma.complejo.findFirst({
    where: { slug, activo: true },
    include: {
      canchas: {
        where: { activa: true },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          tipo: true,
          superficie: true,
          techada: true,
          precioBase: true,
          fotos: { orderBy: { posicion: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });
  if (!complejo) notFound();

  const wa = complejo.whatsapp?.replace(/\D/g, "");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link
        href="/canchas"
        className="text-sm text-suave transition-colors hover:text-primario"
      >
        ← Volver al listado
      </Link>

      {/* Encabezado */}
      <div className="mt-4 rounded-2xl border border-borde bg-superficie p-6 shadow-[var(--tf-sombra)]">
        <h1 className="text-3xl font-bold tracking-tight">{complejo.nombre}</h1>
        <p className="mt-1 text-suave">
          📍{" "}
          {[complejo.direccion, complejo.ciudad].filter(Boolean).join(", ") ||
            "Ubicación no especificada"}
        </p>
        {complejo.descripcion ? (
          <p className="mt-3 max-w-2xl text-texto/90">{complejo.descripcion}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {complejo.telefono ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-suave">
              📞 {complejo.telefono}
            </span>
          ) : null}
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primario-suave px-3 py-1.5 font-medium text-primario transition-colors hover:bg-primario-suave/70"
            >
              💬 WhatsApp
            </a>
          ) : null}
          {complejo.email ? (
            <a
              href={`mailto:${complejo.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-suave transition-colors hover:text-primario"
            >
              ✉️ {complejo.email}
            </a>
          ) : null}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight">Canchas</h2>

        {complejo.canchas.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-borde p-8 text-center text-suave">
            Este complejo todavía no tiene canchas disponibles.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {complejo.canchas.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-borde bg-superficie shadow-[var(--tf-sombra)]"
              >
                {c.fotos[0] ? (
                  <div className="relative aspect-video w-full bg-superficie-2">
                    <Image
                      src={c.fotos[0].url}
                      alt={c.nombre}
                      fill
                      sizes="(max-width: 640px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{c.nombre}</h3>
                  <span className="rounded-full bg-primario-suave px-2.5 py-0.5 text-xs font-semibold text-primario">
                    {TIPO_LABEL[c.tipo] ?? c.tipo}
                  </span>
                </div>
                <p className="text-sm text-suave">
                  {[c.superficie, c.techada ? "Techada" : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p className="text-sm">
                  {c.precioBase != null ? (
                    <>
                      Desde{" "}
                      <span className="font-semibold">{formatearPrecio(c.precioBase)}</span>
                    </>
                  ) : (
                    <span className="text-suave">Consultar precio</span>
                  )}
                </p>
                <Link
                  href={`/cancha/${complejo.slug}/reservar?canchaId=${c.id}`}
                  className="mt-2 rounded-xl bg-primario px-4 py-2.5 text-center text-sm font-semibold text-primario-contraste transition-colors hover:bg-primario-fuerte"
                >
                  Ver disponibilidad
                </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
