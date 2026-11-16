# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo.spec.js >> Flujos E2E >> CP-64 un usuario Editor no ve ni accede a funciones de administración en la UI
- Location: tests/flujo.spec.js:50:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/no autorizado/i)
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/no autorizado/i) with timeout 15000ms
  - waiting for getByText(/no autorizado/i)

```

```yaml
- region "Notifications alt+T"
- img "Logo"
- list:
  - link "Inicio":
    - /url: /home
  - link "Clientes":
    - /url: /clientes
  - link "Contratos":
    - /url: /contratos
  - link "Auditoría":
    - /url: /auditoria
  - link "Usuarios":
    - /url: /usuarios
- text: E
- paragraph: e2e_editor_mwim0blo
- text: administrador
- button "Editar cuenta"
- button "Cerrar Sesión"
- text: Versión 1.0.0
- main:
  - heading "Gestión de Usuarios" [level=5]
  - text: Administra los usuarios del sistema. Puedes crear, editar y eliminar usuarios según tus permisos.
  - tablist:
    - tab "Listar Usuarios" [selected]
    - tab "Crear Usuario"
  - heading "Usuarios registrados en tu empresa" [level=6]
  - text: El siguiente listado muestra todos los usuarios registrados en tu empresa y quienes tienen acceso a los datos dependiendo de su rol.
  - table:
    - rowgroup:
      - row "Usuario Ordenar por Usuario ascendente Columna de acciones Correo Ordenar por Correo ascendente Columna de acciones Rol Ordenar por Rol descendente Columna de acciones Creación Ordenar por Creación ascendente Columna de acciones Acciones":
        - columnheader "Usuario Ordenar por Usuario ascendente Columna de acciones":
          - text: Usuario
          - button "Ordenar por Usuario ascendente"
          - text: "0"
          - button "Columna de acciones"
        - columnheader "Correo Ordenar por Correo ascendente Columna de acciones":
          - text: Correo
          - button "Ordenar por Correo ascendente"
          - text: "0"
          - button "Columna de acciones"
        - columnheader "Rol Ordenar por Rol descendente Columna de acciones":
          - text: Rol
          - button "Ordenar por Rol descendente"
          - text: "0"
          - button "Columna de acciones"
        - columnheader "Creación Ordenar por Creación ascendente Columna de acciones":
          - text: Creación
          - button "Ordenar por Creación ascendente"
          - text: "0"
          - button "Columna de acciones"
        - columnheader "Acciones"
    - rowgroup:
      - row "E e2e_editor_mwim0blo e2e_editor_mwim0blo@atlas-qa.cl editor 2026-11-16T01:53:26.684Z":
        - cell "E e2e_editor_mwim0blo":
          - text: E
          - paragraph: e2e_editor_mwim0blo
        - cell "e2e_editor_mwim0blo@atlas-qa.cl"
        - cell "editor"
        - cell "2026-11-16T01:53:26.684Z"
        - cell:
          - button
          - button
      - row "E e2e_admin_mwim0blo e2e_admin_mwim0blo@atlas-qa.cl administrador 2026-11-16T01:53:22.649Z":
        - cell "E e2e_admin_mwim0blo":
          - text: E
          - paragraph: e2e_admin_mwim0blo
        - cell "e2e_admin_mwim0blo@atlas-qa.cl"
        - cell "administrador"
        - cell "2026-11-16T01:53:22.649Z"
        - cell:
          - button
          - button
  - text: Filas por página
  - combobox "Filas por página": "10"
  - text: 1-2 de 2
  - button "Regresar a la pagina anterior" [disabled]
  - button "Ir a la página siguiente" [disabled]
```

# Test source

```ts
  1  | /**
  2  |  * Pruebas globales / E2E — flujo completo del sistema y control de acceso en la UI
  3  |  * Casos: CP-63, CP-64, CP-56, CP-41
  4  |  */
  5  | const path = require("path");
  6  | const { test, expect } = require("@playwright/test");
  7  | const { ctx, evidencia, loginUI } = require("./utils");
  8  | 
  9  | test.describe("Flujos E2E", () => {
  10 |   test("CP-63 flujo completo: login → dashboard → crear cliente → crear contrato con PDF → logout", async ({ page }) => {
  11 |     const c = ctx();
  12 |     const nombre = `Cliente E2E ${Date.now().toString(36)}`;
  13 |     await loginUI(page, c.admin, c.password);
  14 |     await expect(page.getByText(/bienvenid|inicio|dashboard/i).first()).toBeVisible();
  15 |     await evidencia(page, "CP-63-01-dashboard");
  16 | 
  17 |     await page.getByTestId("link-nav-clientes").click();
  18 |     await page.getByRole("tab", { name: /crear cliente/i }).click();
  19 |     const tb = (name) => page.getByRole("textbox", { name, exact: true });
  20 |     await tb("RUT").fill("76.086.428-5");
  21 |     await tb("Nombre completo").fill(nombre);
  22 |     await tb("Correo").fill(`e2e_${Date.now()}@cliente-qa.cl`);
  23 |     await tb("Teléfono").fill("+56912345678");
  24 |     await evidencia(page, "CP-63-02-form-cliente", { fullPage: true });
  25 |     await page.getByRole("button", { name: /crear cliente|guardar/i }).last().click();
  26 |     await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 30_000 });
  27 |     await evidencia(page, "CP-63-03-cliente-creado");
  28 | 
  29 |     await page.getByTestId("link-nav-contratos").click();
  30 |     await page.getByRole("tab", { name: /crear contrato/i }).click();
  31 |     await page.getByRole("combobox").first().click();
  32 |     await page.getByRole("option", { name: nombre }).click();
  33 |     await page.getByRole("textbox", { name: "Título" }).fill(`Contrato ${nombre}`);
  34 |     await page.getByLabel(/Fecha inicio/).fill("2026-11-01");
  35 |     await page.getByLabel(/Fecha fin/).fill("2027-11-01");
  36 |     await page.getByRole("textbox", { name: "Descripción" }).fill("Contrato creado en prueba E2E");
  37 |     await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "..", "fixtures", "contrato.pdf"));
  38 |     await evidencia(page, "CP-63-04-form-contrato", { fullPage: true });
  39 |     await page.getByRole("button", { name: /crear contrato|guardar/i }).last().click();
  40 |     await expect(page.getByText(`Contrato ${nombre}`).first()).toBeVisible({ timeout: 30_000 });
  41 |     await evidencia(page, "CP-63-05-contrato-creado");
  42 | 
  43 |     await page.getByTestId("button-layout-logout").click();
  44 |     await expect(page).toHaveURL(/\/login/);
  45 |     await page.goto("/clientes");
  46 |     await expect(page).toHaveURL(/\/login/);
  47 |     await evidencia(page, "CP-63-06-logout");
  48 |   });
  49 | 
  50 |   test("CP-64 un usuario Editor no ve ni accede a funciones de administración en la UI", async ({ page }) => {
  51 |     const c = ctx();
  52 |     await loginUI(page, c.editor, c.password);
  53 |     await expect(page.getByTestId("link-nav-usuarios")).toHaveCount(0);
  54 |     await page.getByTestId("link-nav-clientes").click();
  55 |     await expect(page.getByRole("tab", { name: /crear cliente/i })).toHaveCount(0);
  56 |     await page.goto("/usuarios");
> 57 |     await expect(page.getByText(/no autorizado/i)).toBeVisible();
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  58 |     await evidencia(page, "CP-64-editor-sin-acceso");
  59 |   });
  60 | 
  61 |   test("CP-56 NFR-USAB-4 desde un cliente se accede a la lista de sus contratos", async ({ page }) => {
  62 |     const c = ctx();
  63 |     await loginUI(page, c.admin, c.password);
  64 |     await page.getByTestId("link-nav-clientes").click();
  65 |     await expect(page.getByText(c.cliente.nombre).first()).toBeVisible({ timeout: 30_000 });
  66 |     const verContratos = page.getByTestId(`button-cliente-contratos-${c.cliente.id}`);
  67 |     await expect(verContratos, "Debe existir una acción 'Ver contratos' por cliente").toBeVisible({ timeout: 10_000 });
  68 |     await verContratos.click();
  69 |     await expect(page).toHaveURL(new RegExp(`/contratos\\?cliente=${c.cliente.id}`));
  70 |     await expect(page.getByText(c.contrato.titulo).first()).toBeVisible({ timeout: 30_000 });
  71 |     await evidencia(page, "CP-56-contratos-del-cliente");
  72 |   });
  73 | 
  74 |   test("CP-41 XSS almacenado: un nombre con HTML malicioso se muestra escapado", async ({ page }) => {
  75 |     const c = ctx();
  76 |     test.skip(!!c.xss.error, "El backend rechazó el payload XSS en la validación de entrada (mitigación en servidor)");
  77 |     await loginUI(page, c.admin, c.password);
  78 |     await page.getByTestId("link-nav-clientes").click();
  79 |     await expect(page.getByText(`XSS ${c.sufijo}`).first()).toBeVisible({ timeout: 30_000 });
  80 |     expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  81 |     await evidencia(page, "CP-41-xss-escapado");
  82 |   });
  83 | });
  84 | 
```