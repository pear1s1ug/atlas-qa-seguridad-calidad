// Variables por defecto del ambiente de pruebas (docker compose local)
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:15432/atlas";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "0d1d8132f0fde5beabb417b434ff10f1cae8635a461686b0f46ac9c2bbfbd0e8";
process.env.TZ = process.env.TZ || "America/Santiago";
