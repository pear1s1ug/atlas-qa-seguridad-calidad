# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: no-funcionales.spec.js >> NFR-USAB / 3.1.1 Accesibilidad y usabilidad >> CP-53b pantallas autenticadas (inicio y clientes) sin violaciones WCAG críticas/graves
- Location: tests/no-funcionales.spec.js:23:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   "color-contrast",
+   "list",
+   "button-name",
+   "list",
+ ]
```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - region "Notifications alt+T"
  - generic [ref=f2e3]:
    - generic [ref=f2e6]:
      - img "Logo" [ref=f2e8]
      - list [ref=f2e9]:
        - link "Inicio" [ref=f2e10] [cursor=pointer]:
          - /url: /home
        - link "Clientes" [ref=f2e16] [cursor=pointer]:
          - /url: /clientes
        - link "Contratos" [ref=f2e22] [cursor=pointer]:
          - /url: /contratos
        - link "Auditoría" [ref=f2e28] [cursor=pointer]:
          - /url: /auditoria
        - link "Usuarios" [ref=f2e34] [cursor=pointer]:
          - /url: /usuarios
      - generic [ref=f2e40]:
        - generic [ref=f2e41]:
          - generic [ref=f2e42]:
            - generic [ref=f2e43]: E
            - generic [ref=f2e44]:
              - paragraph [ref=f2e45]: e2e_admin_mwim0blo
              - generic [ref=f2e46]: administrador
          - generic [ref=f2e47]:
            - button "Editar cuenta" [ref=f2e48] [cursor=pointer]
            - button "Cerrar Sesión" [ref=f2e52] [cursor=pointer]
        - generic [ref=f2e56]: Versión 1.0.0
    - main [ref=f2e58]:
      - generic [ref=f2e60]:
        - generic [ref=f2e64]:
          - heading "Gestión de Clientes" [level=5] [ref=f2e65]
          - generic [ref=f2e66]: Administra la información de tus clientes. Puedes crear, editar y eliminar clientes según tus permisos.
        - generic [ref=f2e67]:
          - tablist [ref=f2e71]:
            - tab "Listar Clientes" [selected] [ref=f2e72] [cursor=pointer]
            - tab "Crear Cliente" [ref=f2e75] [cursor=pointer]
          - generic [ref=f2e79]:
            - generic [ref=f2e80]:
              - heading "Clientes registrados" [level=6] [ref=f2e81]
              - text: El siguiente listado muestra todos los clientes registrados en el sistema. Puedes editar y eliminar clientes según tus permisos.
            - generic [ref=f2e82]:
              - table [ref=f2e84]:
                - rowgroup [ref=f2e85]:
                  - row [ref=f2e86]:
                    - columnheader "Nombre Ordenar por Nombre ascendente Columna de acciones" [ref=f2e87]:
                      - generic [ref=f2e88]:
                        - generic [ref=f2e89] [cursor=pointer]:
                          - generic [ref=f2e90]: Nombre
                          - generic "Ordenar por Nombre ascendente" [ref=f2e91]:
                            - button "Ordenar por Nombre ascendente" [ref=f2e92]
                            - generic: "0"
                        - button "Columna de acciones" [ref=f2e96] [cursor=pointer]
                    - columnheader "Correo Ordenar por Correo ascendente Columna de acciones" [ref=f2e99]:
                      - generic [ref=f2e100]:
                        - generic [ref=f2e101] [cursor=pointer]:
                          - generic [ref=f2e102]: Correo
                          - generic "Ordenar por Correo ascendente" [ref=f2e103]:
                            - button "Ordenar por Correo ascendente" [ref=f2e104]
                            - generic: "0"
                        - button "Columna de acciones" [ref=f2e108] [cursor=pointer]
                    - columnheader "Teléfono Ordenar por Teléfono ascendente Columna de acciones" [ref=f2e111]:
                      - generic [ref=f2e112]:
                        - generic [ref=f2e113] [cursor=pointer]:
                          - generic [ref=f2e114]: Teléfono
                          - generic "Ordenar por Teléfono ascendente" [ref=f2e115]:
                            - button "Ordenar por Teléfono ascendente" [ref=f2e116]
                            - generic: "0"
                        - button "Columna de acciones" [ref=f2e120] [cursor=pointer]
                    - columnheader "Dirección Ordenar por Dirección ascendente Columna de acciones" [ref=f2e123]:
                      - generic [ref=f2e124]:
                        - generic [ref=f2e125] [cursor=pointer]:
                          - generic [ref=f2e126]: Dirección
                          - generic "Ordenar por Dirección ascendente" [ref=f2e127]:
                            - button "Ordenar por Dirección ascendente" [ref=f2e128]
                            - generic: "0"
                        - button "Columna de acciones" [ref=f2e132] [cursor=pointer]
                    - columnheader "Acciones" [ref=f2e135]
                - rowgroup [ref=f2e139]:
                  - row [ref=f2e140]:
                    - cell "C Cliente E2E mwim0f7m" [ref=f2e141]:
                      - generic [ref=f2e142]:
                        - generic [ref=f2e143]: C
                        - paragraph [ref=f2e144]: Cliente E2E mwim0f7m
                    - cell [ref=f2e145]:
                      - paragraph [ref=f2e149]: e2e_1794794017089@cliente-qa.cl
                    - cell [ref=f2e150]:
                      - paragraph [ref=f2e154]: "+56912345678"
                    - cell [ref=f2e155]:
                      - generic [ref=f2e156]:
                        - paragraph
                    - cell [ref=f2e159]:
                      - generic [ref=f2e160]:
                        - button [ref=f2e161] [cursor=pointer]
                        - button [ref=f2e164] [cursor=pointer]
                  - row [ref=f2e167]:
                    - cell "< <img src=x onerror=\"window.__xss=1\">XSS mwim0blo" [ref=f2e168]:
                      - generic [ref=f2e169]:
                        - generic [ref=f2e170]: <
                        - paragraph [ref=f2e171]: <img src=x onerror="window.__xss=1">XSS mwim0blo
                    - cell [ref=f2e172]:
                      - paragraph [ref=f2e176]: xss_mwim0blo@cliente-qa.cl
                    - cell [ref=f2e177]:
                      - paragraph [ref=f2e181]: "+56955556666"
                    - cell [ref=f2e182]:
                      - paragraph [ref=f2e186]: Calle 2
                    - cell [ref=f2e187]:
                      - generic [ref=f2e188]:
                        - button [ref=f2e189] [cursor=pointer]
                        - button [ref=f2e192] [cursor=pointer]
                  - row [ref=f2e195]:
                    - cell "C Cliente Semilla mwim0blo" [ref=f2e196]:
                      - generic [ref=f2e197]:
                        - generic [ref=f2e198]: C
                        - paragraph [ref=f2e199]: Cliente Semilla mwim0blo
                    - cell [ref=f2e200]:
                      - paragraph [ref=f2e204]: cli_mwim0blo@cliente-qa.cl
                    - cell [ref=f2e205]:
                      - paragraph [ref=f2e209]: "+56933334444"
                    - cell [ref=f2e210]:
                      - paragraph [ref=f2e214]: Calle 1
                    - cell [ref=f2e215]:
                      - generic [ref=f2e216]:
                        - button [ref=f2e217] [cursor=pointer]
                        - button [ref=f2e220] [cursor=pointer]
              - generic [ref=f2e226]:
                - generic [ref=f2e227]:
                  - generic [ref=f2e228]: Filas por página
                  - generic [ref=f2e229]:
                    - combobox "Filas por página" [ref=f2e230] [cursor=pointer]: "10"
                    - textbox [aria-hidden]: "10"
                - generic [ref=f2e231]: 1-3 de 3
                - generic [ref=f2e232]:
                  - generic "Regresar a la pagina anterior" [ref=f2e233]:
                    - button "Regresar a la pagina anterior" [disabled]
                  - generic "Ir a la página siguiente" [ref=f2e234]:
                    - button "Ir a la página siguiente" [disabled]
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
> 34  |     expect(Object.values(resultados).flat()).toEqual([]);
      |                                              ^ Error: expect(received).toEqual(expected) // deep equality
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
  120 |     });
  121 |   }
  122 | });
  123 | 
```