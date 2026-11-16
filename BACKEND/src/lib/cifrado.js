/** Cifrado de datos sensibles en reposo con AES-256-GCM (NFR-SEG-3). */
const crypto = require("crypto");
const config = require("../config");

const PREFIJO = "enc:v1:";
const KEY = Buffer.from(config.dataKey, "hex");
if (KEY.length !== 32) throw new Error("DATA_ENCRYPTION_KEY debe ser de 32 bytes en hexadecimal (64 caracteres)");

function cifrar(texto) {
  if (texto === null || texto === undefined || texto === "") return texto;
  if (String(texto).startsWith(PREFIJO)) return texto;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", KEY, iv, { authTagLength: 16 });
  const ct = Buffer.concat([c.update(String(texto), "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return `${PREFIJO}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

function descifrar(valor) {
  if (typeof valor !== "string" || !valor.startsWith(PREFIJO)) return valor;
  const [iv, tag, ct] = valor.slice(PREFIJO.length).split(":").map((p) => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv, { authTagLength: 16 });
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

function sha256(v) {
  return crypto.createHash("sha256").update(String(v)).digest("hex");
}

module.exports = { cifrar, descifrar, sha256, PREFIJO };
