const DAO = require("./DAO");

class WarDAO extends DAO {
  constructor() {
    const tableName = global.DEBUG ? "War" : "WarTest";
    super(tableName);
  }

  async createWar(challengerId, challengedId, type, betAmount = 0) {
    try {
      const result = await this.getClient().query(
        `INSERT INTO "${this.tableName}" ("ChallengerID", "ChallengedID", "Type", "BetAmount", "Date") 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         RETURNING *;`,
        [challengerId, challengedId, type, betAmount]
      );
      return result.rows[0];
    } catch (err) {
      console.error(`❌ Error creando war en ${this.tableName}:`, err);
      throw err;
    }
  }

  async updateWarResult(warId, result) {
    try {
      const updateResult = await this.getClient().query(
        `UPDATE "${this.tableName}" SET "Result" = $1 WHERE "IDWar" = $2 RETURNING *;`,
        [result, warId]
      );
      return updateResult.rows[0];
    } catch (err) {
      console.error(
        `❌ Error actualizando resultado de war en ${this.tableName}:`,
        err
      );
      throw err;
    }
  }
}

module.exports = WarDAO;
