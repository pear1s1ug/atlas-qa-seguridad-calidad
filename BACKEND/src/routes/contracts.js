/** RF-5 Gestión de contratos y documentos / RF-6.1 / RB-2 / RB-3 / RB-4 / NFR-SEG-4 / NFR-SEG-5 */
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const { pool, transaccion } = require("../db");
const config = require("../config");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { validar, esIdValido } = require("../lib/validators");
const { calcularEstado, fechaHoyISO, sumarDiasISO } = require("../lib/contratoEstado");
const archivos = require("../lib/archivos");
const { sha256 } = require("../lib/cifrado");
const { desdeReq } = require("../lib/auditoria");
const { ah, e400, e404 } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

const iso = (f) => (f instanceof Date ? fechaHoyISO(f) : String(f).slice(0, 10));
const conEstado = (c) => ({ ...c, fecha_inicio: iso(c.fecha_inicio), fecha_fin: iso(c.fecha_fin), estado: calcularEstado(iso(c.fecha_fin)) });

function idParam(req) {
  if (!esIdValido(req.params.id)) throw e400("Identificador inválido");
  return req.params.id;
}

async function clienteDeEmpresa(clienteId, empresaId) {
  if (!esIdValido(clienteId)) return false;
  const r = await pool.query("SELECT 1 FROM clientes WHERE id=$1 AND empresa_id=$2 AND eliminado_en IS NULL", [clienteId, empresaId]);
  return r.rowCount > 0;
}

async function contratoDeEmpresa(id, empresaId) {
  const r = await pool.query(
    `SELECT c.*, cl.nombre AS cliente_nombre,
            EXISTS (SELECT 1 FROM documentos_contrato d WHERE d.contract_id = c.id) AS tiene_documento
       FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.id = $1 AND cl.empresa_id = $2`,
    [id, empresaId]
  );
  if (!r.rowCount) throw e404("Contrato no encontrado");
  return r.rows[0];
}

const REGLAS = {
  cliente_id: { req: true, tipo: "entero", min: 1 },
  titulo: { req: true, max: 200 },
  descripcion: { max: 2000 },
  fecha_inicio: { req: true, tipo: "fecha" },
  fecha_fin: { req: true, tipo: "fecha" },
};

async function guardarDocumento(client, contratoId, file) {
  const doc = archivos.guardar(file);
  try {
    await client.query(
      "INSERT INTO documentos_contrato (contract_id, ruta, nombre_original, mime_type, tamano) VALUES ($1, $2, $3, $4, $5)",
      [contratoId, doc.ruta, doc.nombre_original, doc.mime_type, doc.tamano]
    );
  } catch (e) {
    archivos.eliminar(doc.ruta);
    throw e;
  }
  return doc;
}

router.post(
  "/",
  requireAdmin,
  archivos.upload.single("file"),
  ah(async (req, res) => {
    const { datos: d, errores } = validar(req.body, REGLAS);
    if (!errores.length && d.fecha_fin < d.fecha_inicio) errores.push("La fecha de término debe ser posterior a la fecha de inicio");
    if (errores.length) throw e400(errores.join("; "));
    if (req.file) archivos.validarContenido(req.file); // antes de escribir nada
    if (!(await clienteDeEmpresa(d.cliente_id, req.user.empresaId))) throw e404("El cliente indicado no existe en su empresa");

    const contrato = await transaccion(async (client) => {
      const r = await client.query(
        "INSERT INTO contratos (cliente_id, titulo, descripcion, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [d.cliente_id, d.titulo, d.descripcion, d.fecha_inicio, d.fecha_fin]
      );
      await desdeReq(req, `CONTRATOS_CREAR: creó contrato ID ${r.rows[0].id} "${d.titulo}" para cliente ${d.cliente_id}`, client);
      if (req.file) {
        const doc = await guardarDocumento(client, r.rows[0].id, req.file);
        await desdeReq(req, `DOCUMENTO_SUBIR: adjuntó ${doc.nombre_original} al contrato ID ${r.rows[0].id}`, client);
      }
      return r.rows[0];
    });
    res.status(201).json(conEstado(contrato));
  })
);

router.get(
  "/",
  ah(async (req, res) => {
    const cliente = req.query.cliente && esIdValido(req.query.cliente) ? req.query.cliente : null;
    const r = await pool.query(
      `SELECT c.id, c.cliente_id, c.titulo, c.descripcion, c.fecha_inicio, c.fecha_fin, c.created_at, cl.nombre AS cliente_nombre
         FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id
        WHERE cl.empresa_id = $1 AND ($2::bigint IS NULL OR c.cliente_id = $2)
        ORDER BY c.id DESC`,
      [req.user.empresaId, cliente]
    );
    res.json(r.rows.map(conEstado));
  })
);

async function porRango(empresaId, desde, hasta, orden, limite) {
  const r = await pool.query(
    `SELECT c.id, c.cliente_id, c.titulo, c.descripcion, c.fecha_inicio, c.fecha_fin, c.created_at
       FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id
      WHERE cl.empresa_id = $1 AND ($2::date IS NULL OR c.fecha_fin >= $2) AND ($3::date IS NULL OR c.fecha_fin <= $3)
      ORDER BY c.fecha_fin ${orden === "DESC" ? "DESC" : "ASC"} LIMIT ${Number(limite)}`,
    [empresaId, desde, hasta]
  );
  return r.rows.map(conEstado);
}

router.get(
  "/estados",
  ah(async (req, res) => {
    const hoy = fechaHoyISO();
    const porVencer = await porRango(req.user.empresaId, hoy, sumarDiasISO(hoy, 30), "ASC", 3);
    const vencidos = await porRango(req.user.empresaId, null, sumarDiasISO(hoy, -1), "DESC", 3);
    res.json([...porVencer, ...vencidos]);
  })
);

router.get(
  "/dashboard",
  ah(async (req, res) => {
    const hoy = fechaHoyISO();
    const e = req.user.empresaId;
    const contar = async (dias) =>
      (
        await pool.query(
          `SELECT count(*)::int AS n FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id
            WHERE cl.empresa_id = $1 AND c.fecha_fin BETWEEN $2 AND $3`,
          [e, hoy, sumarDiasISO(hoy, dias)]
        )
      ).rows[0].n;
    const u = await pool.query("SELECT count(*)::int AS n FROM empresa_usuarios WHERE empresa_id=$1", [e]);
    const c = await pool.query("SELECT count(*)::int AS n FROM clientes WHERE empresa_id=$1 AND eliminado_en IS NULL", [e]);
    res.json({
      totalUsuarios: u.rows[0].n,
      totalClientes: c.rows[0].n,
      contratosVencen7Dias: await contar(7),
      contratosVencen15Dias: await contar(15),
      contratosVencen30Dias: await contar(30),
    });
  })
);

router.get(
  "/:id",
  ah(async (req, res) => {
    res.json(conEstado(await contratoDeEmpresa(idParam(req), req.user.empresaId)));
  })
);

router.put(
  "/:id",
  requireAdmin,
  archivos.upload.single("file"),
  ah(async (req, res) => {
    const id = idParam(req);
    const actual = await contratoDeEmpresa(id, req.user.empresaId);
    const merged = {
      cliente_id: req.body.cliente_id ?? actual.cliente_id,
      titulo: req.body.titulo ?? actual.titulo,
      descripcion: req.body.descripcion ?? actual.descripcion,
      fecha_inicio: req.body.fecha_inicio ?? iso(actual.fecha_inicio),
      fecha_fin: req.body.fecha_fin ?? iso(actual.fecha_fin),
    };
    const { datos: d, errores } = validar(merged, REGLAS);
    if (!errores.length && d.fecha_fin < d.fecha_inicio) errores.push("La fecha de término debe ser posterior a la fecha de inicio");
    if (errores.length) throw e400(errores.join("; "));
    if (req.file) archivos.validarContenido(req.file);
    if (!(await clienteDeEmpresa(d.cliente_id, req.user.empresaId))) throw e404("El cliente indicado no existe en su empresa");

    const r = await transaccion(async (client) => {
      const up = await client.query(
        "UPDATE contratos SET cliente_id=$1, titulo=$2, descripcion=$3, fecha_inicio=$4, fecha_fin=$5 WHERE id=$6 RETURNING *",
        [d.cliente_id, d.titulo, d.descripcion, d.fecha_inicio, d.fecha_fin, id]
      );
      await desdeReq(req, `CONTRATOS_ACTUALIZAR: actualizó contrato ID ${id} - ${d.titulo}`, client);
      if (req.file) {
        const doc = await guardarDocumento(client, id, req.file);
        await desdeReq(req, `DOCUMENTO_SUBIR: adjuntó ${doc.nombre_original} al contrato ID ${id}`, client);
      }
      return up.rows[0];
    });
    res.json(conEstado(r));
  })
);

/** Envía el último documento del contrato (desde storage interno o, si es heredado, desde la BD). */
async function enviarDocumento(res, contratoId) {
  const doc = await pool.query(
    "SELECT ruta, nombre_original, mime_type, document FROM documentos_contrato WHERE contract_id=$1 ORDER BY id DESC LIMIT 1",
    [contratoId]
  );
  if (!doc.rowCount) throw e404("El contrato no tiene documento adjunto");
  const d = doc.rows[0];
  const nombre = (d.nombre_original || "contrato.pdf").replace(/["\\\r\n]/g, "_");
  res.setHeader("Content-Type", d.mime_type || "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(nombre)}"`);
  res.setHeader("Cache-Control", "no-store");
  if (d.ruta) {
    const abs = archivos.rutaAbsoluta(d.ruta);
    if (!fs.existsSync(abs)) throw e404("El archivo no se encuentra en el almacenamiento");
    return res.send(fs.readFileSync(abs));
  }
  return res.send(d.document);
}

router.get(
  "/:id/file",
  ah(async (req, res) => {
    const c = await contratoDeEmpresa(idParam(req), req.user.empresaId);
    await desdeReq(req, `DOCUMENTO_DESCARGAR: descargó documento del contrato ID ${c.id}`);
    await enviarDocumento(res, c.id);
  })
);

// RF-5.5: enlaces para compartir el documento con expiración y revocación
router.post(
  "/:id/compartir",
  requireAdmin,
  ah(async (req, res) => {
    const c = await contratoDeEmpresa(idParam(req), req.user.empresaId);
    if (!c.tiene_documento) throw e400("El contrato no tiene documento para compartir");
    const horas = Math.min(Math.max(Number.parseInt((req.body && req.body.horas) || 24, 10) || 24, 1), 168);
    const token = crypto.randomBytes(32).toString("base64url");
    const r = await pool.query(
      `INSERT INTO enlaces_compartidos (contrato_id, token_hash, expira_en, creado_por)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval, $4) RETURNING id, expira_en`,
      [c.id, sha256(token), String(horas), req.user.nombreUsuario]
    );
    await desdeReq(req, `DOCUMENTO_COMPARTIR: generó enlace ${r.rows[0].id} para contrato ID ${c.id} (${horas} h)`);
    res.status(201).json({ id: r.rows[0].id, token, url: `${config.publicApiUrl}/compartido/${token}`, expira_en: r.rows[0].expira_en });
  })
);

router.get(
  "/:id/compartir",
  requireAdmin,
  ah(async (req, res) => {
    const c = await contratoDeEmpresa(idParam(req), req.user.empresaId);
    const r = await pool.query(
      "SELECT id, expira_en, revocado_en, creado_por, created_at FROM enlaces_compartidos WHERE contrato_id=$1 ORDER BY id DESC",
      [c.id]
    );
    res.json(r.rows);
  })
);

router.delete(
  "/:id/compartir",
  requireAdmin,
  ah(async (req, res) => {
    const c = await contratoDeEmpresa(idParam(req), req.user.empresaId);
    const r = await pool.query("UPDATE enlaces_compartidos SET revocado_en=now() WHERE contrato_id=$1 AND revocado_en IS NULL", [c.id]);
    await desdeReq(req, `DOCUMENTO_REVOCAR_ENLACES: revocó ${r.rowCount} enlace(s) del contrato ID ${c.id}`);
    res.json({ revocados: r.rowCount });
  })
);

router.delete(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const c = await contratoDeEmpresa(idParam(req), req.user.empresaId);
    const rutas = await transaccion(async (client) => {
      const docs = await client.query("DELETE FROM documentos_contrato WHERE contract_id=$1 RETURNING ruta", [c.id]);
      await client.query("DELETE FROM enlaces_compartidos WHERE contrato_id=$1", [c.id]);
      await client.query("DELETE FROM contratos WHERE id=$1", [c.id]);
      await desdeReq(req, `CONTRATOS_ELIMINAR: eliminó contrato ID ${c.id} y ${docs.rowCount} documento(s)`, client);
      return docs.rows.map((d) => d.ruta).filter(Boolean);
    });
    rutas.forEach(archivos.eliminar);
    res.json({ deleted: true });
  })
);

module.exports = router;
module.exports.enviarDocumento = enviarDocumento;
