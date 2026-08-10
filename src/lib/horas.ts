export const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** 0=Domingo … 6=Sábado */
export function nombreDia(dia: number): string {
  return DIAS[dia] ?? "?";
}

/** minutos desde medianoche → "HH:MM" (ej: 1080 → "18:00", 1440 → "24:00") */
export function minutosAHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
