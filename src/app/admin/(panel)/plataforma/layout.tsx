import type { ReactNode } from "react";
import { requerirAdminGeneral } from "@/lib/autorizacion";

// Toda la sección /admin/plataforma es exclusiva del ADMIN_GENERAL.
export default async function PlataformaLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requerirAdminGeneral();
  return children;
}
