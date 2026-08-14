import { test, expect } from "@playwright/test";

// Flujo crítico: reservar un turno desde el sitio público y luego cancelarlo con
// el token del comprobante. Cancelar libera el slot (la disponibilidad excluye las
// CANCELADA), así que el test es auto-limpiante e idempotente entre corridas.

const SLUG_DEMO = "complejo-los-pibes";

/** Fecha 'YYYY-MM-DD' a N días de hoy (siempre futura, con turnos libres). */
function fechaFutura(dias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

test("reservar un turno y cancelarlo por token", async ({ page }) => {
  const fecha = fechaFutura(10);
  await page.goto(`/cancha/${SLUG_DEMO}/reservar?fecha=${fecha}`);

  // Paso 1: elegir el primer turno libre (los libres son enlaces con `inicio=`).
  const turnoLibre = page.locator('a[href*="inicio="]').first();
  await expect(turnoLibre).toBeVisible();
  await turnoLibre.click();

  // Paso 2: completar datos. Sin email para no disparar envíos reales.
  await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Test E2E");
  await page.getByLabel("Teléfono").fill("2211234567");

  await Promise.all([
    page.waitForURL(/\/reserva\/[0-9a-f-]{36}/i),
    page.getByRole("button", { name: /Confirmar reserva/i }).click(),
  ]);

  await expect(
    page.getByRole("heading", { name: /Reserva confirmada/i }),
  ).toBeVisible();

  // Cancelar desde el comprobante (acepta el window.confirm).
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Cancelar turno/i }).click();

  await expect(
    page.getByRole("heading", { name: /Reserva cancelada/i }),
  ).toBeVisible();
});
