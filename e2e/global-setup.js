/**
 * Prepara datos de prueba aislados vía API: empresa + administrador, editor,
 * un cliente y un contrato. Se guardan en .data/contexto.json.
 */
const fs = require("fs");
const path = require("path");

const API = process.env.API_URL || "http://localhost:4450";
const PASSWORD = "Atlas#E2E-2026x";

async function j(method, url, body, token, isForm) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(API + url, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = txt; }
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${txt}`);
  return data;
}

module.exports = async () => {
  const s = Date.now().toString(36);
  const admin = `e2e_admin_${s}`;
  const editor = `e2e_editor_${s}`;
  const reg = await j("POST", "/empresas", {
    usuario: { nombre_usuario: admin, contrasena_hash: PASSWORD, password: PASSWORD, correo: `${admin}@atlas-qa.cl` },
    empresa: { nombre: `Empresa E2E ${s}`, direccion: "Av. Test 100", telefono: "+56911112222", correo: `emp_${s}@atlas-qa.cl` },
  });
  const { token } = await j("POST", "/autenticacion/login", { nombre_usuario: admin, password: PASSWORD });
  await j("POST", "/empresa-usuarios", { nombre_usuario: editor, contrasena_hash: PASSWORD, password: PASSWORD, correo: `${editor}@atlas-qa.cl`, rol_id: 2 }, token);
  const cliente = await j("POST", "/clientes", {
    nombre: `Cliente Semilla ${s}`, correo: `cli_${s}@cliente-qa.cl`, telefono: "+56933334444", direccion: "Calle 1",
    es_empresa: true, rut: "76.086.428-5", nombre_fantasia: "Semilla", giro_actividad_economica: "Servicios",
    nombre_banco: "Banco QA", numero_cuenta: "123456789", titular_cuenta: "Semilla SpA", metodo_pago: "transferencia", dia_pago: "5", moneda: "CLP",
  }, token);
  const xss = await j("POST", "/clientes", {
    nombre: `<img src=x onerror="window.__xss=1">XSS ${s}`, correo: `xss_${s}@cliente-qa.cl`, telefono: "+56955556666", direccion: "Calle 2",
  }, token).catch((e) => ({ error: e.message }));
  const form = new FormData();
  form.append("cliente_id", String(cliente.id));
  form.append("titulo", `Contrato Semilla ${s}`);
  form.append("descripcion", "Contrato creado por global-setup");
  form.append("fecha_inicio", "2026-01-01");
  form.append("fecha_fin", "2027-06-30");
  form.append("file", new Blob([fs.readFileSync(path.join(__dirname, "fixtures", "contrato.pdf"))], { type: "application/pdf" }), "contrato.pdf");
  const contrato = await j("POST", "/contratos", form, token, true);
  const ctx = { admin, editor, password: PASSWORD, empresaId: reg.empresa.id, cliente, contrato, xss, sufijo: s };
  fs.mkdirSync(path.join(__dirname, ".data"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, ".data", "contexto.json"), JSON.stringify(ctx, null, 2));
};
