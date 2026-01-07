const DAO = require("./DAO");

class OwnershipDAO extends DAO {
  constructor() {
    const tableName = global.DEBUG ? "Ownership" : "OwnershipTest";
    super(tableName);
  }

  async createOwnership(userId, playerId) {
    try {
      const existing = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [userId, playerId]
      );

      if (existing.rows.length > 0) {
        return {
          success: false,
          error: "already_owned",
          ownership: existing.rows[0],
        };
      }

      const result = await this.getClient().query(
        `INSERT INTO "${this.tableName}" ("UserID", "PlayerID", "AcquisitionDate") VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *;`,
        [userId, playerId]
      );

      return {
        success: true,
        ownership: result.rows[0],
      };
    } catch (err) {
      console.error("❌ Error creando ownership:", err);
      throw err;
    }
  }

  async getUserOwnedPlayers(userId) {
    try {
      await this.ensureAliasColumn();
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";
      const result = await this.getClient().query(
        `SELECT o."Alias" AS "OwnershipAlias", o.*, p.*, l."mmr" as "MMR", l."peak_mmr" as "PeakMMR", l."events_played" as "Events", l."name" as "LoungeName"
         FROM "${this.tableName}" o 
         INNER JOIN "${playerTableName}" p ON o."PlayerID" = p."IDPlayer" 
         LEFT JOIN "Lounge" l ON p."LoungeID" = l."lounge_id"
         WHERE o."UserID" = $1;`,
        [userId]
      );
      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo jugadores poseídos:", err);
      throw err;
    }
  }

  async checkIfUserOwnsPlayer(userId, playerId) {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [userId, playerId]
      );
      return result.rows.length > 0;
    } catch (err) {
      console.error("❌ Error verificando ownership:", err);
      throw err;
    }
  }

  async getLastClaimDate(userId) {
    try {
      const result = await this.getClient().query(
        `SELECT MAX("AcquisitionDate") as "LastClaimDate" 
         FROM "${this.tableName}" 
         WHERE "UserID" = $1;`,
        [userId]
      );
      return result.rows[0]?.LastClaimDate || null;
    } catch (err) {
      console.error("❌ Error obteniendo última fecha de claim:", err);
      throw err;
    }
  }

  async getPlayerOwner(playerId, discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const result = await this.getClient().query(
        `SELECT u.*, o."AcquisitionDate"
         FROM "${this.tableName}" o
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE o."PlayerID" = $1
         AND u."DiscordServerID" = $2
         LIMIT 1;`,
        [playerId, discordServerId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo propietario del jugador:", err);
      throw err;
    }
  }

  async transferOwnership(fromUserId, toUserId, playerId) {
    try {
      await this.getClient().query("BEGIN");

      const ownershipCheck = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [fromUserId, playerId]
      );

      if (ownershipCheck.rows.length === 0) {
        await this.getClient().query("ROLLBACK");
        return {
          success: false,
          error: "not_owned",
        };
      }

      const alreadyOwnedCheck = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [toUserId, playerId]
      );

      if (alreadyOwnedCheck.rows.length > 0) {
        await this.getClient().query("ROLLBACK");
        return {
          success: false,
          error: "recipient_already_owns",
        };
      }

      await this.getClient().query(
        `DELETE FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [fromUserId, playerId]
      );

      const result = await this.getClient().query(
        `INSERT INTO "${this.tableName}" ("UserID", "PlayerID", "AcquisitionDate") VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *;`,
        [toUserId, playerId]
      );

      await this.getClient().query("COMMIT");

      return {
        success: true,
        ownership: result.rows[0],
      };
    } catch (err) {
      await this.getClient().query("ROLLBACK");
      console.error("❌ Error transfiriendo ownership:", err);
      throw err;
    }
  }

  async removeOwnership(userId, playerId) {
    try {
      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2 RETURNING *;`,
        [userId, playerId]
      );
      return {
        success: result.rows.length > 0,
        ownership: result.rows[0] || null,
      };
    } catch (err) {
      console.error("❌ Error eliminando ownership:", err);
      throw err;
    }
  }

  async updateOwnershipAlias(userId, playerId, alias) {
    try {
      await this.ensureAliasColumn();
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "Alias" = $1
         WHERE "UserID" = $2 AND "PlayerID" = $3
         RETURNING *;`,
        [alias, userId, playerId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error actualizando alias personalizado:", err);
      throw err;
    }
  }

  async removeOwnershipAlias(userId, playerId) {
    try {
      await this.ensureAliasColumn();
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "Alias" = NULL
         WHERE "UserID" = $1 AND "PlayerID" = $2
         RETURNING *;`,
        [userId, playerId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error removiendo alias personalizado:", err);
      throw err;
    }
  }

  async ensureAliasColumn() {
    if (OwnershipDAO.hasAliasColumn !== null) {
      return OwnershipDAO.hasAliasColumn;
    }

    try {
      await this.getClient().query(
        `ALTER TABLE "${this.tableName}" RENAME COLUMN "CustomAlias" TO "Alias";`
      );
      console.log(
        `ℹ️ Renamed legacy column "CustomAlias" to "Alias" on ${this.tableName}`
      );
    } catch (renameError) {
      if (renameError.code !== "42703") {
        console.error("⚠️ Error renaming CustomAlias column:", renameError);
      }
    }

    try {
      await this.getClient().query(
        `ALTER TABLE "${this.tableName}" ADD COLUMN IF NOT EXISTS "Alias" VARCHAR(25);`
      );
      OwnershipDAO.hasAliasColumn = true;
    } catch (err) {
      console.error("⚠️ Error ensuring Alias column exists:", err);
      OwnershipDAO.hasAliasColumn = false;
    }

    return OwnershipDAO.hasAliasColumn;
  }

  async deleteOwnershipsByServer(discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" o
         WHERE o."UserID" IN (
           SELECT "UserID" FROM "${userTableName}" WHERE "DiscordServerID" = $1
         );`,
        [discordServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error eliminando ownerships por servidor:", err);
      throw err;
    }
  }

  async clearAliasesByServer(discordServerId) {
    try {
      await this.ensureAliasColumn();
      const userTableName = global.DEBUG ? "User" : "UserTest";

      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "Alias" = NULL
         WHERE "UserID" IN (
           SELECT "UserID" FROM "${userTableName}" WHERE "DiscordServerID" = $1
         );`,
        [discordServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error limpiando alias por servidor:", err);
      throw err;
    }
  }

  async getUserOwnerships(userId) {
    try {
      const result = await this.getClient().query(
        `SELECT "UserID", "PlayerID"
         FROM "${this.tableName}"
         WHERE "UserID" = $1;`,
        [userId]
      );
      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo ownerships del usuario:", err);
      throw err;
    }
  }

  async removeRandomOwnerships(userId, count) {
    try {
      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}"
         WHERE "UserID" = $1
         AND "PlayerID" IN (
           SELECT "PlayerID"
           FROM "${this.tableName}"
           WHERE "UserID" = $1
           ORDER BY RANDOM()
           LIMIT $2
         );`,
        [userId, count]
      );
      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error eliminando ownerships aleatorios:", err);
      throw err;
    }
  }

  async getUserOwnershipsByServer(userId, discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const result = await this.getClient().query(
        `SELECT o."UserID", o."PlayerID"
         FROM "${this.tableName}" o
         INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
         WHERE o."UserID" = $1
         AND u."DiscordServerID" = $2;`,
        [userId, discordServerId]
      );
      return result.rows;
    } catch (err) {
      console.error(
        "❌ Error obteniendo ownerships del usuario por servidor:",
        err
      );
      throw err;
    }
  }

  async removeRandomOwnershipsByServer(userId, discordServerId, count) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}"
         WHERE "UserID" = $1
         AND "PlayerID" IN (
           SELECT o."PlayerID"
           FROM "${this.tableName}" o
           INNER JOIN "${userTableName}" u ON o."UserID" = u."UserID"
           WHERE o."UserID" = $1
           AND u."DiscordServerID" = $2
           ORDER BY RANDOM()
           LIMIT $3
         );`,
        [userId, discordServerId, count]
      );
      return result.rowCount || 0;
    } catch (err) {
      console.error(
        "❌ Error eliminando ownerships aleatorios por servidor:",
        err
      );
      throw err;
    }
  }
}

OwnershipDAO.hasAliasColumn = null;

module.exports = OwnershipDAO;
