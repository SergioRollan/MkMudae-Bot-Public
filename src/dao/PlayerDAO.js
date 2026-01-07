const DAO = require("./DAO");

class PlayerDAO extends DAO {
  constructor() {
    const tableName = global.DEBUG ? "Player" : "PlayerTest";
    super(tableName);
  }

  async getOrCreatePlayerFromLounge(loungePlayer, discordServerId = null) {
    try {
      console.log(
        "🔍 LoungePlayer recibido:",
        JSON.stringify(loungePlayer, null, 2)
      );

      const loungeId =
        loungePlayer.lounge_id ||
        loungePlayer.LoungeID ||
        loungePlayer.id ||
        loungePlayer.loungeId;

      if (!loungeId) {
        console.error(
          "❌ No se encontró lounge_id en loungePlayer:",
          loungePlayer
        );
        throw new Error("lounge_id no encontrado en loungePlayer");
      }

      console.log(
        "🔍 Buscando jugador con LoungeID:",
        loungeId,
        "en servidor:",
        discordServerId
      );

      let existing;
      if (discordServerId) {
        const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";
        const userTableName = global.DEBUG ? "User" : "UserTest";

        existing = await this.getClient().query(
          `SELECT DISTINCT p.*
           FROM "${this.tableName}" p
           WHERE p."LoungeID" = $1
           AND EXISTS (
             SELECT 1
             FROM "${ownershipTableName}" o
             INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
             WHERE o."PlayerID" = p."IDPlayer"
             AND u."DiscordServerID" = $2
           )
           LIMIT 1;`,
          [loungeId, discordServerId]
        );
      } else {
        existing = await this.getClient().query(
          `SELECT * FROM "${this.tableName}" WHERE "LoungeID" = $1 LIMIT 1;`,
          [loungeId]
        );
      }

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      const playerName = loungePlayer.name || loungePlayer.Name || null;
      console.log(
        "🔍 Creando nuevo jugador con LoungeID:",
        loungeId,
        "y Alias:",
        playerName
      );

      let init = {
        Lines: 0,
        Consistency: 0,
        ItemUsage: 0,
        Precision: 0,
        Communication: 0,
        Mental: 0,
        GameSense: 0,
        Shockfinding: 0,
      };

      try {
        const initRes = await this.getClient().query(
          `SELECT "Lines","Consistency","ItemUsage","Precision","Communication","Mental","GameSense","Shockfinding"
           FROM "InitialStats" WHERE "LoungeID" = $1 LIMIT 1;`,
          [loungeId]
        );
        if (initRes.rows.length > 0) {
          const r = initRes.rows[0];
          init = {
            Lines: Number(r.Lines ?? 0),
            Consistency: Number(r.Consistency ?? 0),
            ItemUsage: Number(r.ItemUsage ?? 0),
            Precision: Number(r.Precision ?? 0),
            Communication: Number(r.Communication ?? 0),
            Mental: Number(r.Mental ?? 0),
            GameSense: Number(r.GameSense ?? 0),
            Shockfinding: Number(r.Shockfinding ?? 0),
          };
        }
      } catch (e) {
        console.warn(
          "⚠️ No se pudieron leer InitialStats, usando 0s:",
          e?.message
        );
      }

      const newPlayer = {
        LoungeID: loungeId,
        Alias: playerName,
        Lines: init.Lines,
        Consistency: init.Consistency,
        ItemUsage: init.ItemUsage,
        Precision: init.Precision,
        Communication: init.Communication,
        Mental: init.Mental,
        GameSense: init.GameSense,
        Shockfinding: init.Shockfinding,
      };

      const result = await this.insert(newPlayer);
      console.log("✅ Nuevo jugador creado:", result);

      if (!result || !result.IDPlayer) {
        console.error(
          "❌ Error: El insert no retornó un jugador válido:",
          result
        );

        const verifyResult = await this.getClient().query(
          `SELECT * FROM "${this.tableName}" WHERE "LoungeID" = $1;`,
          [loungeId]
        );
        if (verifyResult.rows.length > 0) {
          console.log(
            "✅ Jugador encontrado después del insert:",
            verifyResult.rows[0]
          );
          return verifyResult.rows[0];
        }
        throw new Error(
          "El insert no retornó un jugador válido y no se pudo encontrar en la BD"
        );
      }

      return result;
    } catch (err) {
      console.error("❌ Error obteniendo o creando jugador desde Lounge:", err);
      throw err;
    }
  }

  async getPlayersByIds(playerIds = []) {
    try {
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        return [];
      }

      const sanitizedIds = playerIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value));

      if (sanitizedIds.length === 0) {
        return [];
      }

      const result = await this.getClient().query(
        `SELECT p.*, l."name" AS "LoungeName", l."mmr" AS "MMR", l."peak_mmr" AS "PeakMMR", l."events_played" AS "Events"
         FROM "${this.tableName}" p
         LEFT JOIN "Lounge" l ON p."LoungeID" = l."lounge_id"
         WHERE p."IDPlayer" = ANY($1::int[])`,
        [sanitizedIds]
      );

      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo jugadores por IDs:", err);
      throw err;
    }
  }

  async getPlayerById(playerId) {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "IDPlayer" = $1;`,
        [playerId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo jugador por ID:", err);
      throw err;
    }
  }

  async getPlayerByLoungeId(loungeId) {
    try {
      const numericId = Number(loungeId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return null;
      }
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "LoungeID" = $1 LIMIT 1;`,
        [numericId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo jugador por LoungeID:", err);
      throw err;
    }
  }

  async updatePlayerAttributes(playerId, newValues = {}) {
    try {
      const allowed = [
        "Lines",
        "Consistency",
        "ItemUsage",
        "Precision",
        "Communication",
        "Mental",
        "GameSense",
        "Shockfinding",
      ];
      const updates = [];
      const params = [];
      let idx = 1;
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(newValues, key)) {
          updates.push(`"${key}" = $${idx++}`);
          params.push(Number(newValues[key] ?? 0));
        }
      }
      if (updates.length === 0) {
        return null;
      }
      params.push(Number(playerId));
      const sql = `UPDATE "${this.tableName}" SET ${updates.join(
        ", "
      )} WHERE "IDPlayer" = $${idx} RETURNING *;`;
      const result = await this.getClient().query(sql, params);
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error actualizando atributos del jugador:", err);
      throw err;
    }
  }

  async updatePlayerEnergy(playerId, energy) {
    try {
      const numericId = Number(playerId);
      const numericEnergy = Number(energy);

      if (!Number.isInteger(numericId) || numericId <= 0) {
        return null;
      }

      const clampedEnergy = Math.max(40, Math.min(100, numericEnergy));

      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "energy" = $1 WHERE "IDPlayer" = $2 RETURNING *;`,
        [clampedEnergy, numericId]
      );

      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error actualizando energía del jugador:", err);
      throw err;
    }
  }

  async reduceEnergyForPlayers(playerIds, energyReduction) {
    try {
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        return 0;
      }

      const sanitizedIds = playerIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);

      if (sanitizedIds.length === 0) {
        return 0;
      }

      const reduction = Number(energyReduction) || 0;

      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" 
         SET "energy" = GREATEST(40, COALESCE("energy", 100) - $1)
         WHERE "IDPlayer" = ANY($2::int[]) 
         RETURNING "IDPlayer";`,
        [reduction, sanitizedIds]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error reduciendo energía de jugadores:", err);
      throw err;
    }
  }

  async rechargeAllPlayersEnergy() {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" 
         SET "energy" = LEAST(100, COALESCE("energy", 100) + 5)
         WHERE COALESCE("energy", 100) < 100;`
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error recargando energía de jugadores:", err);
      throw err;
    }
  }

  async getInitialStatsByLoungeId(loungeId) {
    try {
      const numericId = Number(loungeId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return null;
      }
      const result = await this.getClient().query(
        `SELECT "Lines","Consistency","ItemUsage","Precision","Communication","Mental","GameSense","Shockfinding"
         FROM "InitialStats" WHERE "LoungeID" = $1 LIMIT 1;`,
        [numericId]
      );
      if (result.rows.length > 0) {
        const r = result.rows[0];
        return {
          Lines: Number(r.Lines ?? 0),
          Consistency: Number(r.Consistency ?? 0),
          ItemUsage: Number(r.ItemUsage ?? 0),
          Precision: Number(r.Precision ?? 0),
          Communication: Number(r.Communication ?? 0),
          Mental: Number(r.Mental ?? 0),
          GameSense: Number(r.GameSense ?? 0),
          Shockfinding: Number(r.Shockfinding ?? 0),
        };
      }
      return null;
    } catch (err) {
      console.error("❌ Error obteniendo InitialStats por LoungeID:", err);
      return null;
    }
  }

  async getPlayerByLoungeIdInServer(loungeId, discordServerId) {
    try {
      const numericId = Number(loungeId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return null;
      }

      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `SELECT DISTINCT p.*
         FROM "${this.tableName}" p
         INNER JOIN "${ownershipTableName}" o ON p."IDPlayer" = o."PlayerID"
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE p."LoungeID" = $1 AND u."DiscordServerID" = $2
         LIMIT 1;`,
        [numericId, discordServerId]
      );

      return result.rows[0] || null;
    } catch (err) {
      console.error(
        "❌ Error obteniendo jugador por LoungeID en servidor:",
        err
      );
      throw err;
    }
  }

  async getPlayerByIdInServer(playerId, discordServerId) {
    try {
      const numericId = Number(playerId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return null;
      }

      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `SELECT DISTINCT p.*, l."name" AS "LoungeName", l."mmr" AS "MMR", l."peak_mmr" AS "PeakMMR", l."events_played" AS "Events"
         FROM "${this.tableName}" p
         LEFT JOIN "Lounge" l ON p."LoungeID" = l."lounge_id"
         INNER JOIN "${ownershipTableName}" o ON p."IDPlayer" = o."PlayerID"
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE p."IDPlayer" = $1 AND u."DiscordServerID" = $2
         LIMIT 1;`,
        [numericId, discordServerId]
      );

      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo jugador por ID en servidor:", err);
      throw err;
    }
  }

  async getPlayersByIdsInServer(playerIds = [], discordServerId) {
    try {
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        return [];
      }

      const sanitizedIds = playerIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value));

      if (sanitizedIds.length === 0) {
        return [];
      }

      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `SELECT DISTINCT p.*, l."name" AS "LoungeName", l."mmr" AS "MMR", l."peak_mmr" AS "PeakMMR", l."events_played" AS "Events"
         FROM "${this.tableName}" p
         LEFT JOIN "Lounge" l ON p."LoungeID" = l."lounge_id"
         INNER JOIN "${ownershipTableName}" o ON p."IDPlayer" = o."PlayerID"
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE p."IDPlayer" = ANY($1::int[]) AND u."DiscordServerID" = $2`,
        [sanitizedIds, discordServerId]
      );

      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo jugadores por IDs en servidor:", err);
      throw err;
    }
  }

  async getPlayerIdsByServer(discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `SELECT DISTINCT p."IDPlayer"
         FROM "${this.tableName}" p
         INNER JOIN "${ownershipTableName}" o ON p."IDPlayer" = o."PlayerID"
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE u."DiscordServerID" = $1;`,
        [discordServerId]
      );

      return result.rows.map((row) => row.IDPlayer);
    } catch (err) {
      console.error("❌ Error obteniendo PlayerIDs por servidor:", err);
      throw err;
    }
  }

  async deletePlayersByServer(discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" p
         WHERE p."IDPlayer" IN (
           SELECT p2."IDPlayer"
           FROM "${this.tableName}" p2
           INNER JOIN "${ownershipTableName}" o ON p2."IDPlayer" = o."PlayerID"
           INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
           WHERE u."DiscordServerID" = $1
           AND NOT EXISTS (
             SELECT 1
             FROM "${ownershipTableName}" o2
             INNER JOIN "${userTableName}" u2 ON o2."UserID" = u2."UserID"
             WHERE o2."PlayerID" = p2."IDPlayer"
             AND u2."DiscordServerID" != $1
           )
         );`,
        [discordServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error eliminando players por servidor:", err);
      throw err;
    }
  }

  async resetPlayerStatsByServer(discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" p
         SET
           "Lines" = COALESCE(i."Lines", 0),
           "Consistency" = COALESCE(i."Consistency", 0),
           "ItemUsage" = COALESCE(i."ItemUsage", 0),
           "Precision" = COALESCE(i."Precision", 0),
           "Communication" = COALESCE(i."Communication", 0),
           "Mental" = COALESCE(i."Mental", 0),
           "GameSense" = COALESCE(i."GameSense", 0),
           "Shockfinding" = COALESCE(i."Shockfinding", 0)
         FROM "InitialStats" i
         WHERE p."LoungeID" = i."LoungeID"
         AND p."IDPlayer" IN (
           SELECT DISTINCT o."PlayerID"
           FROM "${ownershipTableName}" o
           INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
           WHERE u."DiscordServerID" = $1
         );`,
        [discordServerId]
      );

      return {
        success: true,
        playersReset: result.rowCount || 0,
      };
    } catch (err) {
      console.error("❌ Error reseteando stats de players por servidor:", err);
      return {
        success: false,
        playersReset: 0,
        error: err.message,
      };
    }
  }

  async deleteOrphanedPlayers(playerIds, excludeServerId = null) {
    try {
      if (!playerIds || playerIds.length === 0) {
        return 0;
      }

      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";
      const userTableName = global.DEBUG ? "User" : "UserTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}"
         WHERE "IDPlayer" = ANY($1::int[])
         AND "IDPlayer" NOT IN (
           SELECT DISTINCT o."PlayerID"
           FROM "${ownershipTableName}" o
           INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
           WHERE u."DiscordServerID" != $2
         );`,
        [playerIds, excludeServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error eliminando players huérfanos:", err);
      throw err;
    }
  }

  async getPlayersByServer(discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const ownershipTableName = global.DEBUG ? "Ownership" : "OwnershipTest";

      const result = await this.getClient().query(
        `SELECT DISTINCT p."IDPlayer", p."LoungeID"
         FROM "${this.tableName}" p
         INNER JOIN "${ownershipTableName}" o ON p."IDPlayer" = o."PlayerID"
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE u."DiscordServerID" = $1;`,
        [discordServerId]
      );

      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo players por servidor:", err);
      throw err;
    }
  }

  async updatePlayerStatsFromInitialStats(playerId, initialStats) {
    try {
      if (!initialStats) {
        return await this.updatePlayerAttributes(playerId, {
          Lines: 0,
          Consistency: 0,
          ItemUsage: 0,
          Precision: 0,
          Communication: 0,
          Mental: 0,
          GameSense: 0,
          Shockfinding: 0,
        });
      }

      return await this.updatePlayerAttributes(playerId, {
        Lines: initialStats.Lines || 0,
        Consistency: initialStats.Consistency || 0,
        ItemUsage: initialStats.ItemUsage || 0,
        Precision: initialStats.Precision || 0,
        Communication: initialStats.Communication || 0,
        Mental: initialStats.Mental || 0,
        GameSense: initialStats.GameSense || 0,
        Shockfinding: initialStats.Shockfinding || 0,
      });
    } catch (err) {
      console.error(
        "❌ Error actualizando stats del player desde InitialStats:",
        err
      );
      throw err;
    }
  }

  async deletePlayer(playerId) {
    try {
      const numericId = Number(playerId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return false;
      }

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" WHERE "IDPlayer" = $1;`,
        [numericId]
      );

      return result.rowCount > 0;
    } catch (err) {
      console.error("❌ Error eliminando jugador:", err);
      throw err;
    }
  }
}

module.exports = PlayerDAO;
