require("dotenv").config();
const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn(
        "DATABASE_URL no está definido. Pool de BD no inicializado."
      );
      return null;
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.RAILWAY_ENVIRONMENT
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err, client) => {
      console.error("❌ Error inesperado en cliente del pool:", err);
    });

    console.log("✅ Pool de base de datos inicializado");
  }

  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("✅ Pool de base de datos cerrado");
  }
}

module.exports = { getPool, closePool };
