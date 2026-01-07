const UserDAO = require("../dao/UserDAO");
const DAO = require("../dao/DAO");
const ServerChannelDAO = require("../dao/ServerChannelDAO");

const DEFAULT_RANKS_DATA = [
  {
    id: 1,
    name: "WOOD",
    emote: "🪵",
    pulls: 5,
    training_sessions: 2,
    discount: 0,
    wishlists: 2,
    wishlist_mult: 3,
    max_roster: 9,
    elo_needed: 0,
  },
  {
    id: 2,
    name: "IRON",
    emote: "⚫",
    pulls: 6,
    training_sessions: 2,
    discount: 0,
    wishlists: 3,
    wishlist_mult: 4,
    max_roster: 11,
    elo_needed: 2000,
  },
  {
    id: 3,
    name: "BRONZE",
    emote: "🟤",
    pulls: 7,
    training_sessions: 3,
    discount: 0,
    wishlists: 3,
    wishlist_mult: 6,
    max_roster: 13,
    elo_needed: 3000,
  },
  {
    id: 4,
    name: "SILVER",
    emote: "⚪",
    pulls: 8,
    training_sessions: 3,
    discount: 5,
    wishlists: 4,
    wishlist_mult: 7,
    max_roster: 15,
    elo_needed: 5000,
  },
  {
    id: 5,
    name: "GOLD",
    emote: "🟡",
    pulls: 9,
    training_sessions: 4,
    discount: 5,
    wishlists: 4,
    wishlist_mult: 8,
    max_roster: 17,
    elo_needed: 7000,
  },
  {
    id: 6,
    name: "PLATINUM",
    emote: "🔵",
    pulls: 10,
    training_sessions: 4,
    discount: 5,
    wishlists: 5,
    wishlist_mult: 10,
    max_roster: 19,
    elo_needed: 9999,
  },
  {
    id: 7,
    name: "SAPPHIRE",
    emote: "🔘",
    pulls: 10,
    training_sessions: 5,
    discount: 10,
    wishlists: 5,
    wishlist_mult: 11,
    max_roster: 21,
    elo_needed: 11500,
  },
  {
    id: 8,
    name: "RUBY",
    emote: "🔴",
    pulls: 11,
    training_sessions: 5,
    discount: 10,
    wishlists: 6,
    wishlist_mult: 12,
    max_roster: 23,
    elo_needed: 15000,
  },
  {
    id: 9,
    name: "EMERALD",
    emote: "🟢",
    pulls: 12,
    training_sessions: 6,
    discount: 15,
    wishlists: 6,
    wishlist_mult: 13,
    max_roster: 25,
    elo_needed: 19000,
  },
  {
    id: 10,
    name: "DIAMOND",
    emote: "💎",
    pulls: 13,
    training_sessions: 6,
    discount: 15,
    wishlists: 7,
    wishlist_mult: 15,
    max_roster: 27,
    elo_needed: 23000,
  },
  {
    id: 11,
    name: "MASTER",
    emote: "🏆",
    pulls: 13,
    training_sessions: 7,
    discount: 20,
    wishlists: 8,
    wishlist_mult: 17,
    max_roster: 29,
    elo_needed: 26666,
  },
  {
    id: 12,
    name: "GRANDMASTER",
    emote: "👑",
    pulls: 14,
    training_sessions: 7,
    discount: 20,
    wishlists: 9,
    wishlist_mult: 18,
    max_roster: 31,
    elo_needed: 30000,
  },
  {
    id: 13,
    name: "GOD",
    emote: "👼",
    pulls: 15,
    training_sessions: 8,
    discount: 25,
    wishlists: 10,
    wishlist_mult: 20,
    max_roster: 33,
    elo_needed: 33333,
  },
];

const RANKS_CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_TRACKS = {
  en: [
    "Acorn Heights",
    "Airship Fortress",
    "Boo Cinema",
    "Bowser's Castle",
    "Cheep Cheep Falls",
    "Choco Mountain",
    "Crown City",
    "Dandelion Depths",
    "Desert Hills",
    "Dino Dino Jungle",
    "DK Pass",
    "DK Spaceport",
    "Dry Bones Burnout",
    "Faraway Oasis",
    "Great ? Block Ruins",
    "Koopa Troopa Beach",
    "Mario Bros. Circuit",
    "Mario Circuit",
    "Moo Moo Meadows",
    "Peach Beach",
    "Peach Stadium",
    "Rainbow Road",
    "Salty Salty Speedway",
    "Shy Guy Bazaar",
    "Sky-High Sundae",
    "Starview Peak",
    "Toad's Factory",
    "Wario Stadium",
    "Wario's Galleon",
    "Whistlestop Summit",
  ],
  es: [
    "Aldea Arbórea",
    "Fortaleza Aérea",
    "Cine Boo",
    "Castillo de Bowser",
    "Cascadas Cheep Cheep",
    "Monte Chocolate",
    "Ciudad Corona",
    "Gruta Diente de León",
    "Desierto Sol-Sol",
    "Jungla Dino Dino",
    "DK Alpino",
    "Puerto Espacial DK",
    "Caverna Ósea",
    "Sabana Salpicante",
    "Templo del Bloque ?",
    "Playa Koopa",
    "Circuito Mario Bros.",
    "Circuito Mario",
    "Pradera Mu-Mu",
    "Playa Peach",
    "Estadio Peach",
    "Senda Arco Iris",
    "Ciudad Salina",
    "Bazar Shy Guy",
    "Cielos Helados",
    "Mirador estelar",
    "Fábrica de Toad",
    "Estadio Wario",
    "Galeón de Wario",
    "Cañón Ferroviario",
  ],
  fr: [
    "Chemin du Chêne",
    "Bateau Volant",
    "Cinéma Boo",
    "Chateau de Bowser",
    "Chutes Cheep Cheep",
    "Montagne Choco",
    "Trophéopolis",
    "Gouffre Pissenlit",
    "Désert du Soleil",
    "Jungle Dino Dino",
    "Alpes DK",
    "Spatioport DK",
    "Fournaise Ossesseuse",
    "Savane Sauvage",
    "Bloc ? Antique",
    "Plage Koopa",
    "Circuit Mario Bros.",
    "Circuit Mario",
    "Prairie Meuh Meuh",
    "Plage Peach",
    "Stade Peach",
    "Route Arc-en-ciel",
    "Cité Fleur-de-sel",
    "Souk Maskass",
    "Cité Sorbet",
    "Pic de l’observatoire",
    "Usine Toad",
    "Stade Wario",
    "Galion de Wario",
    "Mont Tchou Tchou",
  ],
};

class Utils {
  static getColorByMMR(mmr) {
    return mmr < 2000
      ? 0x36393f
      : mmr < 3500
      ? 0x8b4513
      : mmr < 5000
      ? 0xc0c0c0
      : mmr < 6500
      ? 0xffd700
      : mmr < 8000
      ? 0x05696b
      : mmr < 9500
      ? 0x4169e1
      : mmr < 11000
      ? 0xfc2540
      : mmr < 12500
      ? 0x97daf0
      : mmr < 13500
      ? 0x9966cc
      : 0xb50000;
  }

  static getUserDAO() {
    if (!this.userDAO) {
      this.userDAO = new UserDAO();
    }
    return this.userDAO;
  }

  static async getRanksData() {
    const cacheIsFresh =
      this.ranksCache &&
      this.ranksCacheTimestamp &&
      Date.now() - this.ranksCacheTimestamp < RANKS_CACHE_TTL_MS;

    if (cacheIsFresh) {
      return this.ranksCache;
    }

    try {
      const rankDAO = new DAO("Rank");
      const rows = await rankDAO.getAll();
      if (Array.isArray(rows) && rows.length > 0) {
        this.ranksCache = rows.map((row, index) => ({
          id: Number(row.id ?? index + 1),
          name: row.name ?? `RANK_${index + 1}`,
          pulls: Number(row.pulls ?? 0),
          emote: row.emote ?? "",
          training_sessions: Number(row.training_sessions ?? 0),
          discount: Number(row.discount ?? 0),
          wishlists: Number(row.wishlists ?? 0),
          wishlist_mult: Number(
            row.wishlist_mult ?? row.wishlist_multiplier ?? 0
          ),
          max_roster: Number(row.max_roster ?? 0),
          elo_needed: Number(row.elo_needed ?? 0),
          elo_cost: Number(row.elo_cost ?? 1),
        }));
        this.ranksCache.sort((a, b) => a.elo_needed - b.elo_needed);
        this.ranksCacheTimestamp = Date.now();
        return this.ranksCache;
      }
      console.warn(
        "⚠️ No se encontraron rangos en la base de datos, usando valores por defecto."
      );
    } catch (err) {
      console.error(
        "⚠️ No se pudieron cargar los rangos desde la base de datos, usando valores por defecto."
      );
    }

    this.ranksCache = DEFAULT_RANKS_DATA;
    this.ranksCacheTimestamp = Date.now();
    return this.ranksCache;
  }

  static invalidateRanksCache() {
    this.ranksCache = null;
    this.ranksCacheTimestamp = 0;
  }

  static findRankForElo(ranks, elo) {
    if (!Array.isArray(ranks) || ranks.length === 0) {
      return DEFAULT_RANKS_DATA[0];
    }
    const sortedRanks = [...ranks].sort((a, b) => {
      const eloA = a.elo_needed ?? 0;
      const eloB = b.elo_needed ?? 0;
      return eloA - eloB;
    });
    const targetElo = Number.isFinite(elo) ? elo : 0;
    let current = sortedRanks[0];
    for (const rank of sortedRanks) {
      const rankElo = rank.elo_needed ?? 0;
      if (targetElo >= rankElo) {
        current = rank;
      } else {
        break;
      }
    }
    return current;
  }

  static findRankByName(ranks, rankName) {
    if (!Array.isArray(ranks)) {
      return null;
    }
    const normalized =
      typeof rankName === "string" ? rankName.trim().toUpperCase() : "";
    return ranks.find(
      (rank) => rank.name && rank.name.trim().toUpperCase() === normalized
    );
  }

  static async getRankForElo(elo) {
    const ranks = await this.getRanksData();
    return this.findRankForElo(ranks, elo);
  }

  static async getRankByName(rankName) {
    const ranks = await this.getRanksData();
    return this.findRankByName(ranks, rankName);
  }

  static normalizeLocale(locale) {
    if (typeof locale !== "string" || locale.length === 0) {
      return "en";
    }
    const lower = locale.toLowerCase();
    if (lower.startsWith("es")) {
      return "es";
    }
    if (lower.startsWith("fr")) {
      return "fr";
    }
    return "en";
  }

  static cloneTrackList(list) {
    return Array.isArray(list) ? [...list] : [];
  }

  static async getTrackPool(locale) {
    const localeKey = this.normalizeLocale(locale);
    if (this.tracksCache.has(localeKey)) {
      return this.cloneTrackList(this.tracksCache.get(localeKey));
    }

    try {
      const TrackDAO = require("../dao/TrackDAO");
      const dao = new TrackDAO();
      const rows = await dao.getAllTracks();
      if (Array.isArray(rows) && rows.length > 0) {
        const dictionary = {
          en: [],
          es: [],
          fr: [],
        };

        rows.forEach((row) => {
          if (row.Locale || row.locale) {
            const key = Utils.normalizeLocale(row.Locale || row.locale);
            if (row.Name || row.name) {
              dictionary[key].push(row.Name || row.name);
            }
            return;
          }

          if (row.NameEN || row.nameen) {
            dictionary.en.push(row.NameEN || row.nameen);
          }
          if (row.NameES || row.namees) {
            dictionary.es.push(row.NameES || row.namees);
          }
          if (row.NameFR || row.namefr) {
            dictionary.fr.push(row.NameFR || row.namefr);
          }

          if (
            !row.NameEN &&
            !row.NameES &&
            !row.NameFR &&
            (row.Name || row.name)
          ) {
            dictionary.en.push(row.Name || row.name);
          }
        });

        Object.entries(dictionary).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            this.tracksCache.set(key, [...new Set(value)]);
          }
        });
      }
    } catch (err) {
      console.error(
        `❌ Error específico al cargar pistas desde BD: ${err.message || err}`
      );
      console.error(
        `❌ Stack trace: ${err.stack || "No stack trace disponible"}`
      );
      console.error(
        "⚠️ No se pudieron cargar las pistas desde la base de datos, usando valores por defecto."
      );
    }

    if (!this.tracksCache.has(localeKey)) {
      this.tracksCache.set(
        localeKey,
        this.cloneTrackList(DEFAULT_TRACKS[localeKey])
      );
    }

    const stored = this.tracksCache.get(localeKey);
    if (!stored || stored.length === 0) {
      this.tracksCache.set(localeKey, this.cloneTrackList(DEFAULT_TRACKS.en));
    }

    return this.cloneTrackList(this.tracksCache.get(localeKey));
  }

  static getConfig() {
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "../../data/config.json");

    if (!fs.existsSync(configPath)) {
      return {
        rollsClaimable: {},
        trainedPlayers: { Player: [], PlayerTest: [] },
        adminRoles: {},
      };
    }

    try {
      const content = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(content);

      if (!config.rollsClaimable) {
        config.rollsClaimable = {};
      }

      let hasChanges = false;
      if (config.hasCheckedBdLang) {
        delete config.hasCheckedBdLang;
        hasChanges = true;
      }
      if (config.guildLanguages) {
        delete config.guildLanguages;
        hasChanges = true;
      }
      if (!config.trainedPlayers) {
        config.trainedPlayers = { Player: [], PlayerTest: [] };
        hasChanges = true;
      } else if (Array.isArray(config.trainedPlayers)) {
        const legacy = [...config.trainedPlayers];
        config.trainedPlayers = { Player: legacy, PlayerTest: [] };
        hasChanges = true;
      } else {
        if (!Array.isArray(config.trainedPlayers.Player)) {
          config.trainedPlayers.Player = [];
          hasChanges = true;
        }
        if (!Array.isArray(config.trainedPlayers.PlayerTest)) {
          config.trainedPlayers.PlayerTest = [];
          hasChanges = true;
        }
      }

      if (!config.adminRoles) {
        config.adminRoles = {};
        hasChanges = true;
      }

      if (!config.allowSteal) {
        config.allowSteal = {};
        hasChanges = true;
      }

      if (hasChanges) {
        this.saveConfig(config);
      }

      return config;
    } catch (error) {
      console.error("⚠️ Error leyendo config.json:", error);
      return {
        rollsClaimable: {},
        trainedPlayers: { Player: [], PlayerTest: [] },
        adminRoles: {},
        allowSteal: {},
      };
    }
  }

  static saveConfig(config) {
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "../../data/config.json");

    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    } catch (error) {
      console.error("⚠️ Error guardando config.json:", error);
    }
  }

  static sanitizeChannelIdList(channelIds = []) {
    if (!Array.isArray(channelIds)) {
      return [];
    }

    const normalized = channelIds
      .map((id) => this.normalizeChannelId(id))
      .filter((id) => typeof id === "string" && id.length > 0);

    return [...new Set(normalized)];
  }

  static normalizeChannelId(channel) {
    if (!channel) {
      return null;
    }

    if (typeof channel === "string") {
      const trimmed = channel.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof channel === "number") {
      return String(channel);
    }

    if (
      typeof channel === "object" &&
      ("id" in channel || "channelId" in channel)
    ) {
      const value = channel.id || channel.channelId;
      return typeof value === "string" && value.length > 0
        ? value
        : typeof value === "number"
        ? String(value)
        : null;
    }

    return null;
  }

  static async getAllowedChannelsForGuild(guildId) {
    if (!guildId) {
      return [];
    }

    try {
      const dao = new ServerChannelDAO();
      const channelIds = await dao.getChannelIdsByServerId(guildId);
      return [...channelIds];
    } catch (err) {
      console.error("❌ Error obteniendo canales permitidos:", err);
      return [];
    }
  }

  static async setAllowedChannelsForGuild(guildId, channelIds = []) {
    if (!guildId) {
      return [];
    }

    try {
      const sanitized = this.sanitizeChannelIdList(channelIds);
      const dao = new ServerChannelDAO();

      await dao.clearByServerId(guildId);

      if (sanitized.length > 0) {
        await dao.addMultiple(guildId, sanitized);
      }

      return [...sanitized];
    } catch (err) {
      console.error("❌ Error estableciendo canales permitidos:", err);
      return [];
    }
  }

  static async clearAllowedChannelsForGuild(guildId) {
    return await this.setAllowedChannelsForGuild(guildId, []);
  }

  static async addAllowedChannel(guildId, channelId) {
    if (!guildId) {
      return { added: false, channels: [] };
    }

    const normalized = this.normalizeChannelId(channelId);
    if (!normalized) {
      return {
        added: false,
        channels: await this.getAllowedChannelsForGuild(guildId),
      };
    }

    try {
      const dao = new ServerChannelDAO();
      const result = await dao.add(guildId, normalized);

      if (!result.added) {
        const current = await this.getAllowedChannelsForGuild(guildId);
        return { added: false, channels: current };
      }

      const updated = await this.getAllowedChannelsForGuild(guildId);
      return { added: true, channels: updated };
    } catch (err) {
      console.error("❌ Error añadiendo canal permitido:", err);
      const current = await this.getAllowedChannelsForGuild(guildId);
      return { added: false, channels: current };
    }
  }

  static async removeAllowedChannel(guildId, channelId) {
    if (!guildId) {
      return { removed: false, channels: [] };
    }

    const normalized = this.normalizeChannelId(channelId);
    if (!normalized) {
      return {
        removed: false,
        channels: await this.getAllowedChannelsForGuild(guildId),
      };
    }

    try {
      const dao = new ServerChannelDAO();
      const result = await dao.remove(guildId, normalized);

      if (!result.removed) {
        const current = await this.getAllowedChannelsForGuild(guildId);
        return { removed: false, channels: current };
      }

      const updated = await this.getAllowedChannelsForGuild(guildId);
      return { removed: true, channels: updated };
    } catch (err) {
      console.error("❌ Error eliminando canal permitido:", err);
      const current = await this.getAllowedChannelsForGuild(guildId);
      return { removed: false, channels: current };
    }
  }

  static async isChannelAllowed(guildId, channel) {
    if (!guildId) {
      return true;
    }

    const allowedChannels = await this.getAllowedChannelsForGuild(guildId);
    if (!allowedChannels || allowedChannels.length === 0) {
      return true;
    }

    const channelId = this.normalizeChannelId(channel);
    if (channelId && allowedChannels.includes(channelId)) {
      return true;
    }

    if (
      channel &&
      typeof channel === "object" &&
      channel.parentId &&
      allowedChannels.includes(String(channel.parentId))
    ) {
      return true;
    }

    return false;
  }

  static addTrainedPlayer(playerId, tableName = null) {
    const config = this.getConfig();

    if (!config.trainedPlayers || Array.isArray(config.trainedPlayers)) {
      const legacy = Array.isArray(config.trainedPlayers)
        ? config.trainedPlayers
        : [];
      config.trainedPlayers = { Player: [], PlayerTest: [] };
      const keyLegacy = global.DEBUG ? "Player" : "PlayerTest";
      config.trainedPlayers[keyLegacy] = [...new Set(legacy)];
    }
    const key = tableName
      ? tableName === "PlayerTest"
        ? "PlayerTest"
        : "Player"
      : global.DEBUG
      ? "Player"
      : "PlayerTest";

    const id = Number(playerId);
    if (Number.isInteger(id) && !config.trainedPlayers[key].includes(id)) {
      config.trainedPlayers[key].push(id);
      this.saveConfig(config);
    }
  }

  static clearTrainedPlayers() {
    const config = this.getConfig();
    if (!config.trainedPlayers) return;
    if (Array.isArray(config.trainedPlayers)) {
      config.trainedPlayers = { Player: [], PlayerTest: [] };
      this.saveConfig(config);
      return;
    }
    let changed = false;
    if (
      Array.isArray(config.trainedPlayers.Player) &&
      config.trainedPlayers.Player.length > 0
    ) {
      config.trainedPlayers.Player = [];
      changed = true;
    }
    if (
      Array.isArray(config.trainedPlayers.PlayerTest) &&
      config.trainedPlayers.PlayerTest.length > 0
    ) {
      config.trainedPlayers.PlayerTest = [];
      changed = true;
    }
    if (changed) this.saveConfig(config);
  }

  static setConfigValue(key, value) {
    const config = this.getConfig();
    config[key] = value;
    this.saveConfig(config);
  }

  static async getGuildLocaleFromDB(message) {
    if (!message || !message.guild || !process.env.DATABASE_URL) {
      return message?.guild?.preferredLocale || null;
    }

    const LangDAO = require("../dao/LangDAO");

    try {
      const langDAO = new LangDAO();
      const langData = await langDAO.getByGuildId(message.guild.id);

      if (langData && langData.lang_code) {
        const langCode = langData.lang_code;
        const discordLangMap = {
          es: "es-ES",
          en: "en-US",
          fr: "fr",
        };
        return discordLangMap[langCode] || message.guild.preferredLocale;
      }
    } catch (error) {
      console.error("⚠️ Error obteniendo idioma de BD:", error);
    }

    return message.guild.preferredLocale || null;
  }

  static addClaimableRoll(messageId, timestamp) {
    const config = this.getConfig();
    if (!config.rollsClaimable) {
      config.rollsClaimable = {};
    }
    config.rollsClaimable[messageId] = timestamp;
    this.saveConfig(config);

    const fiveMinutesInMs = 5 * 60 * 1000;
    const timer = setTimeout(() => {
      this.removeClaimableRoll(messageId);
    }, fiveMinutesInMs);

    if (!Utils.claimTimers) {
      Utils.claimTimers = new Map();
    }
    Utils.claimTimers.set(messageId, timer);
  }

  static removeClaimableRoll(messageId) {
    const config = this.getConfig();
    if (config.rollsClaimable && config.rollsClaimable[messageId]) {
      delete config.rollsClaimable[messageId];
      this.saveConfig(config);
    }

    if (Utils.claimTimers && Utils.claimTimers.has(messageId)) {
      clearTimeout(Utils.claimTimers.get(messageId));
      Utils.claimTimers.delete(messageId);
    }
  }

  static isClaimable(messageId) {
    const config = this.getConfig();
    if (!config.rollsClaimable || !config.rollsClaimable[messageId]) {
      return false;
    }

    const timestamp = config.rollsClaimable[messageId];
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (now - timestamp > fiveMinutesInMs) {
      this.removeClaimableRoll(messageId);
      return false;
    }

    return true;
  }

  static cleanupExpiredRolls() {
    const config = this.getConfig();
    if (!config.rollsClaimable) {
      return;
    }

    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    let hasChanges = false;

    for (const [messageId, timestamp] of Object.entries(
      config.rollsClaimable
    )) {
      if (now - timestamp > fiveMinutesInMs) {
        delete config.rollsClaimable[messageId];
        hasChanges = true;

        if (Utils.claimTimers && Utils.claimTimers.has(messageId)) {
          clearTimeout(Utils.claimTimers.get(messageId));
          Utils.claimTimers.delete(messageId);
        }
      }
    }

    if (hasChanges) {
      this.saveConfig(config);
    }
  }

  static getMMRfromStat(stat) {
    return -990 + stat * 33;
  }

  static getStatfromMMR(mmr) {
    const scaled = ((mmr + 990) / 33) * 10;
    const trunc = scaled < 0 ? Math.ceil(scaled) : Math.floor(scaled);
    const diff = Math.abs(scaled - trunc);
    const isTie = Math.abs(diff - 0.5) < 1e-9;
    let rounded;
    if (isTie) {
      rounded = trunc;
    } else {
      rounded = Math.round(scaled);
    }
    return rounded / 10;
  }

  static getMarketValue(mmr, peakMmr, eventsPlayed, attributes = null) {
    const mmrValue = Number.isFinite(mmr) ? mmr : 0;
    const peakValue = Number.isFinite(peakMmr) ? peakMmr : 0;
    const events = Number.isFinite(eventsPlayed) ? eventsPlayed : 0;
    const weightedAverage = mmrValue * 0.72 + peakValue * 0.28;
    const baseValue = Math.pow(weightedAverage, 2.32) / 5000000;
    const eventsBonus = events / 39;

    let marketValue = baseValue + eventsBonus;

    if (attributes && typeof attributes === "object") {
      const attributeSum =
        (Number.isFinite(attributes.Lines) ? attributes.Lines : 0) +
        (Number.isFinite(attributes.Consistency) ? attributes.Consistency : 0) +
        (Number.isFinite(attributes.ItemUsage) ? attributes.ItemUsage : 0) +
        (Number.isFinite(attributes.Precision) ? attributes.Precision : 0) +
        (Number.isFinite(attributes.Communication)
          ? attributes.Communication
          : 0) +
        (Number.isFinite(attributes.Mental) ? attributes.Mental : 0) +
        (Number.isFinite(attributes.GameSense) ? attributes.GameSense : 0) +
        (Number.isFinite(attributes.Shockfinding)
          ? attributes.Shockfinding
          : 0);

      let multiplier;
      if (attributeSum <= 330) {
        multiplier = 1;
      } else if (attributeSum >= 8000) {
        multiplier = 2.5;
      } else {
        multiplier = 1 + ((attributeSum - 330) / (8000 - 330)) * (2.5 - 1);
      }

      marketValue *= multiplier;
    }

    return Math.round(marketValue);
  }

  static calculateEloChange(winnerElo, loserElo) {
    const BASE_GAIN = 150;
    const winnerEloValue = Number.isFinite(winnerElo) ? winnerElo : 0;
    const loserEloValue = Number.isFinite(loserElo) ? loserElo : 0;

    const diff = winnerEloValue - loserEloValue;

    let eloChange;

    if (diff === 0) {
      eloChange = BASE_GAIN;
    } else if (diff > 0) {
      const reduction = Math.min(149, Math.pow(diff / 100, 1.25) * 1.25);
      eloChange = Math.max(3, BASE_GAIN - reduction);
    } else {
      const bonus = Math.min(350, Math.pow(-diff / 100, 1.25) * 1.25);
      eloChange = BASE_GAIN + bonus;
    }

    return Math.round(eloChange);
  }

  static calculateEloChangeTie(playerAElo, playerBElo) {
    const playerAValue = Number.isFinite(playerAElo) ? playerAElo : 0;
    const playerBValue = Number.isFinite(playerBElo) ? playerBElo : 0;

    const underdogElo = Math.min(playerAValue, playerBValue);
    const favoritElo = Math.max(playerAValue, playerBValue);

    const underdogWinChange = this.calculateEloChange(underdogElo, favoritElo);

    const tieChange = Math.round(underdogWinChange / 13);

    if (playerAValue < playerBValue) {
      return { playerAChange: tieChange, playerBChange: -tieChange };
    } else if (playerBValue < playerAValue) {
      return { playerAChange: -tieChange, playerBChange: tieChange };
    } else {
      return { playerAChange: 0, playerBChange: 0 };
    }
  }

  static seededRandom(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static generateRandomAttributes() {
    const seed = Date.now() + Math.floor(Math.random() * 1000000);
    const random = this.seededRandom(seed);

    const rand = random();
    let pattern;
    if (rand < 0.4) {
      pattern = 5;
    } else if (rand < 0.6) {
      pattern = 1;
    } else if (rand < 0.8) {
      pattern = 4;
    } else if (rand < 0.9) {
      pattern = 2;
    } else {
      pattern = 3;
    }

    let baseValues = [];
    switch (pattern) {
      case 1:
        baseValues = [990, 660, 330, 165, 0, -330, -660, -825];
        break;
      case 2:
        baseValues = [1320, 1155, 165, -165, -330, -495, -660, -660];
        break;
      case 3:
        baseValues = [1320, 1320, 990, -495, -660, -660, -660, -825];
        break;
      case 4:
        baseValues = [660, 495, 165, 0, 0, -165, -330, -495];
        break;
      case 5:
      default:
        baseValues = [330, 165, 165, 0, 0, 0, -165, -165];
        break;
    }

    const values = [];
    for (const v of baseValues) {
      const insertIndex = Math.floor(random() * (values.length + 1));
      values.splice(insertIndex, 0, v);
    }

    const applyPlusMinus = (delta) => {
      const plusIndex = Math.floor(random() * values.length);
      let minusIndex;
      do {
        minusIndex = Math.floor(random() * values.length);
      } while (minusIndex === plusIndex);

      values[plusIndex] += delta;
      values[minusIndex] -= delta;
    };

    applyPlusMinus(90);
    applyPlusMinus(50);
    applyPlusMinus(25);

    return {
      Lines: values[0],
      Consistency: values[1],
      ItemUsage: values[2],
      Precision: values[3],
      Communication: values[4],
      Mental: values[5],
      GameSense: values[6],
      Shockfinding: values[7],
    };
  }

  static async hasAdminPermissions(member, guildId) {
    if (!member || !guildId) {
      return false;
    }

    const { PermissionFlagsBits } = require("discord.js");

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const AdminRoleDAO = require("../dao/AdminRoleDAO");
    const adminRoleDAO = new AdminRoleDAO();
    const adminRoleRecord = await adminRoleDAO.getByGuildId(guildId);

    if (!adminRoleRecord || !adminRoleRecord.role_name) {
      return false;
    }

    return member.roles.cache.some(
      (role) =>
        role.name.toLowerCase() === adminRoleRecord.role_name.toLowerCase()
    );
  }

  static formatCoins(amount) {
    const num = Number(amount) || 0;
    return num === 1 ? "coin" : "coins";
  }

  static formatAmount(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString();
  }
}

Utils.userDAO = null;
Utils.ranksCache = null;
Utils.ranksCacheTimestamp = 0;
Utils.tracksCache = new Map();
Utils.claimTimers = new Map();
Utils.DEFAULT_TRACKS = DEFAULT_TRACKS;

module.exports = Utils;
