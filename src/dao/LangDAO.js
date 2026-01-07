const DAO = require("./DAO");

class LangDAO extends DAO {
  constructor() {
    super("Lang");
  }

  async getByGuildId(guildId) {
    try {
      const all = await this.getAll();
      return all.find((row) => row.guild_id === guildId) || null;
    } catch (err) {
      console.error("❌ Error obteniendo idioma por guild_id:", err);
      throw err;
    }
  }

  async updateByGuildId(guildId, langCode) {
    try {
      const pool = this.getClient();
      const result = await pool.query(
        `UPDATE "${this.tableName}" SET "lang_code" = $1 WHERE "guild_id" = $2 RETURNING *;`,
        [langCode, guildId]
      );
      return result.rows[0];
    } catch (err) {
      console.error("❌ Error actualizando idioma por guild_id:", err);
      throw err;
    }
  }

  async upsertLanguage(guildId, langCode) {
    try {
      const existing = await this.getByGuildId(guildId);

      if (existing) {
        return await this.updateByGuildId(guildId, langCode);
      } else {
        return await this.insert({
          guild_id: guildId,
          lang_code: langCode,
        });
      }
    } catch (err) {
      console.error("❌ Error haciendo upsert de idioma:", err);
      throw err;
    }
  }
}

module.exports = LangDAO;
