import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requerirAccesoComplejo } from "@/lib/autorizacion";

export default async function ComplejoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ complejoId: string }>;
}) {
  const { complejoId } = await params;
  const session = await requerirAccesoComplejo(complejoId);

  const complejo = await prisma.complejo.findUnique({
    where: { id: complejoId },
    select: { nombre: true, slug: true },
  });
  if (!complejo) notFound();

  const esAdminGeneral = session.user.rol === "ADMIN_GENERAL";

  return (
    <>
      <div className="border-b border-marca-borde bg-marca-superficie/60">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-6 py-2 text-sm">
          {esAdminGeneral ? (
            <Link
              href="/admin/plataforma/complejos"
              className="text-marca-marron hover:text-marca-verde"
            >
              Complejos
            </Link>
          ) : (
            <Link href="/admin" className="text-marca-marron hover:text-marca-verde">
              Panel
            </Link>
          )}
          <span className="text-marca-marron/50">/</span>
          <span className="font-medium">{complejo.nombre}</span>
        </div>
      </div>
      {children}
    </>
  );
}
