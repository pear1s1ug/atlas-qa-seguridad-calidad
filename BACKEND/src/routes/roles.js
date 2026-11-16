/** Roles del sistema (administrador / editor): catálogo fijo de solo lectura. */
const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../lib/auth");
const { esIdValido } = require("../lib/validators");
const { ah, e400, e404, e403 } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

router.get("/", ah(async (req, res) => res.json((await pool.query("SELECT * FROM roles ORDER BY id")).rows)));

router.get(
  "/:id",
  ah(async (req, res) => {
    if (!esIdValido(req.params.id)) throw e400("Identificador inválido");
    const r = await pool.query("SELECT * FROM roles WHERE id=$1", [req.params.id]);
    if (!r.rowCount) throw e404();
    res.json(r.rows[0]);
  })
);

// Modificar el catálogo global de roles afectaría a todas las empresas: no se expone vía API
router.post("/", (req, res, next) => next(e403("Los roles del sistema no son modificables")));
router.put("/:id", (req, res, next) => next(e403("Los roles del sistema no son modificables")));
router.delete("/:id", (req, res, next) => next(e403("Los roles del sistema no son modificables")));

module.exports = router;
