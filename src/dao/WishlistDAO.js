const DAO = require("./DAO");

class WishlistDAO extends DAO {
  constructor() {
    const tableName = global.DEBUG ? "Wishlist" : "WishlistTest";
    super(tableName);
  }

  async getUserWishlist(userId, discordServerId = null) {
    try {
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";
      const userTableName = global.DEBUG ? "User" : "UserTest";

      let query, params;
      if (discordServerId) {
        query = `SELECT w."IDWishlist", w."UserID", w."PlayerID", p.*, l."mmr" as "MMR", l."peak_mmr" as "PeakMMR", l."events_played" as "Events", l."name" as "LoungeName"
         FROM "${this.tableName}" w 
         INNER JOIN "${playerTableName}" p ON w."PlayerID" = p."IDPlayer" 
         LEFT JOIN "Lounge" l ON p."LoungeID" = l."lounge_id"
         INNER JOIN "${userTableName}" u ON w."UserID" = u."UserID"
         WHERE w."UserID" = $1 
         AND u."DiscordServerID" = $2
         ORDER BY w."IDWishlist" ASC;`;
        params = [userId, discordServerId];
      } else {
        query = `SELECT w."IDWishlist", w."UserID", w."PlayerID", p.*, l."mmr" as "MMR", l."peak_mmr" as "PeakMMR", l."events_played" as "Events", l."name" as "LoungeName"
         FROM "${this.tableName}" w 
         INNER JOIN "${playerTableName}" p ON w."PlayerID" = p."IDPlayer" 
         LEFT JOIN "Lounge" l ON p."LoungeID" = l."lounge_id"
         WHERE w."UserID" = $1
         ORDER BY w."IDWishlist" ASC;`;
        params = [userId];
      }

      const result = await this.getClient().query(query, params);
      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo wishlist del usuario:", err);
      throw err;
    }
  }

  async getWishlistCount(userId, discordServerId = null, client = null) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";
      const dbClient = client || this.getClient();

      let query, params;
      if (discordServerId) {
        query = `SELECT COUNT(*) as count 
         FROM "${this.tableName}" w
         INNER JOIN "${playerTableName}" p ON w."PlayerID" = p."IDPlayer"
         INNER JOIN "${userTableName}" u ON w."UserID" = u."UserID"
         WHERE w."UserID" = $1 
         AND u."DiscordServerID" = $2;`;
        params = [userId, discordServerId];
      } else {
        query = `SELECT COUNT(*) as count 
         FROM "${this.tableName}" w
         INNER JOIN "${playerTableName}" p ON w."PlayerID" = p."IDPlayer"
         WHERE w."UserID" = $1;`;
        params = [userId];
      }

      const result = await dbClient.query(query, params);
      return parseInt(result.rows[0].count) || 0;
    } catch (err) {
      console.error("❌ Error obteniendo conteo de wishlist:", err);
      throw err;
    }
  }

  async addPlayerToWishlist(userId, playerId) {
    try {
      const existing = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [userId, playerId]
      );

      if (existing.rows.length > 0) {
        return {
          success: false,
          error: "already_in_wishlist",
          wishlist: existing.rows[0],
        };
      }

      const result = await this.getClient().query(
        `INSERT INTO "${this.tableName}" ("UserID", "PlayerID") VALUES ($1, $2) RETURNING *;`,
        [userId, playerId]
      );

      return {
        success: true,
        wishlist: result.rows[0],
      };
    } catch (err) {
      console.error("❌ Error agregando jugador a wishlist:", err);
      throw err;
    }
  }

  async checkPlayerInWishlist(userId, playerId) {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [userId, playerId]
      );
      return result.rows.length > 0;
    } catch (err) {
      console.error("❌ Error verificando jugador en wishlist:", err);
      throw err;
    }
  }

  async removePlayerFromWishlist(userId, playerId) {
    try {
      const existing = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2;`,
        [userId, playerId]
      );

      if (existing.rows.length === 0) {
        return {
          success: false,
          error: "not_in_wishlist",
        };
      }

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" WHERE "UserID" = $1 AND "PlayerID" = $2 RETURNING *;`,
        [userId, playerId]
      );

      return {
        success: true,
        wishlist: result.rows[0],
      };
    } catch (err) {
      console.error("❌ Error eliminando jugador de wishlist:", err);
      throw err;
    }
  }

  async removePlayerFromWishlistByLoungeId(userId, loungeId) {
    try {
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" w
         WHERE w."UserID" = $1
         AND w."PlayerID" IN (
           SELECT p."IDPlayer" FROM "${playerTableName}" p
           WHERE p."LoungeID" = $2
         )
         RETURNING *;`,
        [userId, loungeId]
      );

      return {
        success: true,
        removedCount: result.rowCount || 0,
        removedEntries: result.rows,
      };
    } catch (err) {
      console.error(
        "❌ Error eliminando jugador de wishlist por LoungeID:",
        err
      );
      throw err;
    }
  }

  async removePlayerFromAllWishlistsInServer(discordServerId, playerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" w
         WHERE w."PlayerID" = $1
         AND w."UserID" IN (
           SELECT u."UserID" FROM "${userTableName}" u
           WHERE u."DiscordServerID" = $2
         )
         RETURNING *;`,
        [playerId, discordServerId]
      );

      return {
        success: true,
        removedCount: result.rowCount || 0,
        removedEntries: result.rows,
      };
    } catch (err) {
      console.error(
        "❌ Error eliminando jugador de wishlists del servidor:",
        err
      );
      throw err;
    }
  }

  async removePlayerFromAllWishlistsInServerByLoungeId(
    discordServerId,
    loungeId
  ) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" w
         WHERE w."PlayerID" IN (
           SELECT p."IDPlayer" FROM "${playerTableName}" p
           WHERE p."LoungeID" = $1
         )
         AND w."UserID" IN (
           SELECT u."UserID" FROM "${userTableName}" u
           WHERE u."DiscordServerID" = $2
         )
         RETURNING *;`,
        [loungeId, discordServerId]
      );

      return {
        success: true,
        removedCount: result.rowCount || 0,
        removedEntries: result.rows,
      };
    } catch (err) {
      console.error(
        "❌ Error eliminando jugador de wishlists del servidor por LoungeID:",
        err
      );
      throw err;
    }
  }

  async getUsersWithPlayerInWishlist(playerId, discordServerId = null) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";

      let query, params;
      if (discordServerId) {
        query = `SELECT u."UserID", u."DiscordID", u."Name", u."DiscordServerID"
         FROM "${this.tableName}" w
         INNER JOIN "${userTableName}" u ON w."UserID" = u."UserID"
         WHERE w."PlayerID" = $1
         AND u."DiscordServerID" = $2;`;
        params = [playerId, discordServerId];
      } else {
        query = `SELECT u."UserID", u."DiscordID", u."Name", u."DiscordServerID"
         FROM "${this.tableName}" w
         INNER JOIN "${userTableName}" u ON w."UserID" = u."UserID"
         WHERE w."PlayerID" = $1;`;
        params = [playerId];
      }

      const result = await this.getClient().query(query, params);
      return result.rows;
    } catch (err) {
      console.error(
        "❌ Error obteniendo usuarios con jugador en wishlist:",
        err
      );
      throw err;
    }
  }

  async getUsersWithPlayerInWishlistByLoungeId(
    loungeId,
    discordServerId = null
  ) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";

      let query, params;
      if (discordServerId) {
        query = `SELECT DISTINCT u."UserID", u."DiscordID", u."Name", u."DiscordServerID"
         FROM "${this.tableName}" w
         INNER JOIN "${playerTableName}" p ON w."PlayerID" = p."IDPlayer"
         INNER JOIN "${userTableName}" u ON w."UserID" = u."UserID"
         WHERE p."LoungeID" = $1
         AND u."DiscordServerID" = $2;`;
        params = [loungeId, discordServerId];
      } else {
        query = `SELECT DISTINCT u."UserID", u."DiscordID", u."Name", u."DiscordServerID"
         FROM "${this.tableName}" w
         INNER JOIN "${playerTableName}" p ON w."PlayerID" = p."IDPlayer"
         INNER JOIN "${userTableName}" u ON w."UserID" = u."UserID"
         WHERE p."LoungeID" = $1;`;
        params = [loungeId];
      }

      const result = await this.getClient().query(query, params);
      return result.rows;
    } catch (err) {
      console.error(
        "❌ Error obteniendo usuarios con jugador en wishlist por LoungeID:",
        err
      );
      throw err;
    }
  }

  async removeExcessWishlistItems(userId, maxWishlistSize, client = null) {
    try {
      const dbClient = client || this.getClient();
      const currentCount = await this.getWishlistCount(userId, null, dbClient);

      if (currentCount <= maxWishlistSize) {
        return {
          success: true,
          removedCount: 0,
          currentCount: currentCount,
          maxWishlistSize: maxWishlistSize,
        };
      }

      const excessCount = currentCount - maxWishlistSize;

      const result = await dbClient.query(
        `DELETE FROM "${this.tableName}"
         WHERE "IDWishlist" IN (
           SELECT "IDWishlist"
           FROM "${this.tableName}"
           WHERE "UserID" = $1
           ORDER BY "IDWishlist" ASC
           LIMIT $2
         )
         RETURNING *;`,
        [userId, excessCount]
      );

      return {
        success: true,
        removedCount: result.rowCount || 0,
        currentCount: currentCount - (result.rowCount || 0),
        maxWishlistSize: maxWishlistSize,
      };
    } catch (err) {
      console.error(
        "❌ Error eliminando elementos excedentes de wishlist:",
        err
      );
      throw err;
    }
  }

  async deleteWishlistsByServer(discordServerId) {
    try {
      const userTableName = global.DEBUG ? "User" : "UserTest";

      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" w
         WHERE w."UserID" IN (
           SELECT "UserID" FROM "${userTableName}" WHERE "DiscordServerID" = $1
         );`,
        [discordServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error eliminando wishlists por servidor:", err);
      throw err;
    }
  }
}

module.exports = WishlistDAO;
