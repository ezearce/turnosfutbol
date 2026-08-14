import { test, expect } from "@playwright/test";

// Datos del seed (npm run db:seed).
const SLUG_DEMO = "complejo-los-pibes";
const NOMBRE_DEMO = "Complejo Los Pibes";

test("la home lista complejos y permite ir al buscador", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Complejos disponibles" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver todos/i })).toBeVisible();
});

test("buscar el complejo demo y ver su perfil con canchas", async ({ page }) => {
  await page.goto("/canchas?q=Pibes");
  const enlace = page.getByRole("link", { name: NOMBRE_DEMO }).first();
  await expect(enlace).toBeVisible();
  await enlace.click();

  await expect(page).toHaveURL(new RegExp(`/cancha/${SLUG_DEMO}$`));
  await expect(page.getByRole("heading", { name: NOMBRE_DEMO })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Canchas" })).toBeVisible();
  // El seed crea al menos una cancha con botón de disponibilidad.
  await expect(
    page.getByRole("link", { name: /Ver disponibilidad/i }).first(),
  ).toBeVisible();
});
