// Variables por defecto del ambiente de pruebas (docker compose local)
process.env.NODE_ENV = process.env.NODE_ENV || "test";
// Toma la contraseña de la BD del .env raíz generado por scripts/generar-env.sh (si existe)
if (!process.env.DATABASE_URL) {
  const fs = require("fs");
  const path = require("path");
  const envRaiz = path.join(__dirname, "..", "..", ".env");
  let pwd = "postgres";
  if (fs.existsSync(envRaiz)) {
    const m = fs.readFileSync(envRaiz, "utf8").match(/^POSTGRES_PASSWORD=(.*)$/m);
    if (m) pwd = m[1].trim();
  }
  process.env.DATABASE_URL = `postgres://postgres:${pwd}@localhost:15432/atlas`;
}
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "0d1d8132f0fde5beabb417b434ff10f1cae8635a461686b0f46ac9c2bbfbd0e8";
process.env.TZ = process.env.TZ || "America/Santiago";
process.env.DATA_ENCRYPTION_KEY =
  process.env.DATA_ENCRYPTION_KEY || "9f2c4e6a8b0d1f3a5c7e9b1d3f5a7c9e0b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a";
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || "10";
process.env.REGISTRO_MAX = process.env.REGISTRO_MAX || "10000";
