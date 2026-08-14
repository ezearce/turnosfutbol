// Subida/borrado de imágenes en Cloudinary vía su API REST firmada (sin SDK, para
// no sumar dependencias). Degrada con un error claro si faltan las credenciales.
//
// Variables de entorno (en .env, no commiteado):
//   CLOUDINARY_CLOUD_NAME  → nombre del cloud
//   CLOUDINARY_API_KEY     → api key (se acepta también API_KEY por compatibilidad)
//   CLOUDINARY_API_SECRET  → api secret (se acepta también API_SECRET)
//
// La firma es sha1(params ordenados + api_secret), según la doc de Cloudinary.

import { createHash } from "node:crypto";

const CARPETA = "turnosfutbol/canchas";

type Config = { cloudName: string; apiKey: string; apiSecret: string };

/** Lee la config o devuelve null si falta algo (permite degradar con gracia). */
function leerConfig(): Config | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY ?? process.env.API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? process.env.API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function cloudinaryConfigurado(): boolean {
  return leerConfig() !== null;
}

/** Firma sha1 de los params (excepto file/api_key) + api_secret. */
function firmar(params: Record<string, string>, apiSecret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + apiSecret).digest("hex");
}

export type ImagenSubida = { url: string; publicId: string };

/**
 * Sube un archivo (File del FormData) a Cloudinary con upload firmado.
 * Lanza si no hay config o si la API responde error (el caller lo captura).
 */
export async function subirImagen(file: File): Promise<ImagenSubida> {
  const cfg = leerConfig();
  if (!cfg) throw new Error("Cloudinary no está configurado.");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const aFirmar = { folder: CARPETA, timestamp };
  const signature = firmar(aFirmar, cfg.apiSecret);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", cfg.apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", CARPETA);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Cloudinary respondió ${res.status}: ${detalle}`);
  }
  const data = (await res.json()) as { secure_url: string; public_id: string };
  return { url: data.secure_url, publicId: data.public_id };
}

/**
 * Deriva el public_id de una URL de Cloudinary (para poder borrarla). Formato:
 * https://res.cloudinary.com/<cloud>/image/upload/v123/<carpeta>/<nombre>.<ext>
 * → "<carpeta>/<nombre>". Devuelve null si la URL no tiene ese formato.
 */
export function publicIdDesdeUrl(url: string): string | null {
  const marca = "/upload/";
  const i = url.indexOf(marca);
  if (i === -1) return null;
  let resto = url.slice(i + marca.length); // "v123/carpeta/nombre.ext"
  resto = resto.replace(/^v\d+\//, ""); // quita el prefijo de versión
  return resto.replace(/\.[^/.]+$/, ""); // quita la extensión
}

/** Borra una imagen de Cloudinary por su public_id. No lanza (best-effort). */
export async function eliminarImagen(publicId: string): Promise<void> {
  const cfg = leerConfig();
  if (!cfg) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = firmar({ public_id: publicId, timestamp }, cfg.apiSecret);

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", cfg.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  try {
    await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`,
      { method: "POST", body: form },
    );
  } catch (e) {
    console.error("[cloudinary] No se pudo borrar la imagen:", e);
  }
}
