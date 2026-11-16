const { Pool } = require("pg");
const config = require("./config");

// Sin credenciales embebidas: la cadena de conexión proviene solo del entorno
const pool = new Pool({ connectionString: config.databaseUrl, max: Number(process.env.DB_POOL_MAX || 20) });

async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, transaccion };
