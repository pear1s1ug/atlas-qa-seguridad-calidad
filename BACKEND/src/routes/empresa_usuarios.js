/** RF-3 Gestión de usuarios de empresa y roles / RB-2 / RB-4 / RB-5 */
const express = require("express");
const { pool, transaccion } = require("../db");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { esIdValido } = require("../lib/validators");
const { validarNuevoUsuario, crearUsuario, rolValido } = require("../lib/usuariosSvc");
const { desdeReq } = require("../lib/auditoria");
const { ah, e400, e404, e409 } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

function idParam(req) {
  if (!esIdValido(req.params.id)) throw e400("Identificador inválido");
  return req.params.id;
}

/** Crea (o vincula) un usuario en la empresa del token con un rol. Reutilizado por POST /usuarios. */
async function crearVinculo(req, res) {
  const empresaId = req.user.empresaId;
  const { usuario_id, rol_id } = req.body || {};
  // Validar rol ANTES de crear cualquier registro (evita usuarios huérfanos)
  if (!rol_id) throw e400("El campo rol_id es requerido");
  if (!(await rolValido(pool, rol_id))) throw e400("El rol indicado no existe");

  const vinculo = await transaccion(async (client) => {
    let usuarioId;
    if (usuario_id) {
      if (!esIdValido(usuario_id)) throw e400("usuario_id inválido");
      const ex = await client.query("SELECT id FROM usuarios WHERE id = $1", [usuario_id]);
      if (!ex.rowCount) throw e404("El usuario indicado no existe");
      usuarioId = usuario_id;
    } else {
      usuarioId = (await crearUsuario(client, validarNuevoUsuario(req.body))).id;
    }
    const dup = await client.query("SELECT 1 FROM empresa_usuarios WHERE empresa_id=$1 AND usuario_id=$2", [empresaId, usuarioId]);
    if (dup.rowCount) throw e409("El usuario ya pertenece a la empresa");
    const r = await client.query(
      "INSERT INTO empresa_usuarios (empresa_id, usuario_id, rol_id) VALUES ($1, $2, $3) RETURNING *",
      [empresaId, usuarioId, rol_id]
    );
    await desdeReq(req, `EMPRESA_USUARIOS_CREAR: vinculó usuario ${usuarioId} a empresa ${empresaId} con rol ${rol_id}`, client);
    return r.rows[0];
  });
  res.status(201).json(vinculo);
}

router.post("/", requireAdmin, ah(crearVinculo));

router.get(
  "/",
  ah(async (req, res) => {
    const r = await pool.query(
      `SELECT u.id, u.nombre_usuario, u.correo, eu.id AS empresa_usuario_id, eu.created_at, eu.rol_id, r.nombre AS rol_nombre
         FROM empresa_usuarios eu
         JOIN usuarios u ON u.id = eu.usuario_id
         LEFT JOIN roles r ON r.id = eu.rol_id
        WHERE eu.empresa_id = $1 ORDER BY eu.created_at DESC`,
      [req.user.empresaId]
    );
    res.json(r.rows);
  })
);

router.get(
  "/:id",
  ah(async (req, res) => {
    const r = await pool.query("SELECT * FROM empresa_usuarios WHERE id=$1 AND empresa_id=$2", [idParam(req), req.user.empresaId]);
    if (!r.rowCount) throw e404();
    res.json(r.rows[0]);
  })
);

// Solo se permite cambiar el rol; empresa y usuario no son modificables (evita mover usuarios entre empresas)
router.put(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const id = idParam(req);
    const { rol_id } = req.body || {};
    if (!(await rolValido(pool, rol_id))) throw e400("El rol indicado no existe");
    const actual = await pool.query("SELECT * FROM empresa_usuarios WHERE id=$1 AND empresa_id=$2", [id, req.user.empresaId]);
    if (!actual.rowCount) throw e404();
    if (String(actual.rows[0].usuario_id) === String(req.user.usuarioId)) throw e409("No puede cambiar su propio rol");
    const r = await pool.query("UPDATE empresa_usuarios SET rol_id=$1 WHERE id=$2 RETURNING *", [rol_id, id]);
    await desdeReq(req, `EMPRESA_USUARIOS_ACTUALIZAR: cambió rol del vínculo ID ${id} a ${rol_id}`);
    res.json(r.rows[0]);
  })
);

router.delete(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const id = idParam(req);
    const actual = await pool.query("SELECT * FROM empresa_usuarios WHERE id=$1 AND empresa_id=$2", [id, req.user.empresaId]);
    if (!actual.rowCount) throw e404();
    if (String(actual.rows[0].usuario_id) === String(req.user.usuarioId)) throw e409("No puede eliminar su propio acceso");
    await pool.query("DELETE FROM empresa_usuarios WHERE id=$1", [id]);
    await desdeReq(req, `EMPRESA_USUARIOS_ELIMINAR: eliminó vínculo ID ${id}`);
    res.json({ deleted: true });
  })
);

module.exports = router;
module.exports.crearVinculo = crearVinculo;
