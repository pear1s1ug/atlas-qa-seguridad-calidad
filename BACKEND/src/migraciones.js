/**
 * Migraciones idempotentes de esquema y datos (NFR-DIS-2: migración de datos segura).
 * Se ejecutan al iniciar la API bajo un advisory lock para evitar ejecuciones concurrentes.
 */
const bcrypt = require("bcryptjs");
const { pool } = require("./db");
const config = require("./config");
const { cifrar, PREFIJO } = require("./lib/cifrado");

const DDL = [
  // RF-4.2: eliminación lógica de clientes
  "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS eliminado_en timestamptz",
  // El correo de cliente era único global (fuga entre empresas): pasa a ser único por empresa
  "ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_correo_key",
  "CREATE UNIQUE INDEX IF NOT EXISTS clientes_empresa_correo_uq ON clientes (empresa_id, lower(correo)) WHERE eliminado_en IS NULL",
  // RB-2: auditoría aislada por empresa
  "ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS empresa_id bigint",
  // RF-5.3: documentos en storage interno con referencia en BD
  "ALTER TABLE documentos_contrato ADD COLUMN IF NOT EXISTS ruta text",
  "ALTER TABLE documentos_contrato ADD COLUMN IF NOT EXISTS nombre_original text",
  "ALTER TABLE documentos_contrato ADD COLUMN IF NOT EXISTS mime_type text",
  "ALTER TABLE documentos_contrato ADD COLUMN IF NOT EXISTS tamano bigint",
  "ALTER TABLE documentos_contrato ALTER COLUMN document DROP NOT NULL",
  // RF-1.2: revocación de tokens y refresh tokens
  `CREATE TABLE IF NOT EXISTS tokens_revocados (
     jti text PRIMARY KEY, expira_en timestamptz NOT NULL, created_at timestamptz DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
     id bigserial PRIMARY KEY, token_hash text UNIQUE NOT NULL, usuario_id bigint NOT NULL,
     empresa_id bigint NOT NULL, expira_en timestamptz NOT NULL, revocado_en timestamptz,
     created_at timestamptz DEFAULT now())`,
  // RF-5.5: enlaces para compartir documentos
  `CREATE TABLE IF NOT EXISTS enlaces_compartidos (
     id bigserial PRIMARY KEY, contrato_id bigint NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
     token_hash text UNIQUE NOT NULL, expira_en timestamptz NOT NULL, revocado_en timestamptz,
     creado_por text, created_at timestamptz DEFAULT now())`,
  // NFR-PERF-1: índices para consultas multi-tenant
  "CREATE INDEX IF NOT EXISTS clientes_empresa_idx ON clientes (empresa_id)",
  "CREATE INDEX IF NOT EXISTS contratos_cliente_idx ON contratos (cliente_id)",
  "CREATE INDEX IF NOT EXISTS empresa_usuarios_usuario_idx ON empresa_usuarios (usuario_id)",
  "CREATE INDEX IF NOT EXISTS empresa_usuarios_empresa_idx ON empresa_usuarios (empresa_id)",
  "CREATE INDEX IF NOT EXISTS auditoria_empresa_idx ON auditoria (empresa_id, id DESC)",
  "CREATE INDEX IF NOT EXISTS documentos_contrato_idx ON documentos_contrato (contract_id, id DESC)",
];

async function migrar() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(424242)");
    for (const sql of DDL) await client.query(sql);

    // NFR-SEG-2: re-hash de contraseñas heredadas en texto plano
    const planos = await client.query("SELECT id, contrasena_hash FROM usuarios WHERE contrasena_hash !~ '^\\$2[aby]\\$'");
    for (const u of planos.rows) {
      const h = await bcrypt.hash(u.contrasena_hash, config.bcryptRounds);
      await client.query("UPDATE usuarios SET contrasena_hash = $1 WHERE id = $2", [h, u.id]);
    }

    // NFR-SEG-3: cifrado de datos bancarios heredados
    const cuentas = await client.query(
      "SELECT id, numero_cuenta FROM clientes WHERE numero_cuenta IS NOT NULL AND numero_cuenta <> '' AND numero_cuenta NOT LIKE $1",
      [`${PREFIJO}%`]
    );
    for (const c of cuentas.rows) {
      await client.query("UPDATE clientes SET numero_cuenta = $1 WHERE id = $2", [cifrar(c.numero_cuenta), c.id]);
    }

    // Limpieza de tokens revocados expirados
    await client.query("DELETE FROM tokens_revocados WHERE expira_en < now()");
  } finally {
    await client.query("SELECT pg_advisory_unlock(424242)").catch(() => {});
    client.release();
  }
}

module.exports = { migrar };
