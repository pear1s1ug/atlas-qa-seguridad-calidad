/** Validación y saneamiento de entradas del lado servidor (RF-4.3 / NFR-SEG-5 / restricción 2.4). */
const config = require("../config");

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const USUARIO_RE = /^[a-zA-Z0-9._-]{3,60}$/;
const TELEFONO_RE = /^\+?[0-9][0-9\s-]{6,18}$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function validarPassword(pwd, minLength = config.passwordMinLength) {
  const errores = [];
  if (typeof pwd !== "string" || pwd.length < minLength) errores.push(`al menos ${minLength} caracteres`);
  if (typeof pwd === "string") {
    if (pwd.length > 128) errores.push("máximo 128 caracteres");
    if (!/[A-Z]/.test(pwd)) errores.push("una letra mayúscula");
    if (!/[a-z]/.test(pwd)) errores.push("una letra minúscula");
    if (!/[0-9]/.test(pwd)) errores.push("un número");
    if (!/[^A-Za-z0-9]/.test(pwd)) errores.push("un símbolo");
  }
  return errores;
}

function validarEmail(v) {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
}

function limpiarRut(rut) {
  return String(rut).replace(/[.\s]/g, "").toUpperCase();
}

/** Valida RUT chileno con dígito verificador (módulo 11). */
function validarRut(rut) {
  if (typeof rut !== "string") return false;
  const r = limpiarRut(rut);
  const m = r.match(/^(\d{7,8})-?([\dK])$/);
  if (!m) return false;
  const cuerpo = m[1];
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (suma % 11);
  const dv = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return dv === m[2];
}

function validarTelefono(v) {
  return typeof v === "string" && TELEFONO_RE.test(v.trim());
}

function validarFecha(v) {
  if (typeof v !== "string" || !FECHA_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function validarUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function esIdValido(v) {
  return /^[1-9]\d{0,17}$/.test(String(v));
}

/**
 * Validador declarativo simple. reglas: { campo: { req, max, tipo, min, enum } }
 * Retorna { datos, errores } con strings recortados (trim).
 */
function validar(body, reglas) {
  const datos = {};
  const errores = [];
  for (const [campo, r] of Object.entries(reglas)) {
    let v = body ? body[campo] : undefined;
    if (typeof v === "string") v = v.trim();
    const vacio = v === undefined || v === null || v === "";
    if (vacio) {
      if (r.req) errores.push(`${campo} es obligatorio`);
      datos[campo] = r.defecto !== undefined ? r.defecto : null;
      continue;
    }
    if (r.tipo === "bool") {
      datos[campo] = v === true || v === "true";
      continue;
    }
    if (typeof v !== "string" && typeof v !== "number") {
      errores.push(`${campo} tiene un tipo inválido`);
      continue;
    }
    v = String(v);
    if (r.max && v.length > r.max) errores.push(`${campo} excede ${r.max} caracteres`);
    if (r.tipo === "email" && !validarEmail(v)) errores.push(`${campo} no es un correo válido`);
    if (r.tipo === "rut" && !validarRut(v)) errores.push(`${campo} no es un RUT válido`);
    if (r.tipo === "telefono" && !validarTelefono(v)) errores.push(`${campo} no es un teléfono válido`);
    if (r.tipo === "fecha" && !validarFecha(v)) errores.push(`${campo} debe tener formato AAAA-MM-DD`);
    if (r.tipo === "url" && !validarUrl(v)) errores.push(`${campo} debe ser una URL http(s) válida`);
    if (r.tipo === "usuario" && !USUARIO_RE.test(v)) errores.push(`${campo} solo admite letras, números, punto, guion y guion bajo (3-60)`);
    if (r.tipo === "entero") {
      const n = Number(v);
      if (!Number.isInteger(n) || (r.min !== undefined && n < r.min) || (r.maxValor !== undefined && n > r.maxValor)) {
        errores.push(`${campo} fuera de rango`);
      }
    }
    if (r.enum && !r.enum.includes(v)) errores.push(`${campo} tiene un valor no permitido`);
    datos[campo] = v;
  }
  return { datos, errores };
}

module.exports = {
  validarPassword,
  validarEmail,
  validarRut,
  validarTelefono,
  validarFecha,
  validarUrl,
  esIdValido,
  validar,
};
