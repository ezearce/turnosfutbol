const formateadorPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Formatea un monto en pesos argentinos. Acepta number, string o Prisma.Decimal. */
export function formatearPrecio(valor: number | string | { toString(): string }): string {
  return formateadorPrecio.format(Number(valor));
}
