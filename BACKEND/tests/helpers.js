/**
 * Utilidades compartidas para las pruebas de integración de la API Atlas.
 * Las pruebas se ejecutan en proceso (supertest sobre la app Express) contra
 * la base de datos PostgreSQL del ambiente de pruebas (docker compose).
 */
const request = require("supertest");
const { Pool } = require("pg");
const app = require("../src/app");

const db = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:15432/atlas",
});

// Contraseña que cumple la política del ERS (12+ caracteres, mayús., minús., número y símbolo)
const PASSWORD_FUERTE = "Atlas#Prueba2026";

let seq = 0;
function uid(prefix = "qa") {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${process.pid}_${seq}`;
}

function api() {
  return request(app);
}

/** Registra un nuevo usuario + empresa (RF-2.1 / RF-2.2) y retorna sus datos. */
async function registrarEmpresa(opts = {}) {
  const nombre_usuario = opts.nombre_usuario || uid("adm");
  const password = opts.password || PASSWORD_FUERTE;
  const correoEmpresa = opts.correoEmpresa || `${uid("emp")}@atlas-qa.cl`;
  const res = await api()
    .post("/empresas")
    .send({
      usuario: {
        nombre_usuario,
        contrasena_hash: password,
        password,
        correo: `${nombre_usuario}@atlas-qa.cl`,
      },
      empresa: {
        nombre: opts.nombreEmpresa || `Empresa ${nombre_usuario}`,
        direccion: "Av. Siempre Viva 742, Santiago",
        telefono: "+56912345678",
        correo: correoEmpresa,
      },
    });
  return { res, nombre_usuario, password, correoEmpresa };
}

async function login(nombre_usuario, password) {
  return api().post("/autenticacion/login").send({ nombre_usuario, password });
}

/** Crea una empresa nueva y retorna un contexto con token de administrador. */
async function crearContextoAdmin(opts = {}) {
  const reg = await registrarEmpresa(opts);
  if (reg.res.status !== 201) {
    throw new Error(
      `No se pudo registrar empresa (${reg.res.status}): ${JSON.stringify(reg.res.body)}`
    );
  }
  const lr = await login(reg.nombre_usuario, reg.password);
  if (lr.status !== 200) {
    throw new Error(`Login falló (${lr.status}): ${JSON.stringify(lr.body)}`);
  }
  return {
    ...reg,
    token: lr.body.token,
    refreshToken: lr.body.refreshToken,
    empresaId: reg.res.body.empresa && reg.res.body.empresa.id,
    usuarioId: reg.res.body.usuario && reg.res.body.usuario.id,
    auth: { Authorization: `Bearer ${lr.body.token}` },
  };
}

/** Crea un usuario editor (rol 2) dentro de la empresa del contexto admin. */
async function crearEditor(ctxAdmin) {
  const nombre_usuario = uid("edi");
  const res = await api()
    .post("/empresa-usuarios")
    .set(ctxAdmin.auth)
    .send({
      nombre_usuario,
      contrasena_hash: PASSWORD_FUERTE,
      password: PASSWORD_FUERTE,
      correo: `${nombre_usuario}@atlas-qa.cl`,
      rol_id: 2,
    });
  if (res.status !== 201) {
    throw new Error(`No se pudo crear editor (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const lr = await login(nombre_usuario, PASSWORD_FUERTE);
  return {
    nombre_usuario,
    usuarioId: res.body.usuario_id,
    token: lr.body.token,
    auth: { Authorization: `Bearer ${lr.body.token}` },
  };
}

function clienteValido(over = {}) {
  const n = uid("cli");
  return {
    nombre: `Cliente ${n}`,
    correo: `${n}@cliente-qa.cl`,
    telefono: "+56987654321",
    direccion: "Calle Falsa 123, Providencia",
    es_empresa: true,
    rut: "76.086.428-5",
    nombre_fantasia: "Cliente QA",
    giro_actividad_economica: "Servicios informáticos",
    nombre_banco: "Banco de Pruebas",
    numero_cuenta: "00012345678",
    titular_cuenta: "Cliente QA SpA",
    metodo_pago: "transferencia",
    dia_pago: "5",
    moneda: "CLP",
    ...over,
  };
}

async function crearCliente(ctx, over = {}) {
  return api().post("/clientes").set(ctx.auth).send(clienteValido(over));
}

function isoHoyMas(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function crearContrato(ctx, clienteId, over = {}, archivo) {
  const req = api()
    .post("/contratos")
    .set(ctx.auth)
    .field("cliente_id", String(clienteId))
    .field("titulo", over.titulo || "Contrato QA")
    .field("descripcion", over.descripcion || "Contrato generado por pruebas")
    .field("fecha_inicio", over.fecha_inicio || isoHoyMas(-10))
    .field("fecha_fin", over.fecha_fin || isoHoyMas(200));
  if (archivo) req.attach("file", archivo.path, archivo.opts);
  return req;
}

module.exports = {
  app,
  api,
  db,
  uid,
  PASSWORD_FUERTE,
  registrarEmpresa,
  login,
  crearContextoAdmin,
  crearEditor,
  clienteValido,
  crearCliente,
  crearContrato,
  isoHoyMas,
};
