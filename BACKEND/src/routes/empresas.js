/** RF-2 Registro de usuario + empresa / RB-1 / RB-2 / NFR-SEG-8 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { pool, transaccion } = require("../db");
const config = require("../config");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { validar, esIdValido } = require("../lib/validators");
const { validarNuevoUsuario, crearUsuario } = require("../lib/usuariosSvc");
const { registrar, desdeReq } = require("../lib/auditoria");
const { ah, e400, e404, e409 } = require("../lib/errors");

const router = express.Router();

const REGLAS_EMPRESA = {
  nombre: { req: true, max: 150 },
  direccion: { max: 250 },
  telefono: { tipo: "telefono", max: 20 },
  correo: { req: true, tipo: "email", max: 254 },
};

const limiteRegistro = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.registroMaxPorVentana,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes", glosa: "Demasiados registros desde esta red. Intente más tarde." },
});

function idParam(req) {
  if (!esIdValido(req.params.id)) throw e400("Identificador inválido");
  return req.params.id;
}

// Registro público (visitante): crea usuario + empresa + vínculo administrador en una transacción atómica
router.post(
  "/",
  limiteRegistro,
  ah(async (req, res) => {
    const { usuario, empresa } = req.body || {};
    if (!usuario || !empresa) throw e400("Debe enviar los datos del usuario y de la empresa");
    const u = validarNuevoUsuario(usuario);
    const { datos: e, errores } = validar(empresa, REGLAS_EMPRESA);
    if (errores.length) throw e400(errores.join("; "));

    const resultado = await transaccion(async (client) => {
      // RB-1: un mismo correo no puede ser correo principal de dos empresas
      const dup = await client.query("SELECT 1 FROM empresas WHERE lower(correo) = lower($1)", [e.correo]);
      if (dup.rowCount) throw e409("Ya existe una empresa registrada con ese correo");
      const nuevo = await crearUsuario(client, u);
      const emp = await client.query(
        "INSERT INTO empresas (nombre, direccion, telefono, correo) VALUES ($1, $2, $3, $4) RETURNING *",
        [e.nombre, e.direccion, e.telefono, e.correo]
      );
      // RF-2.3: el primer usuario de la empresa es administrador
      const rolAdmin = await client.query("SELECT id FROM roles WHERE nombre = 'administrador'");
      await client.query("INSERT INTO empresa_usuarios (empresa_id, usuario_id, rol_id) VALUES ($1, $2, $3)", [
        emp.rows[0].id,
        nuevo.id,
        rolAdmin.rows[0].id,
      ]);
      await registrar(nuevo.nombre_usuario, emp.rows[0].id, `EMPRESAS_CREAR: registró empresa ${e.nombre}`, client);
      return { usuario: nuevo, empresa: emp.rows[0] };
    });
    res.status(201).json(resultado);
  })
);

// Solo las empresas a las que pertenece el usuario autenticado (RB-2)
router.get(
  "/",
  requireAuth,
  ah(async (req, res) => {
    const r = await pool.query(
      `SELECT e.* FROM empresas e JOIN empresa_usuarios eu ON eu.empresa_id = e.id
        WHERE eu.usuario_id = $1 ORDER BY e.id DESC`,
      [req.user.usuarioId]
    );
    res.json(r.rows);
  })
);

router.get(
  "/:id",
  requireAuth,
  ah(async (req, res) => {
    const id = idParam(req);
    const r = await pool.query(
      `SELECT e.* FROM empresas e JOIN empresa_usuarios eu ON eu.empresa_id = e.id
        WHERE e.id = $1 AND eu.usuario_id = $2 LIMIT 1`,
      [id, req.user.usuarioId]
    );
    if (!r.rowCount) throw e404();
    res.json(r.rows[0]);
  })
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    const id = idParam(req);
    if (String(id) !== String(req.user.empresaId)) throw e404();
    const { datos: e, errores } = validar(req.body, REGLAS_EMPRESA);
    if (errores.length) throw e400(errores.join("; "));
    const dup = await pool.query("SELECT 1 FROM empresas WHERE lower(correo) = lower($1) AND id <> $2", [e.correo, id]);
    if (dup.rowCount) throw e409("Ya existe una empresa registrada con ese correo");
    const r = await pool.query(
      "UPDATE empresas SET nombre=$1, direccion=$2, telefono=$3, correo=$4 WHERE id=$5 RETURNING *",
      [e.nombre, e.direccion, e.telefono, e.correo, id]
    );
    await desdeReq(req, `EMPRESAS_ACTUALIZAR: actualizó empresa ID ${id}`);
    res.json(r.rows[0]);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  ah(async (req) => {
    const id = idParam(req);
    if (String(id) !== String(req.user.empresaId)) throw e404();
    throw e409("La eliminación de empresas requiere un proceso de baja formal (retención legal de datos)");
  })
);

module.exports = router;
