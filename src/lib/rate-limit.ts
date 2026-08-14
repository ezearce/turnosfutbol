// Rate limiting simple en memoria (ventana fija). Suficiente para local y para un
// primer deploy chico; en Vercel el límite es POR INSTANCIA (cada lambda tiene su
// propio Map), así que para producción seria conviene migrar a un store compartido
// (ej. Upstash Redis) manteniendo esta misma interfaz `limitar()`.

import { headers } from "next/headers";

type Registro = { conteo: number; reinicioEn: number };

const almacen = new Map<string, Registro>();

// Limpieza perezosa: cada tanto barremos las entradas vencidas para no crecer sin
// límite en procesos de larga vida.
let ultimaLimpieza = Date.now();
function limpiarVencidos(ahora: number): void {
  if (ahora - ultimaLimpieza < 60_000) return;
  ultimaLimpieza = ahora;
  for (const [clave, r] of almacen) {
    if (r.reinicioEn <= ahora) almacen.delete(clave);
  }
}

export type ResultadoLimite = {
  ok: boolean;
  restante: number;
  reinicioEn: number; // epoch ms
};

/**
 * Registra un intento para `clave` y dice si está dentro del límite `max` por
 * `ventanaMs`. Cuenta el intento actual (devuelve ok=false cuando se excede).
 */
export function limitar(clave: string, max: number, ventanaMs: number): ResultadoLimite {
  const ahora = Date.now();
  limpiarVencidos(ahora);

  const r = almacen.get(clave);
  if (!r || r.reinicioEn <= ahora) {
    almacen.set(clave, { conteo: 1, reinicioEn: ahora + ventanaMs });
    return { ok: true, restante: max - 1, reinicioEn: ahora + ventanaMs };
  }
  if (r.conteo >= max) {
    return { ok: false, restante: 0, reinicioEn: r.reinicioEn };
  }
  r.conteo += 1;
  return { ok: true, restante: max - r.conteo, reinicioEn: r.reinicioEn };
}

/** IP del cliente a partir de los headers (detrás de proxy/Vercel). */
export async function ipCliente(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "desconocida";
  return h.get("x-real-ip") ?? "desconocida";
}
