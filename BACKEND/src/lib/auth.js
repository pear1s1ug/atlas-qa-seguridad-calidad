const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "inseguro";

/**
 * Extrae y verifica el JWT de la cabecera Authorization: Bearer <token>.
 * Retorna el payload decodificado o null si el token falta, es inválido o expiró.
 * (Extraído sin cambios de comportamiento desde las rutas para permitir pruebas unitarias).
 */
function getUserFromAuthHeader(req) {
  const auth = (req && req.headers && req.headers.authorization) || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.substring(7);
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { getUserFromAuthHeader, JWT_SECRET };
