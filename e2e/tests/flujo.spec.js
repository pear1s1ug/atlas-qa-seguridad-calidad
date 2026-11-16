/**
 * Pruebas globales / E2E — flujo completo del sistema y control de acceso en la UI
 * Casos: CP-63, CP-64, CP-56, CP-41
 */
const path = require("path");
const { test, expect } = require("@playwright/test");
const { ctx, evidencia, loginUI } = require("./utils");

test.describe("Flujos E2E", () => {
  test("CP-63 flujo completo: login → dashboard → crear cliente → crear contrato con PDF → logout", async ({ page }) => {
    const c = ctx();
    const nombre = `Cliente E2E ${Date.now().toString(36)}`;
    await loginUI(page, c.admin, c.password);
    await expect(page.getByText(/bienvenid|inicio|dashboard/i).first()).toBeVisible();
    await evidencia(page, "CP-63-01-dashboard");

    await page.getByTestId("link-nav-clientes").click();
    await page.getByRole("tab", { name: /crear cliente/i }).click();
    const tb = (name) => page.getByRole("textbox", { name, exact: true });
    await tb("RUT").fill("76.086.428-5");
    await tb("Nombre completo").fill(nombre);
    await tb("Correo").fill(`e2e_${Date.now()}@cliente-qa.cl`);
    await tb("Teléfono").fill("+56912345678");
    await evidencia(page, "CP-63-02-form-cliente", { fullPage: true });
    await page.getByRole("button", { name: /crear cliente|guardar/i }).last().click();
    await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 30_000 });
    await evidencia(page, "CP-63-03-cliente-creado");

    await page.getByTestId("link-nav-contratos").click();
    await page.getByRole("tab", { name: /crear contrato/i }).click();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: nombre }).click();
    await page.getByRole("textbox", { name: "Título" }).fill(`Contrato ${nombre}`);
    await page.getByLabel(/Fecha inicio/).fill("2026-11-01");
    await page.getByLabel(/Fecha fin/).fill("2027-11-01");
    await page.getByRole("textbox", { name: "Descripción" }).fill("Contrato creado en prueba E2E");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "..", "fixtures", "contrato.pdf"));
    await evidencia(page, "CP-63-04-form-contrato", { fullPage: true });
    await page.getByRole("button", { name: /crear contrato|guardar/i }).last().click();
    await expect(page.getByText(`Contrato ${nombre}`).first()).toBeVisible({ timeout: 30_000 });
    await evidencia(page, "CP-63-05-contrato-creado");

    await page.getByTestId("button-layout-logout").click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/login/);
    await evidencia(page, "CP-63-06-logout");
  });

  test("CP-64 un usuario Editor no ve ni accede a funciones de administración en la UI", async ({ page }) => {
    const c = ctx();
    await loginUI(page, c.editor, c.password);
    await expect(page.getByTestId("link-nav-usuarios")).toHaveCount(0);
    await page.getByTestId("link-nav-clientes").click();
    await expect(page.getByRole("tab", { name: /crear cliente/i })).toHaveCount(0);
    await page.goto("/usuarios");
    await expect(page.getByText(/no autorizado/i)).toBeVisible();
    await evidencia(page, "CP-64-editor-sin-acceso");
  });

  test("CP-56 NFR-USAB-4 desde un cliente se accede a la lista de sus contratos", async ({ page }) => {
    const c = ctx();
    await loginUI(page, c.admin, c.password);
    await page.getByTestId("link-nav-clientes").click();
    await expect(page.getByText(c.cliente.nombre).first()).toBeVisible({ timeout: 30_000 });
    const verContratos = page.getByTestId(`button-cliente-contratos-${c.cliente.id}`);
    await expect(verContratos, "Debe existir una acción 'Ver contratos' por cliente").toBeVisible({ timeout: 10_000 });
    await verContratos.click();
    await expect(page).toHaveURL(new RegExp(`/contratos\\?cliente=${c.cliente.id}`));
    await expect(page.getByText(c.contrato.titulo).first()).toBeVisible({ timeout: 30_000 });
    await evidencia(page, "CP-56-contratos-del-cliente");
  });

  test("CP-41 XSS almacenado: un nombre con HTML malicioso se muestra escapado", async ({ page }) => {
    const c = ctx();
    test.skip(!!c.xss.error, "El backend rechazó el payload XSS en la validación de entrada (mitigación en servidor)");
    await loginUI(page, c.admin, c.password);
    await page.getByTestId("link-nav-clientes").click();
    await expect(page.getByText(`XSS ${c.sufijo}`).first()).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await evidencia(page, "CP-41-xss-escapado");
  });
});
