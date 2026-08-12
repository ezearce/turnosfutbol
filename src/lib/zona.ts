// Manejo de zona horaria. El negocio opera en hora local argentina; las reservas
// se guardan en UTC (timestamptz). Argentina hoy no tiene horario de verano, pero
// calculamos el offset real con Intl para no hardcodear -3 y ser a prueba de futuro.

export const ZONA_ARG = "America/Argentina/Buenos_Aires";

/** Offset de la zona respecto de UTC, en minutos, para un instante dado (Arg: -180). */
export function offsetZonaMinutos(instante: Date, zona = ZONA_ARG): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(instante).map((x) => [x.type, x.value]),
  );
  // Hora local "leída" como si fuera UTC, menos el instante real = offset.
  let hora = Number(p.hour);
  if (hora === 24) hora = 0; // algunos runtimes devuelven "24" a medianoche
  const comoUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    hora,
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((comoUtc - instante.getTime()) / 60000);
}

/** Fecha 'YYYY-MM-DD' + minutos locales desde medianoche → instante UTC (Date). */
export function localAInstante(fechaISO: string, minutosLocal: number, zona = ZONA_ARG): Date {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const aprox = new Date(
    Date.UTC(y, m - 1, d, Math.floor(minutosLocal / 60), minutosLocal % 60),
  );
  const off = offsetZonaMinutos(aprox, zona);
  return new Date(aprox.getTime() - off * 60000);
}

/** Día de la semana (0=Domingo … 6=Sábado) de una fecha 'YYYY-MM-DD'. */
export function diaSemana(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Fecha de hoy 'YYYY-MM-DD' en hora local argentina. */
export function hoyISO(zona = ZONA_ARG): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

/** Instante UTC → "HH:MM" en hora local argentina (para mostrar reservas). */
export function horaLocalHHMM(instante: Date, zona = ZONA_ARG): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}

/** Valida el formato 'YYYY-MM-DD'. */
export function esFechaISOValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}
