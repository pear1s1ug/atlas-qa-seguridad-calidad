/** RF-4 Gestión de clientes / RB-2 / RB-4 / RB-5 / NFR-SEG-3 / NFR-SEG-5 */
const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { validar, esIdValido } = require("../lib/validators");
const { cifrar, descifrar } = require("../lib/cifrado");
const { desdeReq } = require("../lib/auditoria");
const { ah, e400, e404, e409 } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

const REGLAS = {
  nombre: { req: true, max: 150 },
  correo: { req: true, tipo: "email", max: 254 },
  telefono: { tipo: "telefono", max: 20 },
  direccion: { max: 250 },
  es_empresa: { tipo: "bool", defecto: false },
  rut: { tipo: "rut", max: 12 },
  nombre_fantasia: { max: 150 },
  giro_actividad_economica: { max: 200 },
  nombre_representante: { max: 150 },
  cargo_representante: { max: 100 },
  correo_representante: { tipo: "email", max: 254 },
  telefono_representante: { tipo: "telefono", max: 20 },
  relacion_representante: { max: 100 },
  direccion_calle: { max: 150 },
  direccion_numero: { max: 20 },
  direccion_ciudad: { max: 100 },
  direccion_region: { max: 100 },
  sitio_web: { tipo: "url", max: 250 },
  telefono_corporativo: { tipo: "telefono", max: 20 },
  nombre_banco: { max: 100 },
  numero_cuenta: { max: 30 },
  titular_cuenta: { max: 150 },
  metodo_pago: { max: 30 },
  dia_pago: { tipo: "entero", min: 1, maxValor: 31 },
  moneda: { max: 10 },
};
const CAMPOS = Object.keys(REGLAS);

function idParam(req) {
  if (!esIdValido(req.params.id)) throw e400("Identificador inválido");
  return req.params.id;
}

function datosValidados(body) {
  const { datos, errores } = validar(body, REGLAS);
  if (errores.length) throw e400(errores.join("; "));
  datos.numero_cuenta = cifrar(datos.numero_cuenta);
  return datos;
}

// Descifra datos sensibles solo para el titular autorizado
function salida(row) {
  if (!row) return row;
  const { eliminado_en, ...resto } = row; // eslint-disable-line no-unused-vars
  return { ...resto, numero_cuenta: descifrar(resto.numero_cuenta) };
}

async function correoDuplicado(empresaId, correo, exceptoId = null) {
  const r = await pool.query(
    "SELECT 1 FROM clientes WHERE empresa_id=$1 AND lower(correo)=lower($2) AND eliminado_en IS NULL AND ($3::bigint IS NULL OR id <> $3)",
    [empresaId, correo, exceptoId]
  );
  return r.rowCount > 0;
}

router.post(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const d = datosValidados(req.body);
    if (await correoDuplicado(req.user.empresaId, d.correo)) throw e409("Ya existe un cliente con ese correo");
    const cols = [...CAMPOS, "empresa_id"];
    const valores = [...CAMPOS.map((c) => d[c]), req.user.empresaId]; // empresa_id siempre desde el token
    const r = await pool.query(
      `INSERT INTO clientes (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      valores
    );
    await desdeReq(req, `CLIENTES_CREAR: creó cliente ID ${r.rows[0].id} ${d.nombre}`);
    res.status(201).json(salida(r.rows[0]));
  })
);

// Listado con paginación opcional (?page&limit) y filtro por nombre (?nombre)
router.get(
  "/",
  ah(async (req, res) => {
    const filtro = typeof req.query.nombre === "string" ? req.query.nombre.slice(0, 100) : "";
    const params = [req.user.empresaId, `%${filtro}%`];
    const where = "empresa_id = $1 AND eliminado_en IS NULL AND (nombre ILIKE $2 OR coalesce(nombre_fantasia,'') ILIKE $2)";
    const total = await pool.query(`SELECT count(*)::int AS n FROM clientes WHERE ${where}`, params);
    let sql = `SELECT * FROM clientes WHERE ${where} ORDER BY id DESC`;
    if (req.query.page || req.query.limit) {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
      const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
      sql += ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
    }
    const r = await pool.query(sql, params);
    res.set("X-Total-Count", String(total.rows[0].n));
    res.json(r.rows.map(salida));
  })
);

router.get(
  "/search",
  ah(async (req, res) => {
    const name = typeof req.query.name === "string" ? req.query.name.slice(0, 100) : "";
    const r = await pool.query(
      "SELECT * FROM clientes WHERE nombre ILIKE $1 AND empresa_id = $2 AND eliminado_en IS NULL ORDER BY nombre ASC LIMIT 100",
      [`%${name}%`, req.user.empresaId]
    );
    res.json(r.rows.map(salida));
  })
);

router.get(
  "/:id",
  ah(async (req, res) => {
    const r = await pool.query("SELECT * FROM clientes WHERE id=$1 AND empresa_id=$2 AND eliminado_en IS NULL", [
      idParam(req),
      req.user.empresaId,
    ]);
    if (!r.rowCount) throw e404();
    res.json(salida(r.rows[0]));
  })
);

router.put(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const id = idParam(req);
    const d = datosValidados(req.body);
    const ex = await pool.query("SELECT 1 FROM clientes WHERE id=$1 AND empresa_id=$2 AND eliminado_en IS NULL", [id, req.user.empresaId]);
    if (!ex.rowCount) throw e404();
    if (await correoDuplicado(req.user.empresaId, d.correo, id)) throw e409("Ya existe un cliente con ese correo");
    const sets = CAMPOS.map((c, i) => `${c}=$${i + 1}`).join(", ");
    const r = await pool.query(
      `UPDATE clientes SET ${sets} WHERE id=$${CAMPOS.length + 1} AND empresa_id=$${CAMPOS.length + 2} RETURNING *`,
      [...CAMPOS.map((c) => d[c]), id, req.user.empresaId]
    );
    await desdeReq(req, `CLIENTES_ACTUALIZAR: actualizó cliente ID ${id}`);
    res.json(salida(r.rows[0]));
  })
);

// RF-4.2: eliminación lógica (el registro se conserva con marca temporal)
router.delete(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const id = idParam(req);
    const r = await pool.query(
      "UPDATE clientes SET eliminado_en = now() WHERE id=$1 AND empresa_id=$2 AND eliminado_en IS NULL RETURNING id",
      [id, req.user.empresaId]
    );
    if (!r.rowCount) throw e404();
    await desdeReq(req, `CLIENTES_ELIMINAR: eliminó (lógicamente) cliente ID ${id}`);
    res.json({ deleted: true });
  })
);

module.exports = router;
