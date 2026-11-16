/** Servicio compartido para crear usuarios vinculados a una empresa (RF-3.1). */
const bcrypt = require("bcryptjs");
const config = require("../config");
const { validar, validarPassword } = require("./validators");
const { e400, e409 } = require("./errors");

const REGLAS_USUARIO = {
  nombre_usuario: { req: true, tipo: "usuario", max: 60 },
  correo: { req: true, tipo: "email", max: 254 },
};

/** Valida y normaliza datos de usuario + contraseña. Acepta `password` o `contrasena_hash` (compatibilidad UI). */
function validarNuevoUsuario(body) {
  const { datos, errores } = validar(body, REGLAS_USUARIO);
  const password = body && (body.password || body.contrasena_hash);
  const ep = validarPassword(password);
  if (ep.length) errores.push(`La contraseña debe tener ${ep.join(", ")}`);
  if (errores.length) throw e400(errores.join("; "));
  return { ...datos, password };
}

async function crearUsuario(client, { nombre_usuario, correo, password }) {
  const dup = await client.query(
    "SELECT nombre_usuario, correo FROM usuarios WHERE lower(nombre_usuario) = lower($1) OR lower(correo) = lower($2)",
    [nombre_usuario, correo]
  );
  if (dup.rowCount) throw e409("El nombre de usuario o correo ya está registrado");
  const hash = await bcrypt.hash(password, config.bcryptRounds);
  const r = await client.query(
    "INSERT INTO usuarios (nombre_usuario, contrasena_hash, correo) VALUES ($1, $2, $3) RETURNING id, nombre_usuario, correo, created_at",
    [nombre_usuario, hash, correo]
  );
  return r.rows[0];
}

async function rolValido(client, rolId) {
  if (!/^\d+$/.test(String(rolId || ""))) return false;
  const r = await client.query("SELECT 1 FROM roles WHERE id = $1", [rolId]);
  return r.rowCount > 0;
}

module.exports = { validarNuevoUsuario, crearUsuario, rolValido };
