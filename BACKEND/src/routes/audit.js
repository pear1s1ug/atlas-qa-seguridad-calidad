/** RF-6 Auditoría / NFR-SEG-6 / RB-2: lectura aislada por empresa; sin inserción manual (append-only). */
const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../lib/auth");
const { ah, HttpError } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  ah(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 500, 1), 1000);
    const r = await pool.query(
      `SELECT id, usuario_id, accion, fecha_hora FROM auditoria
        WHERE empresa_id = $1
           OR (empresa_id IS NULL AND usuario_id IN (
                SELECT u.nombre_usuario FROM usuarios u JOIN empresa_usuarios eu ON eu.usuario_id = u.id WHERE eu.empresa_id = $1))
        ORDER BY id DESC LIMIT ${limit}`,
      [req.user.empresaId]
    );
    res.json(r.rows);
  })
);

// Los registros de auditoría solo los genera el sistema: se impide su falsificación
router.all("/", (req, res, next) => next(new HttpError(405, "Método no permitido", "La auditoría es de solo lectura")));

module.exports = router;
