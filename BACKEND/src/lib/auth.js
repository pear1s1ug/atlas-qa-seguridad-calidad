/**
 * Autenticación y autorización (RF-1 / NFR-SEG-4 / NFR-SEG-9 / RB-4 / RB-5).
 */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { pool } = require("../db");
const { e401, e403 } = require("./errors");

const JWT_SECRET = config.jwtSecret;
const ROL_ADMIN = "administrador";

/** Verifica el Bearer token (solo HS256). Retorna payload o null. */
function getUserFromAuthHeader(req) {
  const auth = (req && req.headers && req.headers.authorization) || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.substring(7), JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

function firmarAccessToken({ usuarioId, nombreUsuario, empresaUsuarioId, empresaId, rol }) {
  return jwt.sign(
    { usuarioId, nombreUsuario, empresaUsuarioId, empresaId, rol },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: config.accessTokenTtl, jwtid: crypto.randomUUID() }
  );
}

/** Middleware: exige token válido, no revocado y con empresa asociada. */
async function requireAuth(req, res, next) {
  try {
    const user = getUserFromAuthHeader(req);
    if (!user || !user.empresaId) throw e401();
    if (user.jti) {
      const r = await pool.query("SELECT 1 FROM tokens_revocados WHERE jti = $1", [user.jti]);
      if (r.rowCount > 0) throw e401("La sesión fue cerrada. Inicie sesión nuevamente");
    }
    // El rol se re-valida contra la BD (el token no es la única fuente de verdad)
    const vinc = await pool.query(
      `SELECT r.nombre AS rol FROM empresa_usuarios eu JOIN roles r ON r.id = eu.rol_id
        WHERE eu.usuario_id = $1 AND eu.empresa_id = $2 ORDER BY eu.id DESC LIMIT 1`,
      [user.usuarioId, user.empresaId]
    );
    if (vinc.rowCount === 0) throw e401("Su usuario ya no pertenece a la empresa");
    req.user = { ...user, rol: vinc.rows[0].rol };
    next();
  } catch (e) {
    next(e);
  }
}

/** Middleware: exige rol administrador (RB-5). El rol editor es solo lectura (RB-4). */
function requireAdmin(req, res, next) {
  if (!req.user) return next(e401());
  if (req.user.rol !== ROL_ADMIN) return next(e403());
  next();
}

module.exports = { getUserFromAuthHeader, firmarAccessToken, requireAuth, requireAdmin, JWT_SECRET, ROL_ADMIN };
