/**
 * Configuración centralizada. Falla rápido (fail-fast) si faltan secretos críticos:
 * nunca se usan claves por defecto embebidas en el código (NFR-SEG-6 / OWASP ASVS V6).
 */
require("dotenv").config();

function requerido(nombre, { minLength = 1 } = {}) {
  const v = process.env[nombre];
  if (!v || v.length < minLength) {
    throw new Error(`Configuración inválida: la variable ${nombre} es obligatoria (mín. ${minLength} caracteres)`);
  }
  return v;
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: requerido("DATABASE_URL"),
  jwtSecret: requerido("JWT_SECRET", { minLength: 32 }),
  dataKey: requerido("DATA_ENCRYPTION_KEY", { minLength: 64 }),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenDias: Number(process.env.REFRESH_TOKEN_DIAS || 7),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH || 12),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3350,http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  publicApiUrl: process.env.PUBLIC_API_URL || "http://localhost:4450",
  zonaHoraria: process.env.APP_TZ || "America/Santiago",
  maxArchivoMb: Number(process.env.MAX_ARCHIVO_MB || 10),
  loginMaxIntentos: Number(process.env.LOGIN_MAX_INTENTOS || 5),
  registroMaxPorVentana: Number(process.env.REGISTRO_MAX || 30),
};

module.exports = config;
