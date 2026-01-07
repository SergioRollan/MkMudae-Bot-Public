const { getPool } = require("../database/pool");

class DAO {
  constructor(tableName) {
    this.tableName = tableName;
  }

  getClient() {
    const pool = getPool();
    if (!pool) {
      throw new Error("Pool de base de datos no está disponible");
    }
    return pool;
  }

  async getAll() {
    try {
      const pool = this.getClient();
      const result = await pool.query(`SELECT * FROM "${this.tableName}";`);
      return result.rows;
    } catch (err) {
      console.error(`❌ Error fetching all from ${this.tableName}:`, err);
      throw err;
    }
  }

  async getById(id) {
    try {
      const pool = this.getClient();
      const result = await pool.query(
        `SELECT * FROM "${this.tableName}" WHERE id = $1;`,
        [id]
      );
      return result.rows[0];
    } catch (err) {
      console.error(`❌ Error fetching by ID from ${this.tableName}:`, err);
      throw err;
    }
  }

  async insert(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      const columns = keys.map((k) => `"${k}"`).join(", ");

      const query = `INSERT INTO "${this.tableName}" (${columns}) VALUES (${placeholders}) RETURNING *;`;
      const pool = this.getClient();
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (err) {
      console.error(`❌ Error inserting into ${this.tableName}:`, err);
      throw err;
    }
  }

  async update(id, data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");

      const query = `UPDATE "${this.tableName}" SET ${setClause} WHERE id = $${
        keys.length + 1
      } RETURNING *;`;
      const pool = this.getClient();
      const result = await pool.query(query, [...values, id]);
      return result.rows[0];
    } catch (err) {
      console.error(`❌ Error updating ${this.tableName}:`, err);
      throw err;
    }
  }
}

module.exports = DAO;
