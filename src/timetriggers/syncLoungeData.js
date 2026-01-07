require("dotenv").config();
const Utils = require("../extras/Utils");
const { getPool } = require("../database/pool");

async function syncLoungeData() {
  const pool = getPool();
  if (!pool) {
    console.error("❌ Pool de base de datos no disponible");
    return;
  }

  try {
    console.log("🔍 Obteniendo datos de la API de Lounge MK Central...");

    const response = await fetch(
      "https://lounge.mkcentral.com/api/player/list?game=mkworld"
    );

    if (!response.ok) {
      throw new Error(`Error en la respuesta de la API: ${response.status}`);
    }

    const data = await response.json();
    const players = data.players || [];

    if (players.length === 0) {
      console.log("⚠️  No se encontraron jugadores en la respuesta de la API");
      return;
    }

    console.log(`✅ Se obtuvieron ${players.length} jugadores de la API`);

    let processed = 0;
    let errors = 0;
    let playersUpdated = 0;

    const BATCH_SIZE = 10;

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        for (const player of batch) {
          try {
            const result = await processPlayer(client, player);
            processed++;
            playersUpdated += result.playersUpdated;

            if (processed % 100 === 0)
              console.log(
                `✅ Jugador numero ${processed} procesado correctamente`
              );
          } catch (error) {
            console.error(
              `❌ Error procesando jugador ${player.id} (${player.name}):`,
              error.message
            );
            errors++;
          }
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`❌ Error en lote de sincronización:`, error);
        errors += batch.length;
      } finally {
        client.release();
      }

      if (i + BATCH_SIZE < players.length) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    try {
      Utils.clearTrainedPlayers();
    } catch (e) {
      console.warn(
        "⚠️ No se pudo limpiar trainedPlayers del config:",
        e?.message
      );
    }

    console.log(`✅ Sincronización completada:`);
    console.log(`   - Procesados: ${processed} jugadores en Lounge`);
    console.log(`   - Players actualizados: ${playersUpdated} tuplas`);
    console.log(`   - Errores: ${errors}`);
  } catch (error) {
    console.error("❌ Error sincronizando datos de Lounge:", error);
    throw error;
  }
}

async function processPlayer(client, player) {
  const loungeId = player.id;
  const discordId = player.discordId || null;
  const name = player.name || null;
  const mmr = player.mmr ?? -1;
  const peakMmr = player.mmr ?? -1;
  const eventsPlayed = player.eventsPlayed || 0;

  const upsertQuery = `
    INSERT INTO "Lounge" (
      "lounge_id",
      "discord_id",
      "name",
      "mmr",
      "peak_mmr",
      "events_played"
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT ("lounge_id")
    DO UPDATE SET
      "discord_id" = EXCLUDED."discord_id",
      "name" = EXCLUDED."name",
      "mmr" = EXCLUDED."mmr",
      "peak_mmr" = GREATEST("Lounge"."peak_mmr", EXCLUDED."mmr"),
      "events_played" = EXCLUDED."events_played"
  `;

  await client.query(upsertQuery, [
    loungeId,
    discordId,
    name,
    mmr,
    peakMmr,
    eventsPlayed,
  ]);

  let playersUpdated = 0;

  if (name) {
    const playerTableName = global.DEBUG ? "Player" : "PlayerTest";
    const updateResult = await client.query(
      `UPDATE "${playerTableName}" SET "Alias" = $1 WHERE "LoungeID" = $2;`,
      [name, loungeId]
    );
    if (updateResult.rowCount > 0) {
      playersUpdated = updateResult.rowCount;
    }
  }

  if (!(await existsInitialStatsForPlayer(client, loungeId))) {
    await createInitialStatsForPlayer(client, loungeId);
  }

  return { playersUpdated };
}

async function existsInitialStatsForPlayer(client, loungeId) {
  const result = await client.query(
    `SELECT * FROM "InitialStats" WHERE "LoungeID" = $1 LIMIT 1;`,
    [loungeId]
  );
  return result.rowCount > 0;
}

async function createInitialStatsForPlayer(client, loungeId) {
  const attributes = Utils.generateRandomAttributes();

  const insertInitialStatsQuery = `
    INSERT INTO "InitialStats" (
      "LoungeID",
      "Lines",
      "Consistency",
      "ItemUsage",
      "Precision",
      "Communication",
      "Mental",
      "GameSense",
      "Shockfinding"
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9
    );
  `;

  await client.query(insertInitialStatsQuery, [
    loungeId,
    attributes.Lines,
    attributes.Consistency,
    attributes.ItemUsage,
    attributes.Precision,
    attributes.Communication,
    attributes.Mental,
    attributes.GameSense,
    attributes.Shockfinding,
  ]);
}

module.exports = { syncLoungeData };
