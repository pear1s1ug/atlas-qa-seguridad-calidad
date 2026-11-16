/**
 * Pruebas no funcionales con Playwright
 * Casos: CP-51 (rendimiento de carga), CP-53/CP-54/CP-55 (usabilidad y accesibilidad),
 *        CP-58 (compatibilidad navegadores, @compat), CP-59 (responsivo)
 */
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { ctx, evidencia, loginUI } = require("./utils");

test.describe("NFR-USAB / 3.1.1 Accesibilidad y usabilidad", () => {
  for (const ruta of ["/login", "/registro"]) {
    test(`CP-53 ${ruta} sin violaciones WCAG 2.1 AA críticas o graves (axe-core)`, async ({ page }) => {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const graves = r.violations.filter((v) => ["critical", "serious"].includes(v.impact));
      console.log(`CP-53 ${ruta}:`, JSON.stringify(r.violations.map((v) => ({ id: v.id, impact: v.impact, nodos: v.nodes.length }))));
      await evidencia(page, `CP-53${ruta.replace("/", "-")}`);
      expect(graves.map((v) => v.id)).toEqual([]);
    });
  }

  test("CP-53b pantallas autenticadas (inicio y clientes) sin violaciones WCAG críticas/graves", async ({ page }) => {
    const c = ctx();
    await loginUI(page, c.admin, c.password);
    const resultados = {};
    for (const ruta of ["/home", "/clientes"]) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      resultados[ruta] = r.violations.filter((v) => ["critical", "serious"].includes(v.impact)).map((v) => v.id);
    }
    console.log("CP-53b:", JSON.stringify(resultados));
    expect(Object.values(resultados).flat()).toEqual([]);
  });

  test("CP-53c tipografía mínima de 12px en textos visibles", async ({ page }) => {
    await page.goto("/login");
    const pequenos = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 12)
        .map((el) => `${el.tagName}:${el.textContent.trim().slice(0, 30)}`)
    );
    expect(pequenos).toEqual([]);
  });

  test("CP-54 el login puede completarse solo con teclado (Tab / Enter)", async ({ page }) => {
    const c = ctx();
    await page.goto("/login");
    await page.getByTestId("input-nombre-usuario").focus();
    await page.keyboard.type(c.admin);
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("input-password")).toBeFocused();
    await page.keyboard.type(c.password);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/home/, { timeout: 30_000 });
    await evidencia(page, "CP-54-login-teclado");
  });

  test("CP-55 mensajes de error amigables ante credenciales inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("input-nombre-usuario").fill("usuario_inexistente");
    await page.getByTestId("input-password").fill("ClaveIncorrecta#1");
    await page.getByTestId("button-login").click();
    const toast = page.getByText(/credenciales inválidas/i).first();
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await evidencia(page, "CP-55-error-amigable");
    await expect(page.locator("body")).not.toContainText(/stack|exception|syntax|sql/i);
  });
});

test.describe("NFR-PERF-2 Tiempo de carga", () => {
  test("CP-51 la página principal (dashboard) carga en < 2 s con red móvil promedio (4G)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Emulación de red vía CDP solo en Chromium");
    const c = ctx();
    await loginUI(page, c.admin, c.password);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 70, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (4 * 1024 * 1024) / 8,
    });
    const t0 = Date.now();
    await page.goto("/home");
    const resp = page.waitForResponse((r) => r.url().includes("/metricas") && r.status() === 200, { timeout: 30_000 });
    await resp;
    const ms = Date.now() - t0;
    console.log(`CP-51 dashboard listo en ${ms} ms`);
    await evidencia(page, "CP-51-dashboard-cargado");
    expect(ms).toBeLessThan(2000);
  });
});

test.describe("NFR-COMPAT Compatibilidad", () => {
  test("CP-58 @compat la pantalla de login se renderiza y autentica en el navegador", async ({ page, browserName }) => {
    const c = ctx();
    await page.goto("/login");
    await expect(page.getByTestId("button-login")).toBeVisible();
    await loginUI(page, c.admin, c.password);
    await evidencia(page, `CP-58-${browserName}`);
  });

  for (const vp of [{ n: "movil", width: 375, height: 667 }, { n: "tablet", width: 768, height: 1024 }]) {
    test(`CP-59 diseño responsivo en ${vp.n} ${vp.width}x${vp.height} sin desborde horizontal`, async ({ page }) => {
      const c = ctx();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await evidencia(page, `CP-59-login-${vp.n}`);
      const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const anchoForm = await page.getByTestId("button-login").evaluate((b) => b.getBoundingClientRect().width);
      await loginUI(page, c.admin, c.password);
      await page.goto("/clientes");
      await page.waitForLoadState("networkidle");
      await evidencia(page, `CP-59-clientes-${vp.n}`);
      const appOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(loginOverflow).toBeLessThanOrEqual(0);
      expect(appOverflow).toBeLessThanOrEqual(0);
      expect(anchoForm).toBeGreaterThanOrEqual(Math.min(280, vp.width * 0.7)); // formulario usable en pantalla chica
    });
  }
});
