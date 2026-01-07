const DAO = require("./DAO");
const LanguageManager = require("../managers/LanguageManager");

function generateDefaultTag(discordName) {
  if (!discordName || typeof discordName !== "string") {
    return "USR";
  }

  const lettersOnly = discordName.replace(/[^a-zA-Z]/g, "");

  if (lettersOnly.length === 0) {
    return "USR";
  }

  const tag = lettersOnly.substring(0, 3).toUpperCase();

  return tag || "USR";
}

class UserDAO extends DAO {
  constructor() {
    const tableName = global.DEBUG ? "User" : "UserTest";
    super(tableName);
  }

  async decrementTrainingsLeftBy1(userId) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "TrainingsLeft" = GREATEST(COALESCE("TrainingsLeft", 0) - 1, 0) WHERE "UserID" = $1 RETURNING *;`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error decrementando TrainingsLeft:", err);
      throw err;
    }
  }

  async decrementTrainingSlot(userId, slotNumber) {
    try {
      const columnName = `trainingsleft${slotNumber}`;
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "${columnName}" = GREATEST(COALESCE("${columnName}", 0) - 1, 0) WHERE "UserID" = $1 RETURNING *;`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error(`❌ Error decrementando ${columnName}:`, err);
      throw err;
    }
  }

  async getTrainingSlotValue(userId, slotNumber) {
    try {
      const columnName = `trainingsleft${slotNumber}`;
      const result = await this.getClient().query(
        `SELECT "${columnName}" FROM "${this.tableName}" WHERE "UserID" = $1;`,
        [userId]
      );
      return result.rows[0] ? result.rows[0][columnName] : null;
    } catch (err) {
      console.error(`❌ Error obteniendo ${columnName}:`, err);
      throw err;
    }
  }

  async setTrainingsLeft(userId, value) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "TrainingsLeft" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [Number(value) || 0, userId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error actualizando TrainingsLeft:", err);
      throw err;
    }
  }

  async getUserById(userId) {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "UserID" = $1;`,
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("❌ Error obteniendo usuario por ID:", err);
      throw err;
    }
  }

  async getUserByIds(discordId, discordServerId, name, guildLocale = null) {
    try {
      const langManager = LanguageManager.getInstance();
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "DiscordID" = $1 AND "DiscordServerID" = $2;`,
        [discordId, discordServerId]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        let needsUpdate = false;
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (!user.TeamName || !user.TeamName.trim()) {
          const fallbackTeamName = langManager.getString(
            discordServerId,
            "user_default_team_name",
            { name: user.Name || name },
            guildLocale
          );
          user.TeamName = fallbackTeamName;
          setClauses.push(`"TeamName" = $${paramIndex}`);
          values.push(fallbackTeamName);
          paramIndex++;
          needsUpdate = true;
        }

        if (!user.Tag || !user.Tag.trim()) {
          const defaultTag = generateDefaultTag(name);
          user.Tag = defaultTag;
          setClauses.push(`"Tag" = $${paramIndex}`);
          values.push(defaultTag);
          paramIndex++;
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            values.push(user.UserID);
            const setClause = setClauses.join(", ");

            const updateResult = await this.getClient().query(
              `UPDATE "${this.tableName}" SET ${setClause} WHERE "UserID" = $${paramIndex} RETURNING *;`,
              values
            );
            if (updateResult.rows.length > 0) {
              return updateResult.rows[0];
            }
          } catch (updateError) {
            console.error(
              "⚠️  Error actualizando campos faltantes:",
              updateError
            );
          }
        }

        return user;
      }
      const defaultTeamName = langManager.getString(
        discordServerId,
        "user_default_team_name",
        { name },
        guildLocale
      );

      const defaultTag = generateDefaultTag(name);

      const newUser = {
        DiscordID: discordId,
        DiscordServerID: discordServerId,
        Name: name,
        Coins: 0,
        Elo: 0,
        Player1: null,
        Player2: null,
        Player3: null,
        Player4: null,
        Player5: null,
        Player6: null,
        TrainingsLeft: 2,
        RollsLeft: 5,
        CanClaim: true,
        TeamName: defaultTeamName,
        Tag: defaultTag,
        TrackBalancedA: null,
        TrackBalancedB: null,
        TrackTopA: null,
        TrackTopB: null,
        TrackRemoveTopA: null,
        TrackRemoveTopB: null,
        TrackBottomA: null,
        TrackBottomB: null,
      };

      const insertResult = await this.insert(newUser);
      return insertResult;
    } catch (err) {
      console.error("❌ Error en getUserByIds:", err);
      throw err;
    }
  }

  async updateUserRolls(userId, rollsLeft) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "RollsLeft" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [rollsLeft, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando rolls del usuario:", err);
      throw err;
    }
  }

  async updateCanClaim(userId, canClaim) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "CanClaim" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [canClaim, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando CanClaim del usuario:", err);
      throw err;
    }
  }

  async updateCanWarCPU(userId, canWarCPU) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "canwarcpu" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [canWarCPU, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando canwarcpu del usuario:", err);
      throw err;
    }
  }

  async updateUserElo(userId, elo) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "Elo" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [elo, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando Elo del usuario:", err);
      throw err;
    }
  }

  async updateUserCoins(userId, coins) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "Coins" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [coins, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando coins del usuario:", err);
      throw err;
    }
  }

  async updateUserLineup(userId, lineupArray) {
    try {
      const slotColumns = [
        "Player1",
        "Player2",
        "Player3",
        "Player4",
        "Player5",
        "Player6",
      ];
      const sanitizedIds = Array.isArray(lineupArray)
        ? lineupArray.map((value) => {
            if (value === null || value === undefined) {
              return null;
            }
            const numeric = Number(value);
            return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
          })
        : [];

      const slotValues = slotColumns.map((_, index) =>
        index < sanitizedIds.length ? sanitizedIds[index] : null
      );
      const params = [...slotValues, userId];
      const setClause = slotColumns
        .map((column, index) => `"${column}" = $${index + 1}`)
        .join(", ");

      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET ${setClause} WHERE "UserID" = $${
          slotColumns.length + 1
        } RETURNING *;`,
        params
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando lineup del usuario:", err);
      throw err;
    }
  }

  async updateUserTrack(userId, columnName, trackId) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "${columnName}" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [trackId, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando track del usuario:", err);
      throw err;
    }
  }

  async updateUserTag(userId, tag) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "Tag" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [tag, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando tag del usuario:", err);
      throw err;
    }
  }

  async resetCoinsAndEloByServer(discordServerId) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" 
         SET "Coins" = 0, "Elo" = 0, "CanClaim" = true 
         WHERE "DiscordServerID" = $1;`,
        [discordServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error reseteando coins y elo por servidor:", err);
      throw err;
    }
  }

  async clearLineupsByServer(discordServerId) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "Player1" = NULL,
             "Player2" = NULL,
             "Player3" = NULL,
             "Player4" = NULL,
             "Player5" = NULL,
             "Player6" = NULL
         WHERE "DiscordServerID" = $1;`,
        [discordServerId]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error limpiando lineups por servidor:", err);
      throw err;
    }
  }

  async clearLineupsContainingPlayers(playerIds) {
    try {
      if (!playerIds || playerIds.length === 0) {
        return 0;
      }

      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "Player1" = CASE WHEN "Player1" = ANY($1::int[]) THEN NULL ELSE "Player1" END,
             "Player2" = CASE WHEN "Player2" = ANY($1::int[]) THEN NULL ELSE "Player2" END,
             "Player3" = CASE WHEN "Player3" = ANY($1::int[]) THEN NULL ELSE "Player3" END,
             "Player4" = CASE WHEN "Player4" = ANY($1::int[]) THEN NULL ELSE "Player4" END,
             "Player5" = CASE WHEN "Player5" = ANY($1::int[]) THEN NULL ELSE "Player5" END,
             "Player6" = CASE WHEN "Player6" = ANY($1::int[]) THEN NULL ELSE "Player6" END
         WHERE "Player1" = ANY($1::int[])
            OR "Player2" = ANY($1::int[])
            OR "Player3" = ANY($1::int[])
            OR "Player4" = ANY($1::int[])
            OR "Player5" = ANY($1::int[])
            OR "Player6" = ANY($1::int[]);`,
        [playerIds]
      );

      return result.rowCount || 0;
    } catch (err) {
      console.error("❌ Error limpiando lineups que contienen players:", err);
      throw err;
    }
  }

  async isUserBanned(discordId, discordServerId) {
    try {
      await this.ensureBannedColumn();
      const result = await this.getClient().query(
        `SELECT "Banned" FROM "${this.tableName}" WHERE "DiscordID" = $1 AND "DiscordServerID" = $2;`,
        [discordId, discordServerId]
      );
      return result.rows.length > 0 && result.rows[0].Banned === true;
    } catch (err) {
      console.error("❌ Error verificando ban del usuario:", err);
      return false;
    }
  }

  async setUserBanned(discordId, discordServerId, banned) {
    try {
      await this.ensureBannedColumn();
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "Banned" = $1 WHERE "DiscordID" = $2 AND "DiscordServerID" = $3 RETURNING *;`,
        [banned, discordId, discordServerId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("❌ Error actualizando ban del usuario:", err);
      throw err;
    }
  }

  async ensureBannedColumn() {
    if (UserDAO.hasBannedColumn !== null) {
      return UserDAO.hasBannedColumn;
    }

    try {
      await this.getClient().query(
        `ALTER TABLE "${this.tableName}" ADD COLUMN IF NOT EXISTS "Banned" BOOLEAN DEFAULT false;`
      );
      UserDAO.hasBannedColumn = true;
    } catch (err) {
      console.error("⚠️ Error asegurando columna Banned:", err);
      UserDAO.hasBannedColumn = false;
    }

    return UserDAO.hasBannedColumn;
  }

  async isUserRestricted(discordId, discordServerId) {
    try {
      const result = await this.getClient().query(
        `SELECT "restricted" FROM "${this.tableName}" WHERE "DiscordID" = $1 AND "DiscordServerID" = $2;`,
        [discordId, discordServerId]
      );
      return result.rows.length > 0 && result.rows[0].restricted === true;
    } catch (err) {
      console.error("❌ Error verificando restricted del usuario:", err);
      return false;
    }
  }

  async setUserRestricted(discordId, discordServerId, restricted) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "restricted" = $1 WHERE "DiscordID" = $2 AND "DiscordServerID" = $3 RETURNING *;`,
        [restricted, discordId, discordServerId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error("❌ Error actualizando restricted del usuario:", err);
      throw err;
    }
  }

  async updateUserTeamName(userId, teamName) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "TeamName" = $1 WHERE "UserID" = $2 RETURNING *;`,
        [teamName, userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando el nombre del equipo:", err);
      throw err;
    }
  }

  async teamnameExistsInServer(
    discordServerId,
    teamName,
    excludeUserId = null
  ) {
    try {
      let query, params;
      if (excludeUserId) {
        query = `SELECT 1 FROM "${this.tableName}" 
                 WHERE "DiscordServerID" = $1 
                 AND LOWER(TRIM("TeamName")) = LOWER(TRIM($2))
                 AND "UserID" != $3
                 LIMIT 1;`;
        params = [discordServerId, teamName, excludeUserId];
      } else {
        query = `SELECT 1 FROM "${this.tableName}" 
                 WHERE "DiscordServerID" = $1 
                 AND LOWER(TRIM("TeamName")) = LOWER(TRIM($2))
                 LIMIT 1;`;
        params = [discordServerId, teamName];
      }

      const result = await this.getClient().query(query, params);
      return result.rows.length > 0;
    } catch (err) {
      console.error("❌ Error verificando si el teamname existe:", err);
      throw err;
    }
  }

  async halveCoinsAndEloByServer(discordServerId) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "Coins" = FLOOR("Coins" / 2.0), "Elo" = FLOOR("Elo" / 2.0)
         WHERE "DiscordServerID" = $1;`,
        [discordServerId]
      );
      return result.rowCount || 0;
    } catch (err) {
      console.error(
        "❌ Error reduciendo coins y elo a la mitad por servidor:",
        err
      );
      throw err;
    }
  }

  async getUsersByServer(discordServerId) {
    try {
      const result = await this.getClient().query(
        `SELECT "UserID", "DiscordID", "Coins", "Elo", "Name", "TeamName"
         FROM "${this.tableName}"
         WHERE "DiscordServerID" = $1;`,
        [discordServerId]
      );
      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo usuarios por servidor:", err);
      throw err;
    }
  }

  async updateUserRollsAndTrainingsByRank(userId, rollsToSet, trainingsToSet) {
    try {
      const result = await this.getClient().query(
        `UPDATE "${this.tableName}"
         SET "RollsLeft" = $1,
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
        [rollsToSet, trainingsToSet, userId]
      );
      return result.rowCount || 0;
    } catch (err) {
      console.error(
        "❌ Error actualizando rolls y entrenamientos del usuario:",
        err
      );
      throw err;
    }
  }
}

UserDAO.hasBannedColumn = null;

module.exports = UserDAO;
