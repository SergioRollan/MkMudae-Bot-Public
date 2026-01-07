const DAO = require("./DAO");

class LoungeDAO extends DAO {
  constructor() {
    super("Lounge");
  }

  async getRandomPlayer(maxMmr = null) {
    try {
      let query = `SELECT * FROM "${this.tableName}" WHERE "mmr" > 0`;
      const params = [];

      if (maxMmr !== null && maxMmr > 0) {
        query += ` AND "mmr" <= $1`;
        params.push(maxMmr);
      }

      query += ` ORDER BY RANDOM() LIMIT 1;`;
      const result = await this.getClient().query(query, params);
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo jugador aleatorio de Lounge:", err);
      throw err;
    }
  }

  async getRandomPlayerWithWishlistMultiplier(
    wishlistLoungeIds = [],
    multiplier = 3
  ) {
    try {
      if (!wishlistLoungeIds || wishlistLoungeIds.length === 0) {
        return await this.getRandomPlayer();
      }
      let unionQueries = [];
      const params = [];
      let paramIndex = 1;
      const notInPlaceholders = wishlistLoungeIds
        .map((id, idx) => {
          params.push(id);
          return `$${paramIndex++}`;
        })
        .join(", ");

      unionQueries.push(`
        SELECT l.*, 1 as weight
        FROM "${this.tableName}" l
        WHERE l."mmr" > 0 
        AND l."lounge_id" NOT IN (${notInPlaceholders})
      `);

      for (let i = 0; i < multiplier; i++) {
        const inPlaceholders = wishlistLoungeIds
          .map((_, idx) => {
            params.push(wishlistLoungeIds[idx]);
            return `$${paramIndex++}`;
          })
          .join(", ");

        unionQueries.push(`
          SELECT l.*, ${multiplier} as weight
          FROM "${this.tableName}" l
          WHERE l."mmr" > 0 
          AND l."lounge_id" IN (${inPlaceholders})
        `);
      }
      const query = `
        SELECT * FROM (
          ${unionQueries.join(" UNION ALL ")}
        ) weighted_players
        ORDER BY RANDOM()
        LIMIT 1;
      `;

      const result = await this.getClient().query(query, params);
      return result.rows[0] || null;
    } catch (err) {
      console.error(
        "❌ Error obteniendo jugador aleatorio con multiplicador de wishlist:",
        err
      );

      return await this.getRandomPlayer();
    }
  }

  async getPlayerByName(name) {
    try {
      let result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "name" ILIKE $1 LIMIT 1;`,
        [name]
      );

      if (result.rows.length === 0) {
        result = await this.getClient().query(
          `SELECT * FROM "${this.tableName}" WHERE "name" ILIKE $1 LIMIT 1;`,
          [`%${name}%`]
        );
      }

      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo jugador por nombre de Lounge:", err);
      throw err;
    }
  }

  async getPlayerByLoungeIdOrName(loungeId, name = null) {
    try {
      const conditions = [];
      const params = [];
      let index = 1;

      const numericId = Number(loungeId);
      if (Number.isInteger(numericId) && numericId > 0) {
        conditions.push(`"lounge_id" = $${index}`);
        params.push(numericId);
        index += 1;
      }

      const normalizedName =
        name !== null && name !== undefined ? String(name).trim() : "";

      if (!Number.isInteger(numericId) && typeof loungeId === "string") {
        const candidateName = loungeId.trim();
        if (candidateName.length > 0) {
          conditions.push(`"name" = $${index}`);
          params.push(candidateName);
          index += 1;
        }
      }

      if (normalizedName.length > 0) {
        conditions.push(`"name" = $${index}`);
        params.push(normalizedName);
        index += 1;
      }

      if (conditions.length === 0) {
        return null;
      }

      const query = `
        SELECT *
        FROM "${this.tableName}"
        WHERE ${conditions.join(" OR ")}
        LIMIT 1;
      `;

      const result = await this.getClient().query(query, params);
      return result.rows[0] || null;
    } catch (err) {
      console.error(
        "❌ Error obteniendo jugador de Lounge por ID o nombre:",
        err
      );
      throw err;
    }
  }

  async getPlayerRankingByMMR(mmr) {
    try {
      const result = await this.getClient().query(
        `SELECT COUNT(*) + 1 as ranking, (SELECT COUNT(*) FROM "${this.tableName}" WHERE "mmr" > 0) as total_players
         FROM "${this.tableName}"
         WHERE "mmr" > $1`,
        [mmr]
      );
      if (result.rows.length > 0) {
        const ranking = parseInt(result.rows[0].ranking) || 1;
        const totalPlayers = parseInt(result.rows[0].total_players) || 1;
        return { ranking, totalPlayers };
      }

      return { ranking: 1, totalPlayers: 1 };
    } catch (err) {
      console.error("❌ Error obteniendo ranking del jugador:", err);
      return { ranking: null, totalPlayers: null };
    }
  }
}

module.exports = LoungeDAO;
