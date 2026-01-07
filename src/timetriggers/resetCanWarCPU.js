require("dotenv").config();
const { getPool } = require("../database/pool");

async function resetCanWarCPU() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const pool = getPool();
  if (!pool) {
    console.error("❌ Pool de base de datos no disponible");
    return;
  }

  const client = await pool.connect();

  try {
    console.log("🔄 Reseteando canWarCPU para todos los usuarios...");
    console.log(`   Hora actual (UTC): ${new Date().toISOString()}`);

    await client.query("BEGIN");

    const resultUser = await client.query(
      `UPDATE "User" SET "canwarcpu" = true;`
    );
    console.log(
      `✅ Actualizados ${resultUser.rowCount} usuarios en tabla User`
    );

    const resultUserTest = await client.query(
      `UPDATE "UserTest" SET "canwarcpu" = true;`
    );
    console.log(
      `✅ Actualizados ${resultUserTest.rowCount} usuarios en tabla UserTest`
    );

    await client.query("COMMIT");

    console.log(`✅ Reset de canWarCPU completado:`);
    console.log(
      `   - Total actualizados: ${
        resultUser.rowCount + resultUserTest.rowCount
      } usuarios`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error reseteando canWarCPU:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { resetCanWarCPU };
