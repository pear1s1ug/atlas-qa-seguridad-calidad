/** Manejo de errores sin fuga de información interna (NFR-SEG-5 / NFR-SEG-6 / NFR-USAB-3). */
const crypto = require("crypto");

class HttpError extends Error {
  constructor(status, error, glosa) {
    super(glosa || error);
    this.status = status;
    this.error = error;
    this.glosa = glosa;
  }
}

const e400 = (glosa) => new HttpError(400, "Datos inválidos", glosa);
const e401 = (glosa = "Debe iniciar sesión para acceder a este recurso") => new HttpError(401, "No autorizado", glosa);
const e403 = (glosa = "Su rol no tiene permisos para realizar esta acción") => new HttpError(403, "Acceso denegado", glosa);
const e404 = (glosa = "El recurso solicitado no existe") => new HttpError(404, "No encontrado", glosa);
const e409 = (glosa) => new HttpError(409, "Conflicto", glosa);

// Envuelve handlers async para enviar errores al middleware central
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.error, glosa: err.glosa });
  }
  // Errores de multer (tamaño de archivo, etc.)
  if (err && err.name === "MulterError") {
    const glosa = err.code === "LIMIT_FILE_SIZE" ? "El archivo supera el tamaño máximo permitido" : "Archivo inválido";
    return res.status(400).json({ error: "Archivo inválido", glosa });
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Datos inválidos", glosa: "El cuerpo de la solicitud no es JSON válido" });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Solicitud demasiado grande", glosa: "El contenido enviado excede el límite" });
  }
  // Errores de PostgreSQL conocidos → mensajes genéricos
  if (err && err.code === "23505") return res.status(409).json({ error: "Conflicto", glosa: "El registro ya existe" });
  if (err && err.code === "23503") return res.status(409).json({ error: "Conflicto", glosa: "El registro tiene datos asociados" });
  if (err && (err.code === "22P02" || err.code === "22007" || err.code === "22008")) {
    return res.status(400).json({ error: "Datos inválidos", glosa: "Uno de los parámetros tiene un formato inválido" });
  }
  const ref = crypto.randomUUID();
  // Log del lado servidor con referencia de correlación; sin datos sensibles en la respuesta
  console.error(`[${ref}]`, err && err.stack ? err.stack : err);
  return res.status(500).json({ error: "Error interno", glosa: `Ocurrió un error inesperado. Referencia: ${ref}` });
}

module.exports = { HttpError, e400, e401, e403, e404, e409, ah, manejadorErrores };
