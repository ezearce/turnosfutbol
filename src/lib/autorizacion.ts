import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

/** Devuelve la sesión o redirige al login si no hay. */
export async function requerirSesion(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

/** Sólo ADMIN_GENERAL; el resto va al panel general. */
export async function requerirAdminGeneral(): Promise<Session> {
  const session = await requerirSesion();
  if (session.user.rol !== "ADMIN_GENERAL") redirect("/admin");
  return session;
}

/** True si la sesión puede operar sobre ese complejo (general o miembro). */
export function puedeAccederComplejo(session: Session, complejoId: string): boolean {
  return (
    session.user.rol === "ADMIN_GENERAL" ||
    session.user.complejoIds.includes(complejoId)
  );
}

/** Igual que la anterior pero corta con redirect si no tiene acceso. */
export async function requerirAccesoComplejo(complejoId: string): Promise<Session> {
  const session = await requerirSesion();
  if (!puedeAccederComplejo(session, complejoId)) redirect("/admin");
  return session;
}
