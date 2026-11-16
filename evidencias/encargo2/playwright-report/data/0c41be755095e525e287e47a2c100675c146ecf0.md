# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: no-funcionales.spec.js >> NFR-PERF-2 Tiempo de carga >> CP-51 la página principal (dashboard) carga en < 2 s con red móvil promedio (4G)
- Location: tests/no-funcionales.spec.js:74:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 2000
Received:   4168
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - region "Notifications alt+T"
  - generic [ref=f1e3]:
    - generic [ref=f1e6]:
      - img "Logo" [ref=f1e8]
      - list [ref=f1e9]:
        - link "Inicio" [ref=f1e10] [cursor=pointer]:
          - /url: /home
        - link "Clientes" [ref=f1e16] [cursor=pointer]:
          - /url: /clientes
        - link "Contratos" [ref=f1e22] [cursor=pointer]:
          - /url: /contratos
        - link "Auditoría" [ref=f1e28] [cursor=pointer]:
          - /url: /auditoria
        - link "Usuarios" [ref=f1e34] [cursor=pointer]:
          - /url: /usuarios
      - generic [ref=f1e40]:
        - generic [ref=f1e41]:
          - generic [ref=f1e42]:
            - generic [ref=f1e43]: E
            - generic [ref=f1e44]:
              - paragraph [ref=f1e45]: e2e_admin_mwim0blo
              - generic [ref=f1e46]: administrador
          - generic [ref=f1e47]:
            - button "Editar cuenta" [ref=f1e48] [cursor=pointer]
            - button "Cerrar Sesión" [ref=f1e52] [cursor=pointer]
        - generic [ref=f1e56]: Versión 1.0.0
    - main [ref=f1e58]:
      - generic [ref=f1e60]:
        - heading "Bienvenido, e2e_admin_mwim0blo" [level=4] [ref=f1e63]
        - generic [ref=f1e64]:
          - generic [ref=f1e68]:
            - heading "2" [level=4] [ref=f1e69]
            - paragraph [ref=f1e70]: Usuarios de la Empresa
          - generic [ref=f1e76]:
            - heading "3" [level=4] [ref=f1e77]
            - paragraph [ref=f1e78]: Clientes Creados
          - generic [ref=f1e84]:
            - heading "0" [level=4] [ref=f1e85]
            - paragraph [ref=f1e86]: Vencen en 15 días
          - generic [ref=f1e92]:
            - heading "0" [level=4] [ref=f1e93]
            - paragraph [ref=f1e94]: Vencen en 30 días
        - generic [ref=f1e97]:
          - generic [ref=f1e100]:
            - heading "Editar Empresa" [level=6] [ref=f1e104]
            - paragraph [ref=f1e105]: "Actualiza la información de tu empresa: nombre, dirección, teléfono y correo."
            - button "Editar Empresa" [ref=f1e106] [cursor=pointer]
          - generic [ref=f1e112]:
            - heading "Editar Usuario" [level=6] [ref=f1e116]
            - paragraph [ref=f1e117]: Cambia tu contraseña y actualiza tu información de usuario.
            - button "Editar Usuario" [ref=f1e118] [cursor=pointer]
        - generic [ref=f1e122]:
          - tablist [ref=f1e126]:
            - tab "Próximos a Vencer" [selected] [ref=f1e127] [cursor=pointer]
            - tab "Vencidos" [ref=f1e130] [cursor=pointer]
          - generic [ref=f1e143]:
            - heading "No hay contratos próximos a vencer" [level=6] [ref=f1e144]
            - separator [ref=f1e145]
            - paragraph [ref=f1e146]: Actualmente no existen contratos que estén próximos a vencer en los próximos días.
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
  19  |       expect(graves.map((v) => v.id)).toEqual([]);
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
> 90  |     expect(ms).toBeLessThan(2000);
      |                ^ Error: expect(received).toBeLessThan(expected)
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
  120 |     });
  121 |   }
  122 | });
  123 | 
```