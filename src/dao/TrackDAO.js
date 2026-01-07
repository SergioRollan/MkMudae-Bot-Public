const DAO = require("./DAO");

class TrackDAO extends DAO {
  constructor() {
    const tableName = global.DEBUG ? "Track" : "TrackTest";
    super(tableName);
  }

  async getAllTracks() {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" ORDER BY "IDTrack";`
      );
      return result.rows;
    } catch (err) {
      console.error("❌ Error obteniendo todas las pistas:", err);
      throw err;
    }
  }

  async getTrackById(trackId) {
    try {
      const result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" WHERE "IDTrack" = $1;`,
        [trackId]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error("❌ Error obteniendo pista por ID:", err);
      throw err;
    }
  }

  async getTrackByName(trackName) {
    try {
      const normalizedName = trackName.trim().toLowerCase();
      console.log(
        `📊 TrackDAO: Buscando pista con nombre normalizado: "${normalizedName}"`
      );

      let result = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" 
         WHERE LOWER("nameES") = $1 
            OR LOWER("nameEN") = $1 
            OR LOWER("nameFR") = $1 
         LIMIT 1;`,
        [normalizedName]
      );

      if (result.rows.length === 0) {
        result = await this.getClient().query(
          `SELECT * FROM "${this.tableName}" 
           WHERE LOWER("NameES") = $1 
              OR LOWER("NameEN") = $1 
              OR LOWER("NameFR") = $1 
           LIMIT 1;`,
          [normalizedName]
        );
      }

      if (result.rows.length > 0) {
        console.log(
          `✅ TrackDAO: Pista encontrada: ${
            result.rows[0].nameES ||
            result.rows[0].NameES ||
            result.rows[0].nameEN ||
            result.rows[0].NameEN
          }`
        );
        return result.rows[0];
      }

      let resultLike = await this.getClient().query(
        `SELECT * FROM "${this.tableName}" 
         WHERE LOWER("nameES") LIKE $1 
            OR LOWER("nameEN") LIKE $1 
            OR LOWER("nameFR") LIKE $1 
         LIMIT 1;`,
        [`%${normalizedName}%`]
      );

      if (resultLike.rows.length === 0) {
        resultLike = await this.getClient().query(
          `SELECT * FROM "${this.tableName}" 
           WHERE LOWER("NameES") LIKE $1 
              OR LOWER("NameEN") LIKE $1 
              OR LOWER("NameFR") LIKE $1 
           LIMIT 1;`,
          [`%${normalizedName}%`]
        );
      }

      if (resultLike.rows.length > 0) {
        console.log(
          `✅ TrackDAO: Pista encontrada con LIKE: ${
            resultLike.rows[0].nameES ||
            resultLike.rows[0].NameES ||
            resultLike.rows[0].nameEN ||
            resultLike.rows[0].NameEN
          }`
        );
        return resultLike.rows[0];
      }

      console.log(
        `⚠️ TrackDAO: No se encontró pista con nombre "${normalizedName}"`
      );
      return null;
    } catch (err) {
      console.error("❌ Error obteniendo pista por nombre:", err);
      throw err;
    }
  }

  async getSectorTypeById(sectorId) {
    try {
      const result = await this.getClient().query(
        `SELECT "name" FROM "TSector" WHERE "id" = $1 LIMIT 1;`,
        [sectorId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].name || null;
      }
      return null;
    } catch (err) {
      console.error(
        `❌ Error obteniendo tipo de sector por ID (${sectorId}):`,
        err
      );
      return null;
    }
  }
}

module.exports = TrackDAO;
