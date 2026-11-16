/** Métricas del dashboard (RF-2 criterio de aceptación / RF-5.4). Sin latencia artificial (NFR-PERF-1/2). */
const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../lib/auth");
const { calcularDiasEntreFechas, fechaHoyISO, sumarDiasISO } = require("../lib/contratoEstado");
const { ah } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

const iso = (f) => (f instanceof Date ? fechaHoyISO(f) : String(f).slice(0, 10));

router.get(
  "/",
  ah(async (req, res) => {
    const e = req.user.empresaId;
    const hoy = fechaHoyISO();
    const en30 = sumarDiasISO(hoy, 30);
    const base = `FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id WHERE cl.empresa_id = $1`;
    const [prox, venc, usu, cli, c15, c30] = await Promise.all([
      pool.query(`SELECT c.id, c.fecha_fin, cl.nombre AS cliente ${base} AND c.fecha_fin BETWEEN $2 AND $3 ORDER BY c.fecha_fin ASC LIMIT 10`, [e, hoy, en30]),
      pool.query(`SELECT c.id, c.fecha_fin, cl.nombre AS cliente ${base} AND c.fecha_fin < $2 ORDER BY c.fecha_fin DESC LIMIT 10`, [e, hoy]),
      pool.query("SELECT count(*)::int AS n FROM empresa_usuarios WHERE empresa_id = $1", [e]),
      pool.query("SELECT count(*)::int AS n FROM clientes WHERE empresa_id = $1 AND eliminado_en IS NULL", [e]),
      pool.query(`SELECT count(*)::int AS n ${base} AND c.fecha_fin BETWEEN $2 AND $3`, [e, hoy, sumarDiasISO(hoy, 15)]),
      pool.query(`SELECT count(*)::int AS n ${base} AND c.fecha_fin BETWEEN $2 AND $3`, [e, hoy, en30]),
    ]);
    res.json({
      contratosProximosAVencer: prox.rows.map((c) => ({
        id: c.id, cliente: c.cliente, fechaVencimiento: iso(c.fecha_fin), diasRestantes: calcularDiasEntreFechas(hoy, iso(c.fecha_fin)),
      })),
      contratosVencidos: venc.rows.map((c) => ({
        id: c.id, cliente: c.cliente, fechaVencimiento: iso(c.fecha_fin), diasVencidos: calcularDiasEntreFechas(iso(c.fecha_fin), hoy),
      })),
      metricas: { totalUsuarios: usu.rows[0].n, totalClientes: cli.rows[0].n, contratos15Dias: c15.rows[0].n, contratos30Dias: c30.rows[0].n },
    });
  })
);

module.exports = router;
