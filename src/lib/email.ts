// Envío de emails transaccionales con EmailJS (API server-side). Se eligió EmailJS
// porque no requiere verificar un dominio (envía por el servicio de correo
// conectado en la cuenta, ej. Gmail) y tiene tier gratuito. Degrada con gracia:
// si faltan las variables de entorno, no envía (loguea) y NO rompe la creación de
// la reserva. Cuando el volumen lo justifique, se puede migrar a un proveedor
// server-side con dominio (ej. Resend) sin tocar el resto del código.
//
// Variables de entorno (en .env, no commiteado):
//   EMAILJS_SERVICE_ID    → ID del servicio de correo en EmailJS
//   EMAILJS_TEMPLATE_ID   → ID del template del comprobante
//   EMAILJS_PUBLIC_KEY    → public key (user_id) de la cuenta
//   EMAILJS_PRIVATE_KEY   → private key (accessToken) — requiere habilitar
//                           "Allow EmailJS API for non-browser applications"
//   NEXT_PUBLIC_APP_URL   → base para armar el link, ej. https://tusitio.com
//
// El template en el panel de EmailJS debe tener "To Email" = {{to_email}} y usar
// las variables: {{cliente}}, {{complejo}}, {{cancha}}, {{fecha}}, {{horario}},
// {{precio}}, {{link}}.

import { fechaLargaAR } from "@/lib/zona";
import { minutosAHHMM } from "@/lib/horas";
import { formatearPrecio } from "@/lib/formato";

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

type DatosComprobante = {
  email: string;
  clienteNombre: string | null;
  complejoNombre: string;
  canchaNombre: string;
  fechaISO: string;
  inicioMin: number;
  finMin: number;
  precio: number;
  token: string;
};

/** Envía el comprobante + link para ver/cancelar la reserva. No lanza: registra
 *  el error y sigue (el envío no debe voltear la creación de la reserva). */
export async function enviarComprobanteReserva(d: DatosComprobante): Promise<void> {
  const url = `${baseUrl()}/reserva/${d.token}`;

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    const faltan = [
      !serviceId && "EMAILJS_SERVICE_ID",
      !templateId && "EMAILJS_TEMPLATE_ID",
      !publicKey && "EMAILJS_PUBLIC_KEY",
      !privateKey && "EMAILJS_PRIVATE_KEY",
    ]
      .filter(Boolean)
      .join(", ");
    console.info(
      `[email] EmailJS sin configurar (faltan: ${faltan}); se omite el envío a ${d.email}. Link: ${url}`,
    );
    return;
  }

  const template_params = {
    to_email: d.email,
    cliente: d.clienteNombre ?? "",
    complejo: d.complejoNombre,
    cancha: d.canchaNombre,
    fecha: fechaLargaAR(d.fechaISO),
    horario: `${minutosAHHMM(d.inicioMin)}–${minutosAHHMM(d.finMin)}`,
    precio: formatearPrecio(d.precio),
    link: url,
  };

  try {
    const res = await fetch(EMAILJS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params,
      }),
    });
    if (!res.ok) {
      const detalle = await res.text();
      console.error(`[email] EmailJS respondió ${res.status}: ${detalle}`);
    } else {
      console.info(`[email] Comprobante enviado a ${d.email}.`);
    }
  } catch (e) {
    console.error("[email] Falló el envío del comprobante:", e);
  }
}
