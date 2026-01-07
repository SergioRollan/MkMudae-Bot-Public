const DAO = require("./DAO");

class GuildConfigDAO extends DAO {
  constructor() {
    super("GuildConfig");
  }

  async getByGuildId(guildId) {
    try {
      const all = await this.getAll();
      return all.find((row) => row.guild_id === guildId) || null;
    } catch (err) {
      console.error("❌ Error obteniendo configuración por guild_id:", err);
      throw err;
    }
  }

  async upsertGiftConfirmation(guildId, enabled) {
    try {
      const existing = await this.getByGuildId(guildId);

      if (existing) {
        const result = await this.getClient().query(
          `UPDATE "${this.tableName}" SET "gift_confirmation_enabled" = $1 WHERE "guild_id" = $2 RETURNING *;`,
          [enabled, guildId]
        );
        return result.rows[0];
      } else {
        return await this.insert({
          guild_id: guildId,
          gift_confirmation_enabled: enabled,
        });
      }
    } catch (err) {
      console.error("❌ Error haciendo upsert de gift confirmation:", err);
      throw err;
    }
  }
}

module.exports = GuildConfigDAO;
