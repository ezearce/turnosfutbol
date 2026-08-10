import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Protege todo el panel: sin sesión válida, redirige al login.
// El login vive fuera de este route group, así que no queda protegido.
export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  return children;
}
