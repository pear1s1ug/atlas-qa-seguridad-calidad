/** RF-5.5 Acceso público a un documento mediante enlace temporal (token aleatorio de 256 bits). */
const express = require("express");
const { pool } = require("../db");
const { sha256 } = require("../lib/cifrado");
const { registrar } = require("../lib/auditoria");
const { ah, e404, HttpError } = require("../lib/errors");
const { enviarDocumento } = require("./contracts");

const router = express.Router();

router.get(
  "/:token",
  ah(async (req, res) => {
    const token = String(req.params.token || "");
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw e404("Enlace no válido");
    const r = await pool.query(
      `SELECT e.contrato_id, e.expira_en, e.revocado_en, cl.empresa_id
         FROM enlaces_compartidos e JOIN contratos c ON c.id = e.contrato_id JOIN clientes cl ON cl.id = c.cliente_id
        WHERE e.token_hash = $1`,
      [sha256(token)]
    );
    const enlace = r.rows[0];
    if (!enlace || enlace.revocado_en) throw e404("Enlace no válido o revocado");
    if (new Date(enlace.expira_en) < new Date()) throw new HttpError(410, "Enlace expirado", "El enlace para compartir ha expirado");
    await registrar("enlace-compartido", enlace.empresa_id, `DOCUMENTO_DESCARGAR_ENLACE: descarga vía enlace del contrato ID ${enlace.contrato_id}`);
    await enviarDocumento(res, enlace.contrato_id);
  })
);

module.exports = router;
