const fs = require("fs");
const path = require("path");

function ctx() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", ".data", "contexto.json"), "utf8"));
}

const EVID = process.env.EVID_DIR || path.join(__dirname, "..", "capturas");

async function evidencia(page, nombre, opts = {}) {
  fs.mkdirSync(EVID, { recursive: true });
  await page.screenshot({ path: path.join(EVID, `${nombre}.png`), fullPage: opts.fullPage ?? false });
}

async function loginUI(page, usuario, password) {
  await page.goto("/login");
  await page.getByTestId("input-nombre-usuario").fill(usuario);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("button-login").click();
  await page.waitForURL(/\/home/, { timeout: 30_000 });
}

module.exports = { ctx, evidencia, loginUI, EVID };
