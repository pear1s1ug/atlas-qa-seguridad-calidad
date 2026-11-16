/** Registro de auditoría de acciones críticas (RF-6.1 / NFR-SEG-6). */
const { pool } = require("../db");

// Neutraliza saltos de línea y caracteres de control para evitar inyección en logs
function limpiar(texto) {
  // eslint-disable-next-line no-control-regex -- se buscan caracteres de control a propósito
  return String(texto).replace(/[\r\n\t\u0000-\u001f\u007f]+/g, " ").slice(0, 500);
}

async function registrar(usuario, empresaId, accion, cliente = pool) {
  await cliente.query("INSERT INTO auditoria (usuario_id, accion, empresa_id) VALUES ($1, $2, $3)", [
    limpiar(usuario || "sistema"),
    limpiar(accion),
    empresaId || null,
  ]);
}

function desdeReq(req, accion, cliente) {
  return registrar(req.user && req.user.nombreUsuario, req.user && req.user.empresaId, accion, cliente);
}

module.exports = { registrar, desdeReq, limpiar };
