// Configuración Playwright — pruebas E2E, accesibilidad, rendimiento y compatibilidad de Atlas
const { defineConfig, devices } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3350";

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: require.resolve("./global-setup.js"),
  reporter: [
    ["list"],
    ["html", { outputFolder: process.env.PW_HTML || "playwright-report", open: "never" }],
    ["json", { outputFile: process.env.PW_JSON || "playwright-report/results.json" }],
    ["junit", { outputFile: process.env.PW_JUNIT || "playwright-report/junit.xml" }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: /@compat/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, grep: /@compat/ },
  ],
});
