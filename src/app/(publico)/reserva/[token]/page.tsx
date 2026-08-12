import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fechaLargaAR, horaLocalHHMM } from "@/lib/zona";
import { formatearPrecio } from "@/lib/formato";
import { BotonImprimir } from "./_componentes/boton-imprimir";

// La fecha 'YYYY-MM-DD' local del instante de inicio (para el texto largo).
function fechaISODeInstante(instante: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

export default async function ConfirmacionReservaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const reserva = await prisma.reserva.findUnique({
    where: { token },
    include: {
      cancha: { select: { nombre: true } },
      complejo: {
        select: { nombre: true, slug: true, direccion: true, telefono: true },
      },
    },
  });
  if (!reserva) notFound();

  const cancelada = reserva.estado === "CANCELADA";
  const fechaISO = fechaISODeInstante(reserva.iniciaEn);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
      <div className="overflow-hidden rounded-2xl border border-borde bg-superficie shadow-[var(--tf-sombra)]">
        {/* Banda de estado */}
        <div
          className={`px-6 py-5 ${
            cancelada
              ? "bg-superficie-2 text-suave"
              : "bg-primario text-primario-contraste"
          }`}
        >
          <div className="text-3xl" aria-hidden>
            {cancelada ? "✕" : "✓"}
          </div>
          <h1 className="mt-1 text-2xl font-bold">
            {cancelada ? "Reserva cancelada" : "¡Reserva confirmada!"}
          </h1>
          <p className="mt-1 text-sm opacity-90">
            {cancelada
              ? "Esta reserva fue cancelada. Si es un error, contactá al complejo."
              : "Te esperamos. Guardá este comprobante; el pago es en el complejo."}
          </p>
        </div>

        {/* Detalle */}
        <dl className="flex flex-col gap-3 p-6 text-sm">
          <Dato etiqueta="Complejo" valor={reserva.complejo.nombre} />
          <Dato etiqueta="Cancha" valor={reserva.cancha.nombre} />
          <Dato etiqueta="Día" valor={fechaLargaAR(fechaISO)} />
          <Dato
            etiqueta="Horario"
            valor={`${horaLocalHHMM(reserva.iniciaEn)}–${horaLocalHHMM(reserva.terminaEn)}`}
          />
          <Dato etiqueta="Precio" valor={formatearPrecio(reserva.precio)} />
          {reserva.complejo.direccion ? (
            <Dato etiqueta="Dirección" valor={reserva.complejo.direccion} />
          ) : null}
          {reserva.complejo.telefono ? (
            <Dato etiqueta="Contacto" valor={reserva.complejo.telefono} />
          ) : null}
          <Dato
            etiqueta="A nombre de"
            valor={
              [reserva.clienteNombre, reserva.clienteApellido]
                .filter(Boolean)
                .join(" ") || "—"
            }
          />
          <div className="mt-1 flex justify-between gap-4 text-xs text-suave">
            <dt>Código</dt>
            <dd className="font-mono">{reserva.token.slice(0, 8).toUpperCase()}</dd>
          </div>
        </dl>
      </div>

      <div className="no-print mt-6 flex items-center justify-between gap-3">
        <Link
          href={`/cancha/${reserva.complejo.slug}`}
          className="text-sm font-semibold text-primario hover:text-primario-fuerte"
        >
          ← Volver al complejo
        </Link>
        {!cancelada ? <BotonImprimir /> : null}
      </div>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-borde pb-2 last:border-0">
      <dt className="text-suave">{etiqueta}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}
