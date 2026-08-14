import { defineConfig, devices } from "@playwright/test";

// Config de Playwright para los E2E del flujo crítico (sitio público).
// Requisitos para correr: Postgres local levantado y base sembrada
//   npm run db:seed
// Luego: npm run test:e2e  (levanta `npm run dev` solo si no hay uno corriendo).

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
