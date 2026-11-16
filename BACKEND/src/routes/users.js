/** RF-3 Gestión de usuarios / RB-2 / NFR-SEG-2 */
const express = require("express");
const bcrypt = require("bcryptjs");
const { pool, transaccion } = require("../db");
const config = require("../config");
const { requireAuth, requireAdmin, ROL_ADMIN } = require("../lib/auth");
const { validar, validarPassword, esIdValido } = require("../lib/validators");
const { desdeReq } = require("../lib/auditoria");
const { ah, e400, e403, e404, e409 } = require("../lib/errors");
const { crearVinculo } = require("./empresa_usuarios");

const router = express.Router();
router.use(requireAuth);

function idParam(req) {
  if (!esIdValido(req.params.id)) throw e400("Identificador inválido");
  return req.params.id;
}

async function perteneceAEmpresa(usuarioId, empresaId) {
  const r = await pool.query("SELECT 1 FROM empresa_usuarios WHERE usuario_id=$1 AND empresa_id=$2", [usuarioId, empresaId]);
  return r.rowCount > 0;
}

// Crear usuario: solo administrador y siempre vinculado a su empresa
router.post("/", requireAdmin, ah(crearVinculo));

router.get(
  "/",
  ah(async (req, res) => {
    const r = await pool.query(
      `SELECT DISTINCT u.id, u.nombre_usuario, u.correo, u.created_at
         FROM usuarios u JOIN empresa_usuarios eu ON eu.usuario_id = u.id
        WHERE eu.empresa_id = $1 ORDER BY u.id DESC`,
      [req.user.empresaId]
    );
    res.json(r.rows);
  })
);

router.get(
  "/:id",
  ah(async (req, res) => {
    const id = idParam(req);
    if (!(await perteneceAEmpresa(id, req.user.empresaId))) throw e404();
    const r = await pool.query("SELECT id, nombre_usuario, correo, created_at FROM usuarios WHERE id = $1", [id]);
    res.json(r.rows[0]);
  })
);

// Administrador de la empresa o el propio usuario (cambio de datos / contraseña de su cuenta)
router.put(
  "/:id",
  ah(async (req, res) => {
    const id = idParam(req);
    const esPropio = String(id) === String(req.user.usuarioId);
    if (!esPropio && req.user.rol !== ROL_ADMIN) throw e403();
    if (!(await perteneceAEmpresa(id, req.user.empresaId))) throw e404();

    const { datos, errores } = validar(req.body, {
      nombre_usuario: { req: true, tipo: "usuario", max: 60 },
      correo: { req: true, tipo: "email", max: 254 },
    });
    const password = req.body && (req.body.password || req.body.contrasena_hash);
    if (password) {
      const ep = validarPassword(password);
      if (ep.length) errores.push(`La contraseña debe tener ${ep.join(", ")}`);
    }
    if (errores.length) throw e400(errores.join("; "));

    const dup = await pool.query(
      "SELECT 1 FROM usuarios WHERE (lower(nombre_usuario)=lower($1) OR lower(correo)=lower($2)) AND id <> $3",
      [datos.nombre_usuario, datos.correo, id]
    );
    if (dup.rowCount) throw e409("El nombre de usuario o correo ya está registrado");

    const hash = password ? await bcrypt.hash(password, config.bcryptRounds) : null;
    const r = await pool.query(
      `UPDATE usuarios SET nombre_usuario=$1, correo=$2, contrasena_hash=COALESCE($3, contrasena_hash)
        WHERE id=$4 RETURNING id, nombre_usuario, correo, created_at`,
      [datos.nombre_usuario, datos.correo, hash, id]
    );
    if (password) {
      // Cambio de contraseña: se revocan los refresh tokens vigentes del usuario
      await pool.query("UPDATE refresh_tokens SET revocado_en=now() WHERE usuario_id=$1 AND revocado_en IS NULL", [id]);
    }
    await desdeReq(req, `USUARIOS_ACTUALIZAR: actualizó usuario ID ${id}${password ? " (cambio de contraseña)" : ""}`);
    res.json(r.rows[0]);
  })
);

router.delete(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const id = idParam(req);
    if (String(id) === String(req.user.usuarioId)) throw e409("No puede eliminar su propia cuenta");
    if (!(await perteneceAEmpresa(id, req.user.empresaId))) throw e404();
    await transaccion(async (client) => {
      await client.query("DELETE FROM empresa_usuarios WHERE usuario_id=$1 AND empresa_id=$2", [id, req.user.empresaId]);
      const otros = await client.query("SELECT 1 FROM empresa_usuarios WHERE usuario_id=$1", [id]);
      if (!otros.rowCount) {
        await client.query("DELETE FROM refresh_tokens WHERE usuario_id=$1", [id]);
        await client.query("DELETE FROM usuarios WHERE id=$1", [id]);
      }
      await desdeReq(req, `USUARIOS_ELIMINAR: eliminó usuario ID ${id}`, client);
    });
    res.json({ deleted: true });
  })
);

module.exports = router;
