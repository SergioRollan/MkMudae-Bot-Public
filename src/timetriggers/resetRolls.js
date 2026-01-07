require("dotenv").config();
const Utils = require("../extras/Utils");
const { getPool } = require("../database/pool");
const WishlistDAO = require("../dao/WishlistDAO");

async function resetRolls() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const pool = getPool();
  if (!pool) {
    console.error("❌ Pool de base de datos no disponible");
    return;
  }

  const client = await pool.connect();

  try {
    console.log("🔄 Reseteando rolls para todos los usuarios...");
    console.log(`   Hora actual (UTC): ${new Date().toISOString()}`);

    await client.query("BEGIN");

    const ranksData = await Utils.getRanksData();

    let totalUpdated = 0;
    let totalErrors = 0;

    const usersResult = await client.query(
      `SELECT "UserID", "Elo" FROM "User";`
    );
    const users = usersResult.rows;

    console.log(`📊 Procesando ${users.length} usuarios en tabla User...`);

    let updatedUser = 0;
    for (const user of users) {
      try {
        const userElo = user.Elo || 0;
        const userRank = Utils.findRankForElo(ranksData, userElo);
        const rollsToSet = userRank.pulls;

        await client.query(
          `UPDATE "User"
           SET "RollsLeft" = GREATEST(COALESCE("RollsLeft", 0), $1),
               "TrainingsLeft" = $2,
               "trainingsleft1" = 2,
               "trainingsleft2" = 2,
               "trainingsleft3" = 2,
               "trainingsleft4" = 2,
               "trainingsleft5" = 2,
               "trainingsleft6" = 2,
               "trainingsleft7" = 2,
               "trainingsleft8" = 2
           WHERE "UserID" = $3;`,
          [rollsToSet, userRank.training_sessions || 0, user.UserID]
        );
        updatedUser++;

        if (updatedUser % 100 === 0) {
          console.log(
            `✅ Usuario número ${updatedUser} procesado en tabla User`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error procesando usuario ${user.UserID} en tabla User:`,
          error.message
        );
        totalErrors++;
      }
    }

    console.log(`✅ Actualizados ${updatedUser} usuarios en tabla User`);
    totalUpdated += updatedUser;

    const wishlistDAO = new WishlistDAO();
    let wishlistAdjusted = 0;
    let wishlistErrors = 0;

    for (const user of users) {
      try {
        const userElo = user.Elo || 0;
        const userRank = Utils.findRankForElo(ranksData, userElo);
        const maxWishlistSize = userRank.wishlists || 0;

        const result = await wishlistDAO.removeExcessWishlistItems(
          user.UserID,
          maxWishlistSize,
          client
        );

        if (result.removedCount > 0) {
          wishlistAdjusted++;
          if (wishlistAdjusted % 50 === 0) {
            console.log(
              `   Ajustadas ${wishlistAdjusted} wishlists en tabla User`
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Error ajustando wishlist para usuario ${user.UserID} en tabla User:`,
          error.message
        );
        wishlistErrors++;
      }
    }

    if (wishlistAdjusted > 0) {
      console.log(
        `✅ Ajustadas ${wishlistAdjusted} wishlists en tabla User (${wishlistErrors} errores)`
      );
    }

    const usersTestResult = await client.query(
      `SELECT "UserID", "Elo" FROM "UserTest";`
    );
    const usersTest = usersTestResult.rows;

    console.log(
      `📊 Procesando ${usersTest.length} usuarios en tabla UserTest...`
    );

    let updatedUserTest = 0;
    for (const user of usersTest) {
      try {
        const userElo = user.Elo || 0;
        const userRank = Utils.findRankForElo(ranksData, userElo);
        const rollsToSet = userRank.pulls;

        await client.query(
          `UPDATE "UserTest"
           SET "RollsLeft" = GREATEST(COALESCE("RollsLeft", 0), $1),
               "TrainingsLeft" = $2,
               "trainingsleft1" = 2,
               "trainingsleft2" = 2,
               "trainingsleft3" = 2,
               "trainingsleft4" = 2,
               "trainingsleft5" = 2,
               "trainingsleft6" = 2,
               "trainingsleft7" = 2,
               "trainingsleft8" = 2
           WHERE "UserID" = $3;`,
          [rollsToSet, userRank.training_sessions || 0, user.UserID]
        );
        updatedUserTest++;

        if (updatedUserTest % 100 === 0) {
          console.log(
            `✅ Usuario número ${updatedUserTest} procesado en tabla UserTest`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error procesando usuario ${user.UserID} en tabla UserTest:`,
          error.message
        );
        totalErrors++;
      }
    }

    console.log(
      `✅ Actualizados ${updatedUserTest} usuarios en tabla UserTest`
    );
    totalUpdated += updatedUserTest;

    let wishlistAdjustedTest = 0;
    let wishlistErrorsTest = 0;

    for (const user of usersTest) {
      try {
        const userElo = user.Elo || 0;
        const userRank = Utils.findRankForElo(ranksData, userElo);
        const maxWishlistSize = userRank.wishlists || 0;

        const result = await wishlistDAO.removeExcessWishlistItems(
          user.UserID,
          maxWishlistSize,
          client
        );

        if (result.removedCount > 0) {
          wishlistAdjustedTest++;
          if (wishlistAdjustedTest % 50 === 0) {
            console.log(
              `   Ajustadas ${wishlistAdjustedTest} wishlists en tabla UserTest`
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Error ajustando wishlist para usuario ${user.UserID} en tabla UserTest:`,
          error.message
        );
        wishlistErrorsTest++;
      }
    }

    if (wishlistAdjustedTest > 0) {
      console.log(
        `✅ Ajustadas ${wishlistAdjustedTest} wishlists en tabla UserTest (${wishlistErrorsTest} errores)`
      );
    }

    await client.query("COMMIT");

    console.log(`✅ Reset de rolls completado:`);
    console.log(`   - Total procesados: ${totalUpdated} usuarios`);
    console.log(`   - Errores: ${totalErrors}`);

    try {
      Utils.clearTrainedPlayers();
    } catch (e) {
      console.warn(
        "⚠️ No se pudo limpiar trainedPlayers del config (rolls):",
        e?.message
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error reseteando rolls:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { resetRolls };
