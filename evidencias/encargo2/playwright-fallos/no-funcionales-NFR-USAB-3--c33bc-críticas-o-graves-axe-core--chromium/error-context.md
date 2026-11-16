# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: no-funcionales.spec.js >> NFR-USAB / 3.1.1 Accesibilidad y usabilidad >> CP-53 /login sin violaciones WCAG 2.1 AA críticas o graves (axe-core)
- Location: tests/no-funcionales.spec.js:12:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "color-contrast",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e6]:
      - img "Logo" [ref=e8]
      - heading "Iniciar Sesión" [level=2] [ref=e9]
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: Nombre de usuario
          - textbox "Nombre de usuario" [ref=e13]
        - generic [ref=e14]:
          - generic [ref=e15]: Contraseña
          - textbox "Contraseña" [ref=e16]
        - button "Entrar" [ref=e17] [cursor=pointer]
        - paragraph [ref=e18]:
          - text: ¿No tienes cuenta?
          - link "Regístrate" [ref=e19] [cursor=pointer]:
            - /url: /registro
    - button "Guía inicial" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1   | /**
  2   |  * Pruebas no funcionales con Playwright
  3   |  * Casos: CP-51 (rendimiento de carga), CP-53/CP-54/CP-55 (usabilidad y accesibilidad),
  4   |  *        CP-58 (compatibilidad navegadores, @compat), CP-59 (responsivo)
  5   |  */
  6   | const { test, expect } = require("@playwright/test");
  7   | const AxeBuilder = require("@axe-core/playwright").default;
  8   | const { ctx, evidencia, loginUI } = require("./utils");
  9   | 
  10  | test.describe("NFR-USAB / 3.1.1 Accesibilidad y usabilidad", () => {
  11  |   for (const ruta of ["/login", "/registro"]) {
  12  |     test(`CP-53 ${ruta} sin violaciones WCAG 2.1 AA críticas o graves (axe-core)`, async ({ page }) => {
  13  |       await page.goto(ruta);
  14  |       await page.waitForLoadState("networkidle");
  15  |       const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  16  |       const graves = r.violations.filter((v) => ["critical", "serious"].includes(v.impact));
  17  |       console.log(`CP-53 ${ruta}:`, JSON.stringify(r.violations.map((v) => ({ id: v.id, impact: v.impact, nodos: v.nodes.length }))));
  18  |       await evidencia(page, `CP-53${ruta.replace("/", "-")}`);
> 19  |       expect(graves.map((v) => v.id)).toEqual([]);
      |                                       ^ Error: expect(received).toEqual(expected) // deep equality
  20  |     });
  21  |   }
  22  | 
  23  |   test("CP-53b pantallas autenticadas (inicio y clientes) sin violaciones WCAG críticas/graves", async ({ page }) => {
  24  |     const c = ctx();
  25  |     await loginUI(page, c.admin, c.password);
  26  |     const resultados = {};
  27  |     for (const ruta of ["/home", "/clientes"]) {
  28  |       await page.goto(ruta);
  29  |       await page.waitForLoadState("networkidle");
  30  |       const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  31  |       resultados[ruta] = r.violations.filter((v) => ["critical", "serious"].includes(v.impact)).map((v) => v.id);
  32  |     }
  33  |     console.log("CP-53b:", JSON.stringify(resultados));
  34  |     expect(Object.values(resultados).flat()).toEqual([]);
  35  |   });
  36  | 
  37  |   test("CP-53c tipografía mínima de 12px en textos visibles", async ({ page }) => {
  38  |     await page.goto("/login");
  39  |     const pequenos = await page.evaluate(() =>
  40  |       [...document.querySelectorAll("body *")]
  41  |         .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  42  |         .filter((el) => el.offsetParent !== null && parseFloat(getComputedStyle(el).fontSize) < 12)
  43  |         .map((el) => `${el.tagName}:${el.textContent.trim().slice(0, 30)}`)
  44  |     );
  45  |     expect(pequenos).toEqual([]);
  46  |   });
  47  | 
  48  |   test("CP-54 el login puede completarse solo con teclado (Tab / Enter)", async ({ page }) => {
  49  |     const c = ctx();
  50  |     await page.goto("/login");
  51  |     await page.getByTestId("input-nombre-usuario").focus();
  52  |     await page.keyboard.type(c.admin);
  53  |     await page.keyboard.press("Tab");
  54  |     await expect(page.getByTestId("input-password")).toBeFocused();
  55  |     await page.keyboard.type(c.password);
  56  |     await page.keyboard.press("Enter");
  57  |     await page.waitForURL(/\/home/, { timeout: 30_000 });
  58  |     await evidencia(page, "CP-54-login-teclado");
  59  |   });
  60  | 
  61  |   test("CP-55 mensajes de error amigables ante credenciales inválidas", async ({ page }) => {
  62  |     await page.goto("/login");
  63  |     await page.getByTestId("input-nombre-usuario").fill("usuario_inexistente");
  64  |     await page.getByTestId("input-password").fill("ClaveIncorrecta#1");
  65  |     await page.getByTestId("button-login").click();
  66  |     const toast = page.getByText(/credenciales inválidas/i).first();
  67  |     await expect(toast).toBeVisible({ timeout: 20_000 });
  68  |     await evidencia(page, "CP-55-error-amigable");
  69  |     await expect(page.locator("body")).not.toContainText(/stack|exception|syntax|sql/i);
  70  |   });
  71  | });
  72  | 
  73  | test.describe("NFR-PERF-2 Tiempo de carga", () => {
  74  |   test("CP-51 la página principal (dashboard) carga en < 2 s con red móvil promedio (4G)", async ({ page, browserName }) => {
  75  |     test.skip(browserName !== "chromium", "Emulación de red vía CDP solo en Chromium");
  76  |     const c = ctx();
  77  |     await loginUI(page, c.admin, c.password);
  78  |     const cdp = await page.context().newCDPSession(page);
  79  |     await cdp.send("Network.enable");
  80  |     await cdp.send("Network.emulateNetworkConditions", {
  81  |       offline: false, latency: 70, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (4 * 1024 * 1024) / 8,
  82  |     });
  83  |     const t0 = Date.now();
  84  |     await page.goto("/home");
  85  |     const resp = page.waitForResponse((r) => r.url().includes("/metricas") && r.status() === 200, { timeout: 30_000 });
  86  |     await resp;
  87  |     const ms = Date.now() - t0;
  88  |     console.log(`CP-51 dashboard listo en ${ms} ms`);
  89  |     await evidencia(page, "CP-51-dashboard-cargado");
  90  |     expect(ms).toBeLessThan(2000);
  91  |   });
  92  | });
  93  | 
  94  | test.describe("NFR-COMPAT Compatibilidad", () => {
  95  |   test("CP-58 @compat la pantalla de login se renderiza y autentica en el navegador", async ({ page, browserName }) => {
  96  |     const c = ctx();
  97  |     await page.goto("/login");
  98  |     await expect(page.getByTestId("button-login")).toBeVisible();
  99  |     await loginUI(page, c.admin, c.password);
  100 |     await evidencia(page, `CP-58-${browserName}`);
  101 |   });
  102 | 
  103 |   for (const vp of [{ n: "movil", width: 375, height: 667 }, { n: "tablet", width: 768, height: 1024 }]) {
  104 |     test(`CP-59 diseño responsivo en ${vp.n} ${vp.width}x${vp.height} sin desborde horizontal`, async ({ page }) => {
  105 |       const c = ctx();
  106 |       await page.setViewportSize({ width: vp.width, height: vp.height });
  107 |       await page.goto("/login");
  108 |       await page.waitForLoadState("networkidle");
  109 |       await evidencia(page, `CP-59-login-${vp.n}`);
  110 |       const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  111 |       const anchoForm = await page.getByTestId("button-login").evaluate((b) => b.getBoundingClientRect().width);
  112 |       await loginUI(page, c.admin, c.password);
  113 |       await page.goto("/clientes");
  114 |       await page.waitForLoadState("networkidle");
  115 |       await evidencia(page, `CP-59-clientes-${vp.n}`);
  116 |       const appOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  117 |       expect(loginOverflow).toBeLessThanOrEqual(0);
  118 |       expect(appOverflow).toBeLessThanOrEqual(0);
  119 |       expect(anchoForm).toBeGreaterThanOrEqual(Math.min(280, vp.width * 0.7)); // formulario usable en pantalla chica
```