const DAO = require("./DAO");

class ServerChannelDAO extends DAO {
  constructor() {
    super("ServerChannel");
  }

  async getByServerId(serverId) {
    try {
      const pool = this.getClient();
      const result = await pool.query(
        `SELECT * FROM "${this.tableName}" WHERE "server_id" = $1;`,
        [serverId]
      );
      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo canales por server_id:", err);
      throw err;
    }
  }

  async getChannelIdsByServerId(serverId) {
    try {
      const rows = await this.getByServerId(serverId);
      return rows.map((row) => row.channel_id);
    } catch (err) {
      console.error("❌ Error obteniendo channel_ids por server_id:", err);
      throw err;
    }
  }

  async exists(serverId, channelId) {
    try {
      const pool = this.getClient();
      const result = await pool.query(
        `SELECT 1 FROM "${this.tableName}" WHERE "server_id" = $1 AND "channel_id" = $2 LIMIT 1;`,
        [serverId, channelId]
      );
      return result.rows.length > 0;
    } catch (err) {
      console.error("❌ Error verificando existencia de canal:", err);
      throw err;
    }
  }

  async add(serverId, channelId) {
    try {
      const exists = await this.exists(serverId, channelId);
      if (exists) {
        return { added: false };
      }

      const result = await this.insert({
        server_id: serverId,
        channel_id: channelId,
      });
      return { added: true, record: result };
    } catch (err) {
      console.error("❌ Error añadiendo canal:", err);
      throw err;
    }
  }

  async remove(serverId, channelId) {
    try {
      const pool = this.getClient();
      const result = await pool.query(
        `DELETE FROM "${this.tableName}" WHERE "server_id" = $1 AND "channel_id" = $2 RETURNING *;`,
        [serverId, channelId]
      );
      return { removed: result.rows.length > 0 };
    } catch (err) {
      console.error("❌ Error eliminando canal:", err);
      throw err;
    }
  }

  async clearByServerId(serverId) {
    try {
      const pool = this.getClient();
      await pool.query(
        `DELETE FROM "${this.tableName}" WHERE "server_id" = $1;`,
        [serverId]
      );
      return true;
    } catch (err) {
      console.error("❌ Error eliminando todos los canales del servidor:", err);
      throw err;
    }
  }

  async addMultiple(serverId, channelIds) {
    if (!channelIds || channelIds.length === 0) {
      return [];
    }

    try {
      const pool = this.getClient();
      const values = channelIds
        .map((_, index) => {
          const baseIndex = index * 2;
          return `($${baseIndex + 1}, $${baseIndex + 2})`;
        })
        .join(", ");

      const params = channelIds.flatMap((channelId) => [serverId, channelId]);

      const query = `
        INSERT INTO "${this.tableName}" ("server_id", "channel_id")
        VALUES ${values}
        ON CONFLICT DO NOTHING
        RETURNING *;
      `;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (err) {
      console.error("❌ Error añadiendo múltiples canales:", err);
      throw err;
    }
  }
}

module.exports = ServerChannelDAO;
