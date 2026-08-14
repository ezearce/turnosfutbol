// Esquemas de validación (Zod v4) para las server actions. Se centralizan acá para
// reusarlos y porque en un archivo "use server" sólo se pueden exportar funciones
// async. Los esquemas parsean directamente `Object.fromEntries(formData)` (todos
// los campos llegan como string; los checkboxes como "on" o ausentes).
//
// Se usan sólo `.transform`/`.refine` con mensajes string (API estable entre
// versiones de Zod) para tener control total de los mensajes en español.

import { z } from "zod";
import { esFechaISOValida } from "@/lib/zona";

// ─────────────────────────── Helpers de campo ───────────────────────────

/** Texto requerido: recorta y exige al menos 1 caracter (tolera ausente). */
const req = (msg: string) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .refine((s) => s.length > 0, msg);

/** Texto opcional: "" o ausente → null. */
const opc = z
  .string()
  .optional()
  .transform((s) => {
    const t = (s ?? "").trim();
    return t === "" ? null : t;
  });

/** Email opcional: "" o ausente → null; si viene, debe ser válido. */
const emailOpc = z
  .string()
  .optional()
  .transform((s) => {
    const t = (s ?? "").trim();
    return t === "" ? null : t;
  })
  .refine((v) => v === null || z.email().safeParse(v).success, "El email no es válido.");

/** Entero requerido dentro de un rango (inclusive). */
const enteroEnRango = (min: number, max: number, msg: string) =>
  z
    .string()
    .optional()
    .transform((s) => Number((s ?? "").trim()))
    .refine((v) => Number.isInteger(v) && v >= min && v <= max, msg);

/** Número (no necesariamente entero) opcional: "" o ausente → null. */
const numeroOpc = (msg: string) =>
  z
    .string()
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t === "" ? null : Number(t);
    })
    .refine((v) => v === null || Number.isFinite(v), msg);

/** Entero opcional: "" o ausente → null. */
const enteroOpc = (msg: string) =>
  z
    .string()
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t === "" ? null : Number(t);
    })
    .refine((v) => v === null || Number.isInteger(v), msg);

/** Checkbox HTML: "on"/true → true; ausente → false. */
const checkbox = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((v) => v === "on" || v === true);

const fecha = z.string().refine(esFechaISOValida, "Fecha inválida.");

// ─────────────────────────── Utilidades ───────────────────────────

/** Primer mensaje de error de un ZodError (o uno genérico). */
export function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos ingresados.";
}

export type Parseo<T> = { ok: true; data: T } | { ok: false; error: string };

/** Valida `data` contra `schema`, devolviendo un resultado tipado y amable. */
export function parsear<S extends z.ZodType>(
  schema: S,
  data: unknown,
): Parseo<z.infer<S>> {
  const r = schema.safeParse(data);
  return r.success
    ? { ok: true, data: r.data }
    : { ok: false, error: primerError(r.error) };
}

// ─────────────────────────── Esquemas ───────────────────────────

const TIPOS_CANCHA = ["F5", "F7", "F11"];

/** Datos de una cancha (crear/editar). */
export const canchaSchema = z.object({
  nombre: req("El nombre es obligatorio."),
  tipo: z
    .string()
    .refine((s) => TIPOS_CANCHA.includes(s), "Elegí un tipo de cancha válido."),
  superficie: opc,
  techada: checkbox,
  precioBase: numeroOpc("Ingresá un precio válido.").refine(
    (v) => v === null || v >= 0,
    "El precio base no puede ser negativo.",
  ),
});

/** Horario de atención (las horas llegan enteras 0–24). */
export const horarioSchema = z
  .object({
    diaSemana: enteroEnRango(0, 6, "Elegí un día válido."),
    aperturaHora: enteroEnRango(0, 24, "Completá la hora de apertura y cierre."),
    cierreHora: enteroEnRango(0, 24, "Completá la hora de apertura y cierre."),
    minutosTurno: z
      .string()
      .optional()
      .transform((s) => Number((s ?? "").trim()))
      .refine((v) => Number.isInteger(v) && v > 0, "Elegí la duración del turno."),
  })
  .refine((d) => d.aperturaHora < d.cierreHora, {
    message: "La apertura debe ser anterior al cierre.",
    path: ["cierreHora"],
  });

/** Regla de precio (día y franja opcionales). */
export const reglaPrecioSchema = z
  .object({
    diaSemana: enteroOpc("Día inválido.").refine(
      (v) => v === null || (v >= 0 && v <= 6),
      "Día inválido.",
    ),
    desdeHora: enteroOpc("Franja inválida.").refine(
      (v) => v === null || (v >= 0 && v <= 24),
      "Franja inválida.",
    ),
    hastaHora: enteroOpc("Franja inválida.").refine(
      (v) => v === null || (v >= 0 && v <= 24),
      "Franja inválida.",
    ),
    precio: numeroOpc("Ingresá un precio válido.").refine(
      (v) => v !== null && v >= 0,
      "Ingresá un precio válido.",
    ),
  })
  .refine((d) => (d.desdeHora === null) === (d.hastaHora === null), {
    message: "Completá desde y hasta, o dejá ambos vacíos.",
    path: ["hastaHora"],
  })
  .refine(
    (d) => d.desdeHora === null || d.hastaHora === null || d.desdeHora < d.hastaHora,
    { message: "La franja: desde debe ser anterior a hasta.", path: ["hastaHora"] },
  );

/** Reserva desde el sitio público. */
export const reservaPublicaSchema = z
  .object({
    slug: req("La cancha no está disponible."),
    canchaId: req("La cancha no está disponible."),
    fecha,
    inicioMin: enteroEnRango(0, 1439, "Turno inválido."),
    finMin: enteroEnRango(1, 1440, "Turno inválido."),
    nombre: req("Ingresá tu nombre."),
    apellido: opc,
    telefono: req("Ingresá un teléfono de contacto.").refine(
      (s) => s.length >= 6,
      "Ingresá un teléfono de contacto.",
    ),
    email: emailOpc,
  })
  .refine((d) => d.finMin > d.inicioMin, {
    message: "Turno inválido.",
    path: ["finMin"],
  });

/** Reserva manual desde el panel admin. El turno viene como "inicioMin-finMin". */
export const reservaManualSchema = z.object({
  fecha,
  turno: z.string().refine((v) => {
    const [a, b] = v.split("-").map(Number);
    return Number.isFinite(a) && Number.isFinite(b) && b > a;
  }, "Elegí un turno."),
  clienteNombre: req("El nombre del cliente es obligatorio."),
  clienteApellido: opc,
  clienteTelefono: opc,
  clienteEmail: emailOpc,
});

/** Bloqueo desde el panel admin (desde/hasta en horas enteras). */
export const bloqueoSchema = z
  .object({
    fecha,
    desdeHora: enteroOpc("Completá desde y hasta.").refine(
      (v) => v !== null,
      "Completá desde y hasta.",
    ),
    hastaHora: enteroOpc("Completá desde y hasta.").refine(
      (v) => v !== null,
      "Completá desde y hasta.",
    ),
    motivo: opc,
  })
  .refine(
    (d) => d.desdeHora !== null && d.hastaHora !== null && d.hastaHora > d.desdeHora,
    { message: "El fin debe ser posterior al inicio.", path: ["hastaHora"] },
  );

/** Datos de un complejo (super-admin). */
export const complejoSchema = z.object({
  nombre: req("El nombre es obligatorio.").refine(
    (s) => s.length >= 2,
    "El nombre es obligatorio.",
  ),
  slug: opc,
  descripcion: opc,
  direccion: opc,
  ciudad: opc,
  telefono: opc,
  whatsapp: opc,
  email: emailOpc,
});

/** Alta de un admin de complejo. */
export const adminComplejoSchema = z.object({
  nombre: req("El nombre es obligatorio.").refine(
    (s) => s.length >= 2,
    "El nombre es obligatorio.",
  ),
  email: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim().toLowerCase())
    .refine((s) => z.email().safeParse(s).success, "El email no es válido."),
  password: z
    .string()
    .optional()
    .transform((s) => s ?? "")
    .refine((s) => s.length >= 8, "La contraseña debe tener al menos 8 caracteres."),
});
