require("dotenv").config();
const Utils = require("../extras/Utils");
const { getPool } = require("../database/pool");

async function resetCanClaim() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const pool = getPool();
  if (!pool) {
    console.error("❌ Pool de base de datos no disponible");
    return;
  }

  const client = await pool.connect();

  try {
    console.log("🔄 Reseteando canClaim para todos los usuarios...");
    console.log(`   Hora actual (UTC): ${new Date().toISOString()}`);

    await client.query("BEGIN");
    const resultUser = await client.query(
      `UPDATE "User" SET "CanClaim" = true;`
    );
    console.log(
      `✅ Actualizados ${resultUser.rowCount} usuarios en tabla User`
    );

    const resultUserTest = await client.query(
      `UPDATE "UserTest" SET "CanClaim" = true;`
    );
    console.log(
      `✅ Actualizados ${resultUserTest.rowCount} usuarios en tabla UserTest`
    );

    await client.query("COMMIT");

    try {
      Utils.clearTrainedPlayers();
    } catch (e) {
      console.warn(
        "⚠️ No se pudo limpiar trainedPlayers del config (test):",
        e?.message
      );
    }

    console.log(`✅ Reset de canClaim completado:`);
    console.log(
      `   - Total actualizados: ${
        resultUser.rowCount + resultUserTest.rowCount
      } usuarios`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error reseteando canClaim:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { resetCanClaim };
