require("dotenv").config();
const { getPool } = require("../database/pool");

async function rechargeEnergy() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const pool = getPool();
  if (!pool) {
    console.error("❌ Pool de base de datos no disponible");
    return;
  }

  const client = await pool.connect();

  try {
    console.log("🔄 Recargando energía para todos los jugadores...");
    console.log(`   Hora actual (UTC): ${new Date().toISOString()}`);

    await client.query("BEGIN");

    const resultPlayer = await client.query(
      `UPDATE "Player" 
       SET "energy" = LEAST(100, COALESCE("energy", 100) + 5)
       WHERE COALESCE("energy", 100) < 100;`
    );
    console.log(
      `✅ Actualizados ${resultPlayer.rowCount} jugadores en tabla Player`
    );

    const resultPlayerTest = await client.query(
      `UPDATE "PlayerTest" 
       SET "energy" = LEAST(100, COALESCE("energy", 100) + 5)
       WHERE COALESCE("energy", 100) < 100;`
    );
    console.log(
      `✅ Actualizados ${resultPlayerTest.rowCount} jugadores en tabla PlayerTest`
    );

    await client.query("COMMIT");

    console.log(`✅ Recarga de energía completada:`);
    console.log(
      `   - Total actualizados: ${
        resultPlayer.rowCount + resultPlayerTest.rowCount
      } jugadores`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error recargando energía:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { rechargeEnergy };
