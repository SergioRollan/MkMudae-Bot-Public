const DAO = require("./DAO");

class AdminRoleDAO extends DAO {
  constructor() {
    super("AdminRole");
  }

  async getByGuildId(guildId) {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "guild_id" = $1;`,
        [guildId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo admin role por guild_id:", err);
      throw err;
    }
  }

  async upsertAdminRole(guildId, roleName) {
    try {
      const existing = await this.getByGuildId(guildId);

      if (existing) {
        const result = await this.getClient().query(
          `UPDATE "${this.tableName}" SET "role_name" = $1 WHERE "guild_id" = $2 RETURNING *;`,
          [roleName, guildId]
        );
        return result.rows[0];
      } else {
        const result = await this.getClient().query(
          `INSERT INTO "${this.tableName}" ("guild_id", "role_name") VALUES ($1, $2) RETURNING *;`,
          [guildId, roleName]
        );
        return result.rows[0];
      }
    } catch (err) {
      console.error("❌ Error haciendo upsert de admin role:", err);
      throw err;
    }
  }

  async deleteByGuildId(guildId) {
    try {
      const result = await this.getClient().query(
        `DELETE FROM "${this.tableName}" WHERE "guild_id" = $1 RETURNING *;`,
        [guildId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error eliminando admin role por guild_id:", err);
      throw err;
    }
  }
}

module.exports = AdminRoleDAO;

