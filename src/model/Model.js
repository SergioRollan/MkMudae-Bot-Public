const UserDAO = require("../dao/UserDAO");
const LoungeDAO = require("../dao/LoungeDAO");
const PlayerDAO = require("../dao/PlayerDAO");
const OwnershipDAO = require("../dao/OwnershipDAO");
const WishlistDAO = require("../dao/WishlistDAO");
const TrackDAO = require("../dao/TrackDAO");
const WarDAO = require("../dao/WarDAO");
const Utils = require("../extras/Utils");
const WarManager = require("../managers/WarManager");
const SaleManager = require("../managers/SaleManager");
const TradeManager = require("../managers/TradeManager");

const LINEUP_SLOT_COLUMNS = [
  "Player1",
  "Player2",
  "Player3",
  "Player4",
  "Player5",
  "Player6",
];

class Model {
  constructor() {
    if (Model.instance) {
      return Model.instance;
    }

    this.userDAO = new UserDAO();
    this.loungeDAO = new LoungeDAO();
    this.playerDAO = new PlayerDAO();
    this.ownershipDAO = new OwnershipDAO();
    this.wishlistDAO = new WishlistDAO();
    this.trackDAO = new TrackDAO();
    this.warDAO = new WarDAO();
    this.warManager = new WarManager();
    this.saleManager = new SaleManager();
    this.tradeManager = new TradeManager();

    Model.instance = this;
  }

  static getInstance() {
    if (!Model.instance) {
      Model.instance = new Model();
    }
    return Model.instance;
  }

  normalizePlayerKey(value) {
    return typeof value === "string"
      ? value.replace(/\s+/g, " ").trim().toLowerCase()
      : null;
  }

  createPlayerToken(value) {
    if (value === null || value === undefined) {
      return null;
    }

    const rawString =
      typeof value === "string" ? value.trim() : String(value).trim();

    if (!rawString) {
      return null;
    }

    const numericValue = Number(rawString);
    if (Number.isInteger(numericValue) && numericValue > 0) {
      return {
        type: "id",
        id: numericValue,
        raw: rawString,
      };
    }

    return {
      type: "name",
      name: rawString,
      raw: rawString,
    };
  }

  createPlayerTokens(inputs = []) {
    if (!Array.isArray(inputs)) {
      return [];
    }

    return inputs
      .map((input) => this.createPlayerToken(input))
      .filter(
        (token) => token && (token.type === "id" || token.type === "name")
      );
  }

  buildOwnedPlayerIndex(ownedPlayers, getDisplayName) {
    const byId = new Map();
    const byName = new Map();
    const aliasKeys = new Set();

    if (!Array.isArray(ownedPlayers)) {
      return { byId, byName };
    }

    ownedPlayers.forEach((owned) => {
      const id = Number(owned?.IDPlayer);
      if (!Number.isInteger(id) || id <= 0 || byId.has(id)) {
        return;
      }

      const entry = {
        id,
        data: owned,
        displayName: getDisplayName(owned, id),
      };

      byId.set(id, entry);

      const aliasNames = [owned?.OwnershipAlias, owned?.Alias];

      aliasNames.forEach((alias) => {
        const key = this.normalizePlayerKey(alias);
        if (key) {
          aliasKeys.add(key);

          byName.set(key, entry);
        }
      });
    });

    ownedPlayers.forEach((owned) => {
      const id = Number(owned?.IDPlayer);
      if (!Number.isInteger(id) || id <= 0) {
        return;
      }

      const entry = byId.get(id);
      if (!entry) {
        return;
      }

      const normalNames = [
        owned?.Name,
        owned?.LoungeName,
        owned?.PlayerName,
        owned?.name,
        entry.displayName,
      ];

      normalNames.forEach((candidate) => {
        const key = this.normalizePlayerKey(candidate);

        if (key && !byName.has(key) && !aliasKeys.has(key)) {
          byName.set(key, entry);
        }
      });
    });

    return { byId, byName };
  }

  resolveOwnedPlayerToken(token, index) {
    if (!token) {
      return null;
    }

    if (token.type === "id") {
      return index.byId.get(token.id) || null;
    }

    const key = this.normalizePlayerKey(token.name);
    if (!key) {
      return null;
    }

    return index.byName.get(key) || null;
  }
  sanitizePlayerIdsArray(playerIds = []) {
    if (!Array.isArray(playerIds)) {
      return [];
    }

    return playerIds
      .map((value) => {
        const numeric = Number(value);
        return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
      })
      .filter((value) => value !== null)
      .slice(0, LINEUP_SLOT_COLUMNS.length);
  }

  buildLineupUpdateArray(playerIds = []) {
    const sanitized = this.sanitizePlayerIdsArray(playerIds);
    const result = [];
    for (let index = 0; index < LINEUP_SLOT_COLUMNS.length; index += 1) {
      result.push(sanitized[index] ?? null);
    }
    return result;
  }

  getLineupPlayerIdsFromRecord(userRecord) {
    if (!userRecord) {
      return [];
    }

    return LINEUP_SLOT_COLUMNS.map((column) => {
      const value = userRecord[column];
      const numeric = Number(value);
      return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
    }).filter((value) => value !== null);
  }

  getPlayerDisplayName(playerData, fallbackId) {
    if (!playerData) {
      return `Player #${fallbackId}`;
    }

    return (
      playerData.OwnershipAlias ||
      playerData.Alias ||
      playerData.Name ||
      playerData.LoungeName ||
      playerData.PlayerName ||
      playerData.name ||
      `Player #${fallbackId}`
    );
  }

  async getLineupDetailsByIds(
    playerIds = [],
    ownedPlayers = [],
    discordServerId = null
  ) {
    const sanitizedIds = this.sanitizePlayerIdsArray(playerIds);

    if (sanitizedIds.length === 0) {
      return [];
    }

    const details = [];
    const ownedMap = new Map();

    if (Array.isArray(ownedPlayers)) {
      for (const owned of ownedPlayers) {
        const id = Number(owned.IDPlayer);
        if (Number.isInteger(id) && !ownedMap.has(id)) {
          ownedMap.set(id, {
            id,
            displayName: this.getPlayerDisplayName(owned, id),
          });
        }
      }
    }

    const missingIds = sanitizedIds.filter((id) => !ownedMap.has(id));
    const dbMap = new Map();

    if (missingIds.length > 0) {
      const dbPlayers = discordServerId
        ? await this.playerDAO.getPlayersByIdsInServer(
            missingIds,
            discordServerId
          )
        : await this.playerDAO.getPlayersByIds(missingIds);

      for (const player of dbPlayers) {
        const id = Number(player.IDPlayer);
        if (Number.isInteger(id) && !dbMap.has(id)) {
          dbMap.set(id, {
            id,
            displayName: this.getPlayerDisplayName(player, id),
          });
        }
      }
    }

    for (const id of sanitizedIds) {
      if (ownedMap.has(id)) {
        details.push(ownedMap.get(id));
      } else if (dbMap.has(id)) {
        details.push(dbMap.get(id));
      } else {
        details.push({
          id,
          displayName: `Player #${id}`,
        });
      }
    }

    return details;
  }

  async getLineupDetailsFromRecord(userRecord, ownedPlayers = []) {
    const ids = this.getLineupPlayerIdsFromRecord(userRecord);
    const discordServerId = userRecord?.DiscordServerID || null;
    return this.getLineupDetailsByIds(ids, ownedPlayers, discordServerId);
  }

  async getLineupDisplayNamesFromRecord(userRecord, ownedPlayers = []) {
    const details = await this.getLineupDetailsFromRecord(
      userRecord,
      ownedPlayers
    );
    return details.map((entry) => entry.displayName);
  }

  matchOwnedPlayerByInput(ownedPlayers, input) {
    const tokens = this.createPlayerTokens([input]);
    if (tokens.length === 0) {
      return null;
    }

    const index = this.buildOwnedPlayerIndex(
      ownedPlayers,
      (playerData, playerId) => this.getPlayerDisplayName(playerData, playerId)
    );

    return this.resolveOwnedPlayerToken(tokens[0], index);
  }

  async getRandomPlayer(
    discordId,
    discordServerId,
    name,
    wishlistMultiplier = null,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        name,
        guildLocale
      );

      if (user.RollsLeft <= 0) {
        return {
          success: false,
          error: "no_rolls_left",
          rollsLeft: 0,
        };
      }

      const userRank = await this.getUserRankData(
        discordId,
        discordServerId,
        name,
        guildLocale
      );
      let multiplier =
        wishlistMultiplier !== null
          ? wishlistMultiplier
          : userRank.wishlist_mult;

      console.log(
        `🎲 Usuario ${name} - Rango: ${userRank.name}, Multiplicador wishlist: x${multiplier}`
      );

      const wishlistResult = await this.getUserWishlist(
        discordId,
        discordServerId
      );
      const wishlistLoungeIds = [];

      if (wishlistResult.success && wishlistResult.players.length > 0) {
        for (const wishlistPlayer of wishlistResult.players) {
          if (wishlistPlayer.LoungeID) {
            wishlistLoungeIds.push(wishlistPlayer.LoungeID);
          }
        }
      }

      let player = await this.loungeDAO.getRandomPlayerWithWishlistMultiplier(
        wishlistLoungeIds,
        multiplier
      );

      if (!player || player.mmr === 0) {
        return {
          success: false,
          error: "no_players_available",
          rollsLeft: user.RollsLeft,
        };
      }

      const newRollsLeft = user.RollsLeft - 1;
      await this.userDAO.updateUserRolls(user.UserID, newRollsLeft);

      return {
        success: true,
        player: player,
        rollsLeft: newRollsLeft,
      };
    } catch (err) {
      console.error("❌ Error en getRandomPlayer del Model:", err);
      throw err;
    }
  }

  async claimPlayer(
    discordId,
    discordServerId,
    userName,
    loungePlayerId,
    loungePlayer
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      console.log(
        `🔍 Verificando CanClaim para usuario ${user.UserID}: ${user.CanClaim}`
      );
      if (!user.CanClaim) {
        console.log(
          `❌ Usuario ${user.UserID} no puede hacer claim (CanClaim = ${user.CanClaim})`
        );
        return {
          success: false,
          error: "no_can_claim",
        };
      }
      console.log(
        `✅ Usuario ${user.UserID} puede hacer claim (CanClaim = true)`
      );

      const userRank = await this.getUserRankData(
        discordId,
        discordServerId,
        userName
      );
      const maxRoster = userRank.max_roster;
      console.log(
        `👥 Usuario ${userName} - Rango: ${userRank.name}, Max roster: ${maxRoster}`
      );

      const collection = await this.getUserCollection(
        discordId,
        discordServerId,
        userName
      );
      console.log(
        `👥 Usuario ${userName} - Roster actual: ${collection.count}/${maxRoster}`
      );
      if (collection.count >= maxRoster) {
        return {
          success: false,
          error: "max_roster_reached",
          currentCount: collection.count,
          maxRoster: maxRoster,
        };
      }

      let loungeData = loungePlayer;
      if (!loungeData) {
        const candidateName =
          typeof loungePlayerId === "string" ? loungePlayerId : null;
        loungeData = await this.loungeDAO.getPlayerByLoungeIdOrName(
          loungePlayerId,
          candidateName
        );
        if (!loungeData) {
          return {
            success: false,
            error: "player_not_found",
          };
        }
      }

      const player = await this.playerDAO.getOrCreatePlayerFromLounge(
        loungeData,
        discordServerId
      );

      if (!player || !player.IDPlayer) {
        console.error(
          "❌ Error: Player no se creó correctamente o no tiene IDPlayer:",
          player
        );
        return {
          success: false,
          error: "player_creation_failed",
        };
      }

      const alreadyOwns = await this.ownershipDAO.checkIfUserOwnsPlayer(
        user.UserID,
        player.IDPlayer
      );

      if (alreadyOwns) {
        return {
          success: false,
          error: "already_owned",
        };
      }

      const existingOwner = await this.getPlayerOwner(
        player.IDPlayer,
        discordServerId
      );

      if (existingOwner) {
        console.log(
          `⚠️ El jugador ${player.IDPlayer} ya es propiedad de otro usuario en este servidor`
        );
        return {
          success: false,
          error: "already_owned",
        };
      }

      const ownershipResult = await this.ownershipDAO.createOwnership(
        user.UserID,
        player.IDPlayer
      );

      if (!ownershipResult.success) {
        return ownershipResult;
      }

      console.log(
        `🔄 Actualizando CanClaim a false para usuario ${user.UserID} después del claim`
      );
      const updatedUser = await this.userDAO.updateCanClaim(user.UserID, false);
      console.log(
        `✅ CanClaim actualizado: ${updatedUser?.CanClaim} (debería ser false)`
      );

      try {
        const loungeId =
          player.LoungeID ||
          loungeData.lounge_id ||
          loungeData.id ||
          loungeData.loungeId;
        if (loungeId) {
          const removeResult =
            await this.wishlistDAO.removePlayerFromAllWishlistsInServerByLoungeId(
              discordServerId,
              loungeId
            );
          if (removeResult.success && removeResult.removedCount > 0) {
            console.log(
              `✅ Jugador con LoungeID ${loungeId} eliminado automáticamente de ${removeResult.removedCount} wishlist(s) del servidor ${discordServerId}`
            );
          }
        } else {
          const removeResult =
            await this.wishlistDAO.removePlayerFromAllWishlistsInServer(
              discordServerId,
              player.IDPlayer
            );
          if (removeResult.success && removeResult.removedCount > 0) {
            console.log(
              `✅ Jugador ${player.IDPlayer} eliminado automáticamente de ${removeResult.removedCount} wishlist(s) del servidor ${discordServerId}`
            );
          }
        }
      } catch (wishlistError) {
        console.error(
          "⚠️ Error eliminando jugador de wishlists del servidor tras claim:",
          wishlistError
        );
      }

      return {
        success: true,
        player: player,
        ownership: ownershipResult.ownership,
      };
    } catch (err) {
      console.error("❌ Error en claimPlayer del Model:", err);
      throw err;
    }
  }

  async getUserCollection(
    discordId,
    discordServerId,
    userName,
    guildLocale = null
  ) {
    try {
      const user = await this.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      const ownedPlayers = await this.getUserOwnedPlayers(user.UserID);

      return {
        success: true,
        user: user,
        players: ownedPlayers,
        count: ownedPlayers.length,
      };
    } catch (err) {
      console.error("❌ Error en getUserCollection del Model:", err);
      throw err;
    }
  }

  async getUserWishlist(discordId, discordServerId = null) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        null
      );
      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
          players: [],
          count: 0,
        };
      }

      const wishlistPlayers = await this.wishlistDAO.getUserWishlist(
        user.UserID,
        discordServerId
      );
      const count = wishlistPlayers.length;

      return {
        success: true,
        players: wishlistPlayers,
        count: count,
      };
    } catch (err) {
      console.error("❌ Error en getUserWishlist del Model:", err);
      throw err;
    }
  }

  async addPlayerToWishlist(
    discordId,
    discordServerId,
    userName,
    playerName,
    maxWishlist = null
  ) {
    try {
      const userRank = await this.getUserRankData(
        discordId,
        discordServerId,
        userName
      );
      const maxWishlists =
        maxWishlist !== null ? maxWishlist : userRank.wishlists;
      console.log(
        `📝 Usuario ${userName} - Rango: ${userRank.name}, Max wishlists: ${maxWishlists}`
      );

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );
      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const currentCount = await this.wishlistDAO.getWishlistCount(
        user.UserID,
        discordServerId
      );
      console.log(
        `📝 Usuario ${userName} - Wishlist actual: ${currentCount}/${maxWishlists}`
      );
      if (currentCount >= maxWishlists) {
        return {
          success: false,
          error: "wishlist_full",
          currentCount: currentCount,
          maxWishlist: maxWishlists,
        };
      }

      const loungePlayer = await this.loungeDAO.getPlayerByName(playerName);
      if (!loungePlayer) {
        return {
          success: false,
          error: "player_not_found",
        };
      }

      const player = await this.playerDAO.getOrCreatePlayerFromLounge(
        loungePlayer,
        discordServerId
      );
      if (!player || !player.IDPlayer) {
        return {
          success: false,
          error: "player_creation_failed",
        };
      }

      const result = await this.wishlistDAO.addPlayerToWishlist(
        user.UserID,
        player.IDPlayer
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        player: player,
        wishlist: result.wishlist,
      };
    } catch (err) {
      console.error("❌ Error en addPlayerToWishlist del Model:", err);
      throw err;
    }
  }

  async removePlayerFromWishlist(
    discordId,
    discordServerId,
    userName,
    playerName
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );
      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const loungePlayer = await this.loungeDAO.getPlayerByName(playerName);
      if (!loungePlayer) {
        return {
          success: false,
          error: "player_not_found",
        };
      }

      const loungeId =
        loungePlayer.lounge_id || loungePlayer.LoungeID || loungePlayer.id;
      const wishlistTableName = global.DEBUG ? "Wishlist" : "WishlistTest";
      const playerTableName = global.DEBUG ? "Player" : "PlayerTest";

      let player = await this.playerDAO.getClient().query(
        `SELECT DISTINCT p.* 
         FROM "${playerTableName}" p
         INNER JOIN "${wishlistTableName}" w ON p."IDPlayer" = w."PlayerID"
         WHERE p."LoungeID" = $1 AND w."UserID" = $2
         LIMIT 1;`,
        [loungeId, user.UserID]
      );

      player = player.rows[0] || null;

      if (!player || !player.IDPlayer) {
        return {
          success: false,
          error: "not_in_wishlist",
        };
      }

      const result = await this.wishlistDAO.removePlayerFromWishlist(
        user.UserID,
        player.IDPlayer
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        player: player,
        wishlist: result.wishlist,
      };
    } catch (err) {
      console.error("❌ Error en removePlayerFromWishlist del Model:", err);
      throw err;
    }
  }

  async getUsersWithPlayerInWishlist(playerId, discordServerId = null) {
    try {
      return await this.wishlistDAO.getUsersWithPlayerInWishlist(
        playerId,
        discordServerId
      );
    } catch (err) {
      console.error(
        "❌ Error obteniendo usuarios con jugador en wishlist:",
        err
      );
      throw err;
    }
  }

  async getUsersWithPlayerInWishlistByLoungeId(
    loungeId,
    discordServerId = null
  ) {
    try {
      return await this.wishlistDAO.getUsersWithPlayerInWishlistByLoungeId(
        loungeId,
        discordServerId
      );
    } catch (err) {
      console.error(
        "❌ Error obteniendo usuarios con jugador en wishlist por LoungeID:",
        err
      );
      throw err;
    }
  }

  async checkPlayerInUserWishlist(discordId, discordServerId, playerId) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        null
      );
      if (!user || !user.UserID) {
        return false;
      }

      return await this.wishlistDAO.checkPlayerInWishlist(
        user.UserID,
        playerId
      );
    } catch (err) {
      console.error(
        "❌ Error verificando jugador en wishlist del usuario:",
        err
      );
      return false;
    }
  }

  async getUserRankData(
    discordId,
    discordServerId,
    userName,
    guildLocale = null
  ) {
    try {
      const user = await this.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );
      const ranks = await Utils.getRanksData();
      const userElo = user?.Elo || 0;
      return Utils.findRankForElo(ranks, userElo);
    } catch (err) {
      console.error("❌ Error obteniendo rango del usuario:", err);
      const ranks = await Utils.getRanksData();
      return Utils.findRankForElo(ranks, 0);
    }
  }

  async updateUserEloWithRank(
    discordId,
    discordServerId,
    userName,
    newElo,
    existingUser = null
  ) {
    try {
      const normalizedElo = Math.max(0, Math.floor(newElo));
      const user =
        existingUser ||
        (await this.userDAO.getUserByIds(discordId, discordServerId, userName));

      if (!user || !user.UserID) {
        throw new Error(`User not found for ${discordId} (${discordServerId})`);
      }

      const oldElo = user.Elo || 0;
      const ranks = await Utils.getRanksData();
      const oldRank = Utils.findRankForElo(ranks, oldElo);
      const newRank = Utils.findRankForElo(ranks, normalizedElo);

      await this.userDAO.updateUserElo(user.UserID, normalizedElo);

      const rankDifference = newRank.id - oldRank.id;

      if (rankDifference > 0) {
        console.log(
          `📈 ${userName} subió de rango (${oldRank.name} -> ${newRank.name}). Rolls se mantienen hasta el próximo reset.`
        );
      } else if (rankDifference < 0) {
        console.log(
          `📉 ${userName} bajó de rango (${oldRank.name} -> ${newRank.name}). Rolls se mantienen hasta el próximo reset.`
        );
      }

      return {
        success: true,
        userId: user.UserID,
        oldElo,
        newElo: normalizedElo,
        oldRank,
        newRank,
        rollsDelta: 0,
        rollsLeft: user.RollsLeft ?? 0,
      };
    } catch (err) {
      console.error("❌ Error actualizando Elo y rango del usuario:", err);
      throw err;
    }
  }

  async acquireRank(discordId, discordServerId, userName, rank) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      const result = await this.updateUserEloWithRank(
        discordId,
        discordServerId,
        userName,
        rank.elo_needed,
        user
      );

      console.log(
        `✅ Rango ${rank.name} adquirido para usuario ${userName}. Elo: ${result.newElo}. Rolls restantes: ${result.rollsLeft}.`
      );

      return {
        success: true,
        rank: rank,
        rollsDelta: result.rollsDelta,
      };
    } catch (err) {
      console.error("❌ Error en acquireRank del Model:", err);
      throw err;
    }
  }

  async getSellPlayerInfo(discordId, discordServerId, userName, playerName) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const tokens = this.createPlayerTokens([playerName]);
      if (tokens.length === 0) {
        return {
          success: false,
          error: "player_not_found",
        };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const index = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const token = tokens[0];
      const match = this.resolveOwnedPlayerToken(token, index);

      if (!match) {
        return {
          success: false,
          error: token.type === "id" ? "not_owned" : "player_not_found",
        };
      }

      const playerRecord = match.data;

      const loungePlayer = {
        lounge_id: playerRecord?.LoungeID || null,
        name: match.displayName,
        mmr:
          playerRecord?.MMR ??
          playerRecord?.mmr ??
          playerRecord?.MarketValue ??
          0,
        peak_mmr: playerRecord?.PeakMMR ?? playerRecord?.peak_mmr ?? 0,
        events_played: playerRecord?.Events ?? playerRecord?.events_played ?? 0,
      };

      const attributes = {
        Lines: playerRecord?.Lines || 0,
        Consistency: playerRecord?.Consistency || 0,
        ItemUsage: playerRecord?.ItemUsage || 0,
        Precision: playerRecord?.Precision || 0,
        Communication: playerRecord?.Communication || 0,
        Mental: playerRecord?.Mental || 0,
        GameSense: playerRecord?.GameSense || 0,
        Shockfinding: playerRecord?.Shockfinding || 0,
      };

      const salePrice = Utils.getMarketValue(
        loungePlayer.mmr,
        loungePlayer.peak_mmr,
        loungePlayer.events_played,
        attributes
      );

      return {
        success: true,
        user,
        loungePlayer,
        playerRecord,
        salePrice,
      };
    } catch (err) {
      console.error("❌ Error en getSellPlayerInfo del Model:", err);
      throw err;
    }
  }

  async sellPlayer(discordId, discordServerId, userName, playerName) {
    try {
      const info = await this.getSellPlayerInfo(
        discordId,
        discordServerId,
        userName,
        playerName
      );

      if (!info.success) {
        return info;
      }

      const { user, loungePlayer, playerRecord, salePrice } = info;

      await this.ownershipDAO.removeOwnership(
        user.UserID,
        playerRecord.IDPlayer
      );

      const currentCoins = user.Coins || 0;
      const userElo = user.Elo || 0;
      const userRank = await Utils.getRankForElo(userElo);
      const discount = userRank?.discount || 0;

      const sellPercentage = (discount === 0 ? 50 : discount) / 100;
      const finalSalePrice = Math.round(salePrice * sellPercentage);
      const updatedCoins = currentCoins + finalSalePrice;
      await this.userDAO.updateUserCoins(user.UserID, updatedCoins);

      const candidateNames = [
        playerName,
        loungePlayer.name,
        playerRecord?.Alias,
        playerRecord?.Name,
      ].filter((value) => typeof value === "string" && value.trim().length > 0);

      await this.removePlayerFromLineupRecord(user, {
        playerIds: [playerRecord.IDPlayer],
        candidateNames,
      });

      await this.playerDAO.deletePlayer(playerRecord.IDPlayer);

      console.log(
        `💰 Usuario ${userName} vendió ${loungePlayer.name} por ${finalSalePrice} coins (50% del valor). Nuevo balance: ${updatedCoins}`
      );

      return {
        success: true,
        player: loungePlayer,
        salePrice: finalSalePrice,
        coins: updatedCoins,
      };
    } catch (err) {
      console.error("❌ Error en sellPlayer del Model:", err);
      throw err;
    }
  }

  async addPlayersToLineup(discordId, discordServerId, userName, players) {
    try {
      const sanitizedPlayers = Array.isArray(players)
        ? players
            .map((name) => (typeof name === "string" ? name.trim() : ""))
            .filter((name) => name.length > 0)
        : [];

      if (sanitizedPlayers.length === 0) {
        return { success: false, error: "no_players" };
      }

      if (sanitizedPlayers.length > 6) {
        return { success: false, error: "too_many_requested" };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const tokens = this.createPlayerTokens(sanitizedPlayers);
      if (tokens.length === 0) {
        return { success: false, error: "no_players" };
      }

      const index = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const missingPlayers = [];
      const matchedPlayers = [];
      const seenMatchedIds = new Set();

      tokens.forEach((token) => {
        const match = this.resolveOwnedPlayerToken(token, index);
        if (!match) {
          missingPlayers.push(token.raw);
          return;
        }

        if (!seenMatchedIds.has(match.id)) {
          matchedPlayers.push(match);
          seenMatchedIds.add(match.id);
        }
      });

      if (missingPlayers.length > 0) {
        return {
          success: false,
          error: "players_not_in_roster",
          players: missingPlayers,
        };
      }

      const existingLineupIds = this.getLineupPlayerIdsFromRecord(user);
      const existingIdSet = new Set(existingLineupIds);

      const newPlayers = [];
      for (const match of matchedPlayers) {
        if (!existingIdSet.has(match.id)) {
          existingIdSet.add(match.id);
          newPlayers.push(match);
        }
      }

      if (newPlayers.length === 0) {
        return {
          success: false,
          error: "players_already_present",
        };
      }

      const updatedIds = existingLineupIds.concat(
        newPlayers.map((player) => player.id)
      );

      if (updatedIds.length > 6) {
        return {
          success: false,
          error: "lineup_limit_exceeded",
          current: existingLineupIds.length,
          attempted: sanitizedPlayers.length,
          availableSlots: Math.max(0, 6 - existingLineupIds.length),
        };
      }

      await this.userDAO.updateUserLineup(user.UserID, updatedIds);

      const updateArray = this.buildLineupUpdateArray(updatedIds);
      LINEUP_SLOT_COLUMNS.forEach((column, index) => {
        user[column] = updateArray[index];
      });
      if ("LastLineup" in user) {
        user.LastLineup = null;
      }

      const userServerIdForLineup = user?.DiscordServerID || null;
      const updatedDetails = await this.getLineupDetailsByIds(
        updatedIds,
        ownedPlayers,
        userServerIdForLineup
      );

      return {
        success: true,
        lineup: updatedDetails.map((entry) => entry.displayName),
        added: newPlayers.map((player) => player.displayName),
      };
    } catch (err) {
      console.error("❌ Error en addPlayersToLineup del Model:", err);
      throw err;
    }
  }

  async setLineup(discordId, discordServerId, userName, players) {
    try {
      const sanitizedPlayers = Array.isArray(players)
        ? players
            .map((name) => (typeof name === "string" ? name.trim() : ""))
            .filter((name) => name.length > 0)
        : [];

      if (sanitizedPlayers.length > 6) {
        return { success: false, error: "too_many_players" };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const tokens = this.createPlayerTokens(sanitizedPlayers);
      if (tokens.length === 0 && sanitizedPlayers.length > 0) {
        return { success: false, error: "invalid_players" };
      }

      const index = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const missingPlayers = [];
      const matchedPlayers = [];
      const seenMatchedIds = new Set();

      tokens.forEach((token) => {
        const match = this.resolveOwnedPlayerToken(token, index);
        if (!match) {
          missingPlayers.push(token.raw);
          return;
        }

        const playerId = match.id;
        if (seenMatchedIds.has(playerId)) {
          return;
        }

        seenMatchedIds.add(playerId);
        matchedPlayers.push({
          id: playerId,
          displayName: this.getPlayerDisplayName(match.data, playerId),
        });
      });

      if (missingPlayers.length > 0) {
        return {
          success: false,
          error: "players_not_in_roster",
          players: missingPlayers,
        };
      }

      const lineupIds = matchedPlayers.map((player) => player.id);
      while (lineupIds.length < 6) {
        lineupIds.push(null);
      }
      lineupIds.splice(6);

      await this.userDAO.updateUserLineup(user.UserID, lineupIds);

      const updateArray = this.buildLineupUpdateArray(lineupIds);
      LINEUP_SLOT_COLUMNS.forEach((column, index) => {
        user[column] = updateArray[index];
      });
      if ("LastLineup" in user) {
        user.LastLineup = null;
      }

      const userServerIdForLineup = user?.DiscordServerID || null;
      const updatedDetails = await this.getLineupDetailsByIds(
        lineupIds.filter((id) => id !== null),
        ownedPlayers,
        userServerIdForLineup
      );

      return {
        success: true,
        lineup: updatedDetails.map((entry) => entry.displayName),
      };
    } catch (err) {
      console.error("❌ Error en setLineup del Model:", err);
      throw err;
    }
  }

  async removePlayersFromLineup(discordId, discordServerId, userName, players) {
    try {
      const sanitizeList = Array.isArray(players)
        ? players
            .map((name) => (typeof name === "string" ? name.trim() : ""))
            .filter((name) => name.length > 0)
        : [];

      if (sanitizeList.length === 0) {
        return { success: false, error: "no_players" };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const tokens = this.createPlayerTokens(sanitizeList);

      if (tokens.length === 0) {
        return { success: false, error: "no_players" };
      }

      const lineupDetails = await this.getLineupDetailsFromRecord(
        user,
        ownedPlayers
      );

      if (lineupDetails.length === 0) {
        return { success: false, error: "lineup_empty" };
      }

      const ownedIndex = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const lineupIds = new Set(
        lineupDetails
          .map((entry) => entry.id)
          .filter((id) => Number.isInteger(id) && id > 0)
      );

      const removed = [];
      const missing = [];
      const indicesToRemove = new Set();

      tokens.forEach((token) => {
        const match = this.resolveOwnedPlayerToken(token, ownedIndex);

        if (!match) {
          missing.push(token.raw);
          return;
        }

        if (!lineupIds.has(match.id)) {
          missing.push(token.raw);
          return;
        }

        const lineupIndex = lineupDetails.findIndex(
          (entry) => entry.id === match.id
        );

        if (lineupIndex === -1) {
          missing.push(token.raw);
          return;
        }

        if (!indicesToRemove.has(lineupIndex)) {
          indicesToRemove.add(lineupIndex);
          removed.push(match.displayName);
        }
      });

      if (missing.length > 0) {
        return {
          success: false,
          error: "players_not_in_lineup",
          players: missing,
        };
      }

      if (removed.length === 0) {
        return {
          success: false,
          error: "players_not_in_lineup",
          players: tokens.map((token) => token.raw),
        };
      }

      const updatedDetails = lineupDetails.filter(
        (_, index) => !indicesToRemove.has(index)
      );

      const updatedIds = updatedDetails.map((entry) => entry.id);

      await this.userDAO.updateUserLineup(user.UserID, updatedIds);

      const updateArray = this.buildLineupUpdateArray(updatedIds);
      LINEUP_SLOT_COLUMNS.forEach((column, index) => {
        user[column] = updateArray[index];
      });
      if ("LastLineup" in user) {
        user.LastLineup = null;
      }

      return {
        success: true,
        lineup: updatedDetails.map((entry) => entry.displayName),
        removed,
      };
    } catch (err) {
      console.error("❌ Error en removePlayersFromLineup del Model:", err);
      throw err;
    }
  }

  async buyElo(discordId, discordServerId, userName, coinsToSpend) {
    try {
      const amount = Math.floor(Number(coinsToSpend));

      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          success: false,
          error: "invalid_amount",
        };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName
      );

      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const currentCoins = user.Coins || 0;

      if (currentCoins < amount) {
        return {
          success: false,
          error: "not_enough_coins",
          coins: currentCoins,
        };
      }

      const userElo = user.Elo || 0;
      const ranks = await Utils.getRanksData();
      const currentRank = Utils.findRankForElo(ranks, userElo);
      const eloCost = currentRank.elo_cost || 1;

      const eloGained = Math.floor(amount * eloCost);

      const sortedRanks = [...ranks].sort((a, b) => {
        const eloA = a.elo_needed ?? 0;
        const eloB = b.elo_needed ?? 0;
        return eloA - eloB;
      });

      const currentRankIndex = sortedRanks.findIndex(
        (r) => r.name === currentRank.name
      );
      const nextRank = sortedRanks[currentRankIndex + 1];

      let eloNeededForNextRank = null;
      if (nextRank) {
        eloNeededForNextRank = nextRank.elo_needed - userElo;
      }

      if (eloNeededForNextRank !== null && eloGained > eloNeededForNextRank) {
        const coinsNeeded = Math.ceil(eloNeededForNextRank / eloCost);

        return {
          success: false,
          error: "exceeds_next_rank",
          eloNeeded: eloNeededForNextRank,
          coinsNeeded: coinsNeeded,
        };
      }

      const newEloValue = userElo + eloGained;
      const eloResult = await this.updateUserEloWithRank(
        discordId,
        discordServerId,
        userName,
        newEloValue,
        user
      );

      const updatedCoins = currentCoins - amount;
      await this.userDAO.updateUserCoins(user.UserID, updatedCoins);

      console.log(
        `💹 Usuario ${userName} convirtió ${amount} coins a Elo (multiplicador: ${eloCost.toFixed(
          2
        )}x). Elo ganado: ${eloGained}. Nuevo Elo: ${eloResult.newElo}. Rank: ${
          eloResult.newRank.name
        }.`
      );

      return {
        success: true,
        spent: amount,
        coins: updatedCoins,
        elo: eloResult.newElo,
        eloGained: eloGained,
        rank: eloResult.newRank,
      };
    } catch (err) {
      console.error("❌ Error en buyElo del Model:", err);
      throw err;
    }
  }

  async updatePlayerAlias(
    discordId,
    discordServerId,
    userName,
    playerIdentifier,
    rawAlias,
    guildLocale = null
  ) {
    try {
      const alias =
        typeof rawAlias === "string"
          ? rawAlias.replace(/\s+/g, " ").trim()
          : "";

      if (!alias) {
        return { success: false, error: "alias_missing" };
      }

      const maxLength = 25;
      if (alias.length > maxLength) {
        return { success: false, error: "alias_too_long", maxLength };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const isRestricted = await this.userDAO.isUserRestricted(
        discordId,
        discordServerId
      );

      if (isRestricted) {
        return { success: false, error: "name_restricted" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const tokens = this.createPlayerTokens([playerIdentifier]);
      if (tokens.length === 0) {
        return { success: false, error: "player_not_found" };
      }

      const index = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const match = this.resolveOwnedPlayerToken(tokens[0], index);
      if (!match) {
        return { success: false, error: "not_in_roster" };
      }

      const currentAlias = match.data?.OwnershipAlias || null;
      if (currentAlias && currentAlias === alias) {
        return {
          success: false,
          error: "alias_no_change",
          alias: currentAlias,
        };
      }

      const updatedOwnership = await this.ownershipDAO.updateOwnershipAlias(
        user.UserID,
        match.id,
        alias
      );

      if (!updatedOwnership) {
        return { success: false, error: "update_failed" };
      }

      return {
        success: true,
        playerId: match.id,
        newAlias: alias,
        previousAlias: currentAlias,
        originalName:
          match.data?.LoungeName || match.data?.Name || `Player #${match.id}`,
      };
    } catch (err) {
      console.error("❌ Error actualizando alias del jugador:", err);
      throw err;
    }
  }

  async removePlayerAliasForUser(
    discordId,
    discordServerId,
    userName,
    playerIdentifier,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const tokens = this.createPlayerTokens([playerIdentifier]);
      if (tokens.length === 0) {
        return { success: false, error: "player_not_found" };
      }

      const index = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const match = this.resolveOwnedPlayerToken(tokens[0], index);
      if (!match) {
        return { success: false, error: "not_in_roster" };
      }

      const currentAlias = match.data?.OwnershipAlias || null;
      if (!currentAlias) {
        return {
          success: false,
          error: "no_alias",
          playerName:
            match.data?.LoungeName || match.data?.Name || `Player #${match.id}`,
        };
      }

      const updatedOwnership = await this.ownershipDAO.removeOwnershipAlias(
        user.UserID,
        match.id
      );

      if (!updatedOwnership) {
        return { success: false, error: "update_failed" };
      }

      return {
        success: true,
        playerId: match.id,
        previousAlias: currentAlias,
        playerName:
          match.data?.LoungeName || match.data?.Name || `Player #${match.id}`,
      };
    } catch (err) {
      console.error("❌ Error removiendo alias del jugador:", err);
      throw err;
    }
  }

  async removePlayerFromUser(
    discordId,
    discordServerId,
    userName,
    playerIdentifier,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      const tokens = this.createPlayerTokens([playerIdentifier]);
      if (tokens.length === 0) {
        return { success: false, error: "player_not_found" };
      }

      const index = this.buildOwnedPlayerIndex(
        ownedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );

      const match = this.resolveOwnedPlayerToken(tokens[0], index);
      if (!match) {
        return { success: false, error: "not_in_roster" };
      }

      const playerId = match.id;
      const playerName =
        match.displayName ||
        match.data?.LoungeName ||
        match.data?.Name ||
        `Player #${playerId}`;

      const removeResult = await this.ownershipDAO.removeOwnership(
        user.UserID,
        playerId
      );

      if (!removeResult.success) {
        return { success: false, error: "remove_failed" };
      }

      const candidateNames = [
        playerName,
        match.data?.LoungeName,
        match.data?.Name,
        match.data?.Alias,
        playerIdentifier,
      ].filter((value) => typeof value === "string" && value.trim().length > 0);

      try {
        await this.removePlayerFromLineupRecord(user, {
          playerIds: [playerId],
          candidateNames,
        });
      } catch (err) {
        console.error(
          "⚠️ No se pudo quitar el jugador de la lineup tras removeplayer:",
          err
        );
      }

      await this.playerDAO.deletePlayer(playerId);

      return {
        success: true,
        playerId: playerId,
        playerName: playerName,
      };
    } catch (err) {
      console.error("❌ Error removiendo jugador del usuario:", err);
      throw err;
    }
  }

  async clearUserRoster(
    discordId,
    discordServerId,
    userName,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const ownedPlayers = await this.ownershipDAO.getUserOwnedPlayers(
        user.UserID
      );

      if (!ownedPlayers || ownedPlayers.length === 0) {
        return { success: true, playersRemoved: 0 };
      }

      const playerIds = ownedPlayers.map((p) => p.PlayerID || p.IDPlayer);
      const candidateNames = ownedPlayers.map((p) => {
        return (
          p.OwnershipAlias ||
          p.LoungeName ||
          p.Name ||
          `Player #${p.PlayerID || p.IDPlayer}`
        );
      });

      try {
        await this.removePlayerFromLineupRecord(user, {
          playerIds: playerIds,
          candidateNames: candidateNames,
        });
      } catch (err) {
        console.error(
          "⚠️ No se pudo quitar los jugadores de la lineup tras clearroster:",
          err
        );
      }

      let removedCount = 0;
      for (const playerId of playerIds) {
        try {
          const removeResult = await this.ownershipDAO.removeOwnership(
            user.UserID,
            playerId
          );
          if (removeResult.success) {
            removedCount++;
            await this.playerDAO.deletePlayer(playerId);
          }
        } catch (err) {
          console.error(
            `⚠️ Error removiendo player ${playerId} en clearroster:`,
            err
          );
        }
      }

      return {
        success: true,
        playersRemoved: removedCount,
      };
    } catch (err) {
      console.error("❌ Error limpiando roster del usuario:", err);
      throw err;
    }
  }

  async updateTeamName(
    discordId,
    discordServerId,
    userName,
    rawTeamName,
    guildLocale = null
  ) {
    try {
      const maxLength = 30;
      const sanitizedInput =
        typeof rawTeamName === "string"
          ? rawTeamName.replace(/\s+/g, " ").trim()
          : "";

      if (!sanitizedInput) {
        return { success: false, error: "empty" };
      }

      if (sanitizedInput.length > maxLength) {
        return { success: false, error: "too_long", maxLength };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const isRestricted = await this.userDAO.isUserRestricted(
        discordId,
        discordServerId
      );

      if (isRestricted) {
        return { success: false, error: "name_restricted" };
      }

      const currentTeamName = (user.TeamName || "").trim();
      if (currentTeamName === sanitizedInput) {
        return {
          success: false,
          error: "no_change",
          teamName: currentTeamName,
        };
      }

      const teamnameExists = await this.userDAO.teamnameExistsInServer(
        discordServerId,
        sanitizedInput,
        user.UserID
      );

      if (teamnameExists) {
        return { success: false, error: "teamname_taken" };
      }

      const updatedUser = await this.userDAO.updateUserTeamName(
        user.UserID,
        sanitizedInput
      );

      if (!updatedUser || !updatedUser.TeamName) {
        return { success: false, error: "update_failed" };
      }

      return {
        success: true,
        teamName: updatedUser.TeamName,
        previousTeamName: currentTeamName || null,
      };
    } catch (err) {
      console.error("❌ Error actualizando el nombre del equipo:", err);
      throw err;
    }
  }

  async updateTeamNameForUser(
    discordId,
    discordServerId,
    userName,
    rawTeamName,
    guildLocale = null
  ) {
    try {
      const maxLength = 30;
      const sanitizedInput =
        typeof rawTeamName === "string"
          ? rawTeamName.replace(/\s+/g, " ").trim()
          : "";

      if (!sanitizedInput) {
        return { success: false, error: "empty" };
      }

      if (sanitizedInput.length > maxLength) {
        return { success: false, error: "too_long", maxLength };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const currentTeamName = (user.TeamName || "").trim();
      if (currentTeamName === sanitizedInput) {
        return {
          success: false,
          error: "no_change",
          teamName: currentTeamName,
        };
      }

      const teamnameExists = await this.userDAO.teamnameExistsInServer(
        discordServerId,
        sanitizedInput,
        user.UserID
      );

      if (teamnameExists) {
        return { success: false, error: "teamname_taken" };
      }

      const updatedUser = await this.userDAO.updateUserTeamName(
        user.UserID,
        sanitizedInput
      );

      if (!updatedUser || !updatedUser.TeamName) {
        return { success: false, error: "update_failed" };
      }

      return {
        success: true,
        teamName: updatedUser.TeamName,
        previousTeamName: currentTeamName || null,
      };
    } catch (err) {
      console.error("❌ Error actualizando el nombre del equipo:", err);
      throw err;
    }
  }

  async updateTag(
    discordId,
    discordServerId,
    userName,
    rawTag,
    guildLocale = null
  ) {
    try {
      const maxLength = 5;
      const sanitizedInput = typeof rawTag === "string" ? rawTag.trim() : "";

      if (!sanitizedInput) {
        return { success: false, error: "empty" };
      }

      if (sanitizedInput.length > maxLength) {
        return { success: false, error: "too_long", maxLength };
      }

      if (sanitizedInput.toUpperCase() === "CPU") {
        return { success: false, error: "tag_cpu_forbidden" };
      }

      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const isRestricted = await this.userDAO.isUserRestricted(
        discordId,
        discordServerId
      );

      if (isRestricted) {
        return { success: false, error: "name_restricted" };
      }

      const currentTag = (user.Tag || "").trim();
      if (currentTag === sanitizedInput) {
        return {
          success: false,
          error: "no_change",
          tag: currentTag,
        };
      }

      const updatedUser = await this.userDAO.updateUserTag(
        user.UserID,
        sanitizedInput
      );

      if (!updatedUser || !updatedUser.Tag) {
        return { success: false, error: "update_failed" };
      }

      return {
        success: true,
        tag: updatedUser.Tag,
        previousTag: currentTag || null,
      };
    } catch (error) {
      console.error("❌ Error en updateTag:", error);
      throw error;
    }
  }

  async updateTagForUser(
    targetDiscordId,
    targetDiscordServerId,
    targetName,
    rawTag,
    guildLocale = null
  ) {
    try {
      const maxLength = 5;
      const sanitizedInput = typeof rawTag === "string" ? rawTag.trim() : "";

      if (!sanitizedInput) {
        return { success: false, error: "empty" };
      }

      if (sanitizedInput.length > maxLength) {
        return { success: false, error: "too_long", maxLength };
      }

      if (sanitizedInput.toUpperCase() === "CPU") {
        return { success: false, error: "tag_cpu_forbidden" };
      }

      const user = await this.userDAO.getUserByIds(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const currentTag = (user.Tag || "").trim();
      if (currentTag === sanitizedInput) {
        return {
          success: false,
          error: "no_change",
          tag: currentTag,
        };
      }

      const updatedUser = await this.userDAO.updateUserTag(
        user.UserID,
        sanitizedInput
      );

      if (!updatedUser || !updatedUser.Tag) {
        return { success: false, error: "update_failed" };
      }

      return {
        success: true,
        tag: updatedUser.Tag,
        previousTag: currentTag || null,
        userName: targetName,
      };
    } catch (error) {
      console.error("❌ Error en updateTagForUser:", error);
      throw error;
    }
  }

  async removePlayerFromLineupRecord(
    userRecord,
    { playerIds = [], candidateNames = [] } = {}
  ) {
    try {
      if (!userRecord || !userRecord.UserID) {
        return { updated: false };
      }

      const lineupDetails = await this.getLineupDetailsFromRecord(userRecord);
      if (!Array.isArray(lineupDetails) || lineupDetails.length === 0) {
        return { updated: false };
      }

      const targetIdSet = new Set(
        Array.isArray(playerIds)
          ? playerIds
              .map((value) => Number(value))
              .filter((value) => Number.isInteger(value))
          : []
      );

      const candidateKeySet = new Set();
      if (Array.isArray(candidateNames)) {
        candidateNames.forEach((name) => {
          const key = this.normalizePlayerKey(name);
          if (key) {
            candidateKeySet.add(key);
          }
        });
      }

      if (targetIdSet.size === 0 && candidateKeySet.size === 0) {
        return { updated: false };
      }

      const remaining = [];
      let updated = false;

      lineupDetails.forEach((entry) => {
        const nameKey = this.normalizePlayerKey(entry.displayName);
        const removeById = targetIdSet.has(entry.id);
        const removeByName =
          !removeById && nameKey && candidateKeySet.has(nameKey);

        if (removeById || removeByName) {
          updated = true;
          if (removeById) {
            targetIdSet.delete(entry.id);
          } else if (removeByName) {
            candidateKeySet.delete(nameKey);
          }
        } else {
          remaining.push(entry);
        }
      });

      if (!updated) {
        return { updated: false };
      }

      const remainingIds = remaining.map((entry) => entry.id);
      await this.userDAO.updateUserLineup(userRecord.UserID, remainingIds);

      LINEUP_SLOT_COLUMNS.forEach((column, index) => {
        userRecord[column] = remainingIds[index] ?? null;
      });
      if ("LastLineup" in userRecord) {
        userRecord.LastLineup = null;
      }

      return {
        updated: true,
        lineup: remaining.map((entry) => entry.displayName),
      };
    } catch (err) {
      console.error("❌ Error removiendo jugador de la lineup:", err);
      throw err;
    }
  }

  async createWarRequest(
    challengerId,
    opponentId,
    type,
    amount,
    metadata = {}
  ) {
    try {
      return this.warManager.createRequest(
        challengerId,
        opponentId,
        type,
        amount,
        metadata
      );
    } catch (err) {
      console.error("❌ Error creando solicitud de war:", err);
      throw err;
    }
  }

  async respondToWarRequest(responderId, action, challengerId = null) {
    try {
      return this.warManager.respond(responderId, action, challengerId);
    } catch (err) {
      console.error("❌ Error respondiendo solicitud de war:", err);
      throw err;
    }
  }

  findWarRequestByChallenger(challengerId) {
    return this.warManager._findRequestByChallenger(challengerId);
  }

  countPendingRequestsForChallenger(challengerId) {
    return this.warManager._countPendingRequestsForChallenger(challengerId);
  }

  setWarRequestTimeout(key, timeoutId) {
    this.warManager.setRequestTimeout(key, timeoutId);
  }

  cancelWarRequestTimeout(key) {
    this.warManager.cancelRequestTimeout(key);
  }

  expireWarRequest(key) {
    this.warManager.expireRequest(key);
  }

  async createWarInDatabase(
    challengerUserId,
    challengedUserId,
    type,
    betAmount = 0
  ) {
    try {
      return await this.warDAO.createWar(
        challengerUserId,
        challengedUserId,
        type,
        betAmount
      );
    } catch (err) {
      console.error("❌ Error creando war en base de datos:", err);
      throw err;
    }
  }

  async updateWarResult(warId, result) {
    try {
      return await this.warDAO.updateWarResult(warId, result);
    } catch (err) {
      console.error("❌ Error actualizando resultado de war:", err);
      throw err;
    }
  }

  async getUser(discordId, discordServerId, userName, guildLocale = null) {
    try {
      return await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );
    } catch (err) {
      console.error("❌ Error obteniendo usuario:", err);
      throw err;
    }
  }

  async getUserOwnedPlayers(userId) {
    try {
      return await this.ownershipDAO.getUserOwnedPlayers(userId);
    } catch (err) {
      console.error("❌ Error obteniendo jugadores poseídos:", err);
      throw err;
    }
  }

  async getPlayerByLoungeId(loungeId) {
    try {
      return await this.playerDAO.getPlayerByLoungeId(loungeId);
    } catch (err) {
      console.error("❌ Error obteniendo jugador por Lounge ID:", err);
      throw err;
    }
  }

  async getPlayerByLoungeIdInServer(loungeId, discordServerId) {
    try {
      return await this.playerDAO.getPlayerByLoungeIdInServer(
        loungeId,
        discordServerId
      );
    } catch (err) {
      console.error(
        "❌ Error obteniendo jugador por Lounge ID en servidor:",
        err
      );
      throw err;
    }
  }

  async getPlayerByIdInServer(playerId, discordServerId) {
    try {
      return await this.playerDAO.getPlayerByIdInServer(
        playerId,
        discordServerId
      );
    } catch (err) {
      console.error("❌ Error obteniendo jugador por ID en servidor:", err);
      throw err;
    }
  }

  async getPlayersByIdsInServer(playerIds, discordServerId) {
    try {
      return await this.playerDAO.getPlayersByIdsInServer(
        playerIds,
        discordServerId
      );
    } catch (err) {
      console.error("❌ Error obteniendo jugadores por IDs en servidor:", err);
      throw err;
    }
  }

  async getPlayerOwner(playerId, discordServerId) {
    try {
      return await this.ownershipDAO.getPlayerOwner(playerId, discordServerId);
    } catch (err) {
      console.error("❌ Error obteniendo propietario del jugador:", err);
      throw err;
    }
  }

  async getLoungePlayerByName(playerName) {
    try {
      return await this.loungeDAO.getPlayerByName(playerName);
    } catch (err) {
      console.error("❌ Error obteniendo jugador de Lounge por nombre:", err);
      throw err;
    }
  }

  async transferOwnership(senderUserId, recipientUserId, playerId) {
    try {
      return await this.ownershipDAO.transferOwnership(
        senderUserId,
        recipientUserId,
        playerId
      );
    } catch (err) {
      console.error("❌ Error transferiendo ownership:", err);
      throw err;
    }
  }

  async transferOwnershipWithRosterCheck(
    senderUserId,
    recipientUserId,
    recipientDiscordId,
    recipientDiscordServerId,
    recipientName,
    playerId,
    guildLocale = null
  ) {
    try {
      const recipientRank = await this.getUserRankData(
        recipientDiscordId,
        recipientDiscordServerId,
        recipientName
      );
      const maxRoster = recipientRank.max_roster;

      const recipientCollection = await this.getUserCollection(
        recipientDiscordId,
        recipientDiscordServerId,
        recipientName,
        guildLocale
      );

      console.log(
        `👥 Usuario ${recipientName} - Roster actual: ${recipientCollection.count}/${maxRoster}`
      );

      if (recipientCollection.count >= maxRoster) {
        const toSell = recipientCollection.count - maxRoster + 1;
        return {
          success: false,
          error: "recipient_roster_full",
          currentCount: recipientCollection.count,
          maxRoster: maxRoster,
          toSell: toSell,
        };
      }

      return await this.ownershipDAO.transferOwnership(
        senderUserId,
        recipientUserId,
        playerId
      );
    } catch (err) {
      console.error(
        "❌ Error transferiendo ownership con validación de roster:",
        err
      );
      throw err;
    }
  }

  async updateUserCoins(userId, coins) {
    try {
      return await this.userDAO.updateUserCoins(userId, coins);
    } catch (err) {
      console.error("❌ Error actualizando monedas del usuario:", err);
      throw err;
    }
  }

  async addCoinsToUser(
    discordId,
    discordServerId,
    userName,
    amount,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const currentCoins = user.Coins || 0;
      const amountNum = Number(amount);

      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return { success: false, error: "invalid_amount" };
      }

      const newCoins = currentCoins + amountNum;
      await this.userDAO.updateUserCoins(user.UserID, newCoins);

      return {
        success: true,
        previousCoins: currentCoins,
        addedCoins: amountNum,
        newCoins: newCoins,
      };
    } catch (err) {
      console.error("❌ Error añadiendo monedas al usuario:", err);
      throw err;
    }
  }

  async removeCoinsFromUser(
    discordId,
    discordServerId,
    userName,
    amount,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const currentCoins = user.Coins || 0;
      const amountNum = Number(amount);

      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return { success: false, error: "invalid_amount" };
      }

      if (currentCoins < amountNum) {
        return { success: false, error: "insufficient_coins" };
      }

      const newCoins = currentCoins - amountNum;
      await this.userDAO.updateUserCoins(user.UserID, newCoins);

      return {
        success: true,
        previousCoins: currentCoins,
        removedCoins: amountNum,
        newCoins: newCoins,
      };
    } catch (err) {
      console.error("❌ Error quitando monedas al usuario:", err);
      throw err;
    }
  }

  async createSaleOffer(
    sellerDiscordId,
    sellerDiscordServerId,
    sellerName,
    buyerDiscordId,
    buyerDiscordServerId,
    buyerName,
    playerName,
    customPrice = null,
    guildLocale = null
  ) {
    try {
      const sellerUser = await this.getUser(
        sellerDiscordId,
        sellerDiscordServerId,
        sellerName,
        guildLocale
      );

      const sellInfo = await this.getSellPlayerInfo(
        sellerDiscordId,
        sellerDiscordServerId,
        sellerName,
        playerName
      );

      if (!sellInfo.success) {
        return sellInfo;
      }

      const { playerRecord, salePrice } = sellInfo;

      const buyerUser = await this.getUser(
        buyerDiscordId,
        buyerDiscordServerId,
        buyerName,
        guildLocale
      );

      let finalPrice = salePrice;

      if (customPrice !== null && customPrice !== undefined) {
        const customPriceNum = Number(customPrice);
        if (!Number.isFinite(customPriceNum) || customPriceNum <= 0) {
          return {
            success: false,
            error: "invalid_price",
          };
        }

        const minPrice = Math.floor(salePrice * 0.5);
        const maxPrice = salePrice * 2;

        if (customPriceNum < minPrice || customPriceNum > maxPrice) {
          return {
            success: false,
            error: "price_out_of_range",
            minPrice,
            maxPrice,
            marketPrice: salePrice,
          };
        }

        finalPrice = Math.round(customPriceNum);
      }

      const offerResult = this.saleManager.createSaleOffer(
        sellerUser.UserID,
        buyerUser.UserID,
        playerRecord.IDPlayer,
        sellInfo.loungePlayer.name || playerName,
        finalPrice
      );

      if (!offerResult.success) {
        return offerResult;
      }

      return {
        success: true,
        offer: offerResult.offer,
        sellerUser,
        buyerUser,
        playerInfo: sellInfo,
        salePrice: finalPrice,
        marketPrice: salePrice,
      };
    } catch (err) {
      console.error("❌ Error creando oferta de venta:", err);
      return {
        success: false,
        error: "unknown_error",
      };
    }
  }

  async completeSale(
    buyerDiscordId,
    buyerDiscordServerId,
    buyerName,
    sellerDiscordId,
    guildLocale = null
  ) {
    try {
      const buyerUser = await this.getUser(
        buyerDiscordId,
        buyerDiscordServerId,
        buyerName,
        guildLocale
      );

      const sellerUser = await this.getUser(
        sellerDiscordId,
        buyerDiscordServerId,
        null,
        guildLocale
      );

      if (!sellerUser || !sellerUser.UserID) {
        return {
          success: false,
          error: "seller_not_found",
        };
      }

      let offer = this.saleManager.getSaleOfferByBuyer(buyerUser.UserID);

      if (
        !offer ||
        offer.status !== "pending" ||
        offer.sellerId !== sellerUser.UserID
      ) {
        return {
          success: false,
          error: "no_pending_offer",
        };
      }

      this.saleManager.cancelOfferTimeout(sellerUser.UserID, buyerUser.UserID);

      const finalPrice = offer.salePrice;
      const buyerCoins = buyerUser.Coins || 0;
      if (buyerCoins < finalPrice) {
        return {
          success: false,
          error: "not_enough_coins",
          coins: buyerCoins,
        };
      }
      const sellerOwnedPlayers = await this.getUserOwnedPlayers(
        sellerUser.UserID
      );
      const playerMatch = sellerOwnedPlayers.find(
        (p) => p.IDPlayer === offer.playerId
      );

      if (!playerMatch) {
        this.saleManager.cancelOfferTimeout(
          sellerUser.UserID,
          buyerUser.UserID
        );
        this.saleManager.removeSaleOffer(sellerUser.UserID, buyerUser.UserID);
        return {
          success: false,
          error: "player_no_longer_owned",
        };
      }

      const buyerOwnedPlayers = await this.getUserOwnedPlayers(
        buyerUser.UserID
      );
      const buyerAlreadyOwns = buyerOwnedPlayers.some(
        (p) => p.IDPlayer === offer.playerId
      );

      if (buyerAlreadyOwns) {
        this.saleManager.cancelOfferTimeout(
          sellerUser.UserID,
          buyerUser.UserID
        );
        this.saleManager.removeSaleOffer(sellerUser.UserID, buyerUser.UserID);
        return {
          success: false,
          error: "buyer_already_owns",
        };
      }

      const transferResult = await this.transferOwnershipWithRosterCheck(
        sellerUser.UserID,
        buyerUser.UserID,
        buyerDiscordId,
        buyerDiscordServerId,
        buyerName,
        offer.playerId,
        guildLocale
      );

      if (!transferResult.success) {
        return transferResult;
      }

      const newBuyerCoins = buyerCoins - finalPrice;
      const sellerCoins = sellerUser.Coins || 0;
      const newSellerCoins = sellerCoins + finalPrice;

      await this.userDAO.updateUserCoins(buyerUser.UserID, newBuyerCoins);
      await this.userDAO.updateUserCoins(sellerUser.UserID, newSellerCoins);

      this.saleManager.cancelOfferTimeout(sellerUser.UserID, buyerUser.UserID);
      this.saleManager.removeSaleOffer(sellerUser.UserID, buyerUser.UserID);

      try {
        await this.removePlayerFromLineupRecord(sellerUser, {
          playerIds: [offer.playerId],
          candidateNames: [offer.playerName],
        });
      } catch (err) {
        console.error(
          "⚠️ No se pudo quitar el jugador de la lineup tras venta:",
          err
        );
      }

      try {
        const player = await this.playerDAO.getPlayerById(offer.playerId);
        const loungeId =
          player?.LoungeID ||
          player?.lounge_id ||
          player?.id ||
          player?.loungeId;
        if (loungeId && buyerUser?.UserID) {
          const removeResult =
            await this.wishlistDAO.removePlayerFromWishlistByLoungeId(
              buyerUser.UserID,
              loungeId
            );
          if (removeResult.success && removeResult.removedCount > 0) {
            console.log(
              `✅ Jugador con LoungeID ${loungeId} eliminado automáticamente de la wishlist del usuario ${buyerUser.UserID} tras compra`
            );
          }
        } else if (buyerUser?.UserID) {
          const removeResult = await this.wishlistDAO.removePlayerFromWishlist(
            buyerUser.UserID,
            offer.playerId
          );
          if (removeResult.success) {
            console.log(
              `✅ Jugador ${offer.playerId} eliminado automáticamente de la wishlist del usuario ${buyerUser.UserID} tras compra`
            );
          }
        }
      } catch (wishlistError) {
        console.error(
          "⚠️ Error eliminando jugador de wishlist del comprador tras compra:",
          wishlistError
        );
      }

      console.log(
        `💰 Venta completada: Usuario ${sellerUser.UserID} vendió ${offer.playerName} a usuario ${buyerUser.UserID} por ${finalPrice} coins.`
      );

      return {
        success: true,
        playerName: offer.playerName,
        salePrice: finalPrice,
        sellerCoins: newSellerCoins,
        buyerCoins: newBuyerCoins,
      };
    } catch (err) {
      console.error("❌ Error completando venta:", err);
      return {
        success: false,
        error: "unknown_error",
      };
    }
  }

  async createTradeOffer(
    initiatorDiscordId,
    initiatorDiscordServerId,
    initiatorName,
    targetDiscordId,
    targetDiscordServerId,
    targetName,
    initiatorPlayerName,
    targetPlayerName,
    guildLocale = null
  ) {
    try {
      const initiatorUser = await this.getUser(
        initiatorDiscordId,
        initiatorDiscordServerId,
        initiatorName,
        guildLocale
      );

      const targetUser = await this.getUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        guildLocale
      );

      const initiatorOwnedPlayers = await this.getUserOwnedPlayers(
        initiatorUser.UserID
      );
      const initiatorIndex = this.buildOwnedPlayerIndex(
        initiatorOwnedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );
      const initiatorTokens = this.createPlayerTokens([initiatorPlayerName]);
      const initiatorMatch = this.resolveOwnedPlayerToken(
        initiatorTokens[0],
        initiatorIndex
      );

      if (!initiatorMatch) {
        return {
          success: false,
          error: "initiator_player_not_owned",
        };
      }

      const targetOwnedPlayers = await this.getUserOwnedPlayers(
        targetUser.UserID
      );
      const targetIndex = this.buildOwnedPlayerIndex(
        targetOwnedPlayers,
        (playerData, playerId) =>
          this.getPlayerDisplayName(playerData, playerId)
      );
      const targetTokens = this.createPlayerTokens([targetPlayerName]);
      const targetMatch = this.resolveOwnedPlayerToken(
        targetTokens[0],
        targetIndex
      );

      if (!targetMatch) {
        return {
          success: false,
          error: "target_player_not_owned",
        };
      }

      const initiatorPlayerId = initiatorMatch.id;
      const targetPlayerId = targetMatch.id;

      if (initiatorPlayerId === targetPlayerId) {
        return {
          success: false,
          error: "same_player",
        };
      }

      const initiatorPlayerDisplayName =
        initiatorMatch.data?.LoungeName ||
        initiatorMatch.data?.Name ||
        initiatorMatch.data?.PlayerName ||
        initiatorPlayerName;
      const targetPlayerDisplayName =
        targetMatch.data?.LoungeName ||
        targetMatch.data?.Name ||
        targetMatch.data?.PlayerName ||
        targetPlayerName;

      const offerResult = this.tradeManager.createTradeOffer(
        initiatorUser.UserID,
        targetUser.UserID,
        initiatorPlayerId,
        targetPlayerId,
        initiatorPlayerDisplayName,
        targetPlayerDisplayName
      );

      if (!offerResult.success) {
        return offerResult;
      }

      return {
        success: true,
        offer: offerResult.offer,
        initiatorUser,
        targetUser,
        initiatorPlayerId,
        targetPlayerId,
        initiatorPlayerName: initiatorPlayerDisplayName,
        targetPlayerName: targetPlayerDisplayName,
      };
    } catch (err) {
      console.error("❌ Error creando oferta de trade:", err);
      return {
        success: false,
        error: "unknown_error",
      };
    }
  }

  async completeTrade(
    targetDiscordId,
    targetDiscordServerId,
    targetName,
    initiatorDiscordId,
    guildLocale = null
  ) {
    try {
      const targetUser = await this.getUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        guildLocale
      );

      const initiatorUser = await this.getUser(
        initiatorDiscordId,
        targetDiscordServerId,
        null,
        guildLocale
      );

      if (!initiatorUser || !initiatorUser.UserID) {
        return {
          success: false,
          error: "initiator_not_found",
        };
      }

      let offer = this.tradeManager.getTradeOfferByTarget(targetUser.UserID);

      if (
        !offer ||
        offer.status !== "pending" ||
        offer.initiatorId !== initiatorUser.UserID
      ) {
        return {
          success: false,
          error: "no_pending_offer",
        };
      }

      this.tradeManager.cancelOfferTimeout(
        initiatorUser.UserID,
        targetUser.UserID
      );

      const initiatorOwnedPlayers = await this.getUserOwnedPlayers(
        initiatorUser.UserID
      );
      const initiatorStillOwns = initiatorOwnedPlayers.some(
        (p) => p.IDPlayer === offer.initiatorPlayerId
      );

      if (!initiatorStillOwns) {
        this.tradeManager.cancelOfferTimeout(
          initiatorUser.UserID,
          targetUser.UserID
        );
        this.tradeManager.removeTradeOffer(
          initiatorUser.UserID,
          targetUser.UserID
        );
        return {
          success: false,
          error: "initiator_player_no_longer_owned",
        };
      }

      const targetOwnedPlayers = await this.getUserOwnedPlayers(
        targetUser.UserID
      );
      const targetStillOwns = targetOwnedPlayers.some(
        (p) => p.IDPlayer === offer.targetPlayerId
      );

      if (!targetStillOwns) {
        this.tradeManager.cancelOfferTimeout(
          initiatorUser.UserID,
          targetUser.UserID
        );
        this.tradeManager.removeTradeOffer(
          initiatorUser.UserID,
          targetUser.UserID
        );
        return {
          success: false,
          error: "target_player_no_longer_owned",
        };
      }

      const initiatorAlreadyHasTarget = initiatorOwnedPlayers.some(
        (p) => p.IDPlayer === offer.targetPlayerId
      );
      const targetAlreadyHasInitiator = targetOwnedPlayers.some(
        (p) => p.IDPlayer === offer.initiatorPlayerId
      );

      if (initiatorAlreadyHasTarget || targetAlreadyHasInitiator) {
        this.tradeManager.cancelOfferTimeout(
          initiatorUser.UserID,
          targetUser.UserID
        );
        this.tradeManager.removeTradeOffer(
          initiatorUser.UserID,
          targetUser.UserID
        );
        return {
          success: false,
          error: "player_already_owned",
        };
      }

      const transfer1Result = await this.transferOwnership(
        initiatorUser.UserID,
        targetUser.UserID,
        offer.initiatorPlayerId
      );

      if (!transfer1Result.success) {
        return transfer1Result;
      }

      const transfer2Result = await this.transferOwnership(
        targetUser.UserID,
        initiatorUser.UserID,
        offer.targetPlayerId
      );

      if (!transfer2Result.success) {
        try {
          await this.transferOwnership(
            targetUser.UserID,
            initiatorUser.UserID,
            offer.initiatorPlayerId
          );
        } catch (err) {
          console.error("❌ Error revirtiendo trade:", err);
        }
        return transfer2Result;
      }

      try {
        await this.removePlayerFromLineupRecord(initiatorUser, {
          playerIds: [offer.initiatorPlayerId],
          candidateNames: [offer.initiatorPlayerName],
        });
      } catch (err) {
        console.error(
          "⚠️ No se pudo quitar el jugador de la lineup del iniciador tras trade:",
          err
        );
      }

      try {
        await this.removePlayerFromLineupRecord(targetUser, {
          playerIds: [offer.targetPlayerId],
          candidateNames: [offer.targetPlayerName],
        });
      } catch (err) {
        console.error(
          "⚠️ No se pudo quitar el jugador de la lineup del objetivo tras trade:",
          err
        );
      }

      this.tradeManager.cancelOfferTimeout(
        initiatorUser.UserID,
        targetUser.UserID
      );
      this.tradeManager.removeTradeOffer(
        initiatorUser.UserID,
        targetUser.UserID
      );

      try {
        const initiatorPlayer = await this.playerDAO.getPlayerById(
          offer.initiatorPlayerId
        );
        const initiatorLoungeId =
          initiatorPlayer?.LoungeID ||
          initiatorPlayer?.lounge_id ||
          initiatorPlayer?.id ||
          initiatorPlayer?.loungeId;
        if (initiatorLoungeId && targetUser?.UserID) {
          const removeResult1 =
            await this.wishlistDAO.removePlayerFromWishlistByLoungeId(
              targetUser.UserID,
              initiatorLoungeId
            );
          if (removeResult1.success && removeResult1.removedCount > 0) {
            console.log(
              `✅ Jugador con LoungeID ${initiatorLoungeId} eliminado automáticamente de la wishlist del usuario ${targetUser.UserID} tras trade`
            );
          }
        } else if (targetUser?.UserID) {
          const removeResult1 = await this.wishlistDAO.removePlayerFromWishlist(
            targetUser.UserID,
            offer.initiatorPlayerId
          );
          if (removeResult1.success) {
            console.log(
              `✅ Jugador ${offer.initiatorPlayerId} eliminado automáticamente de la wishlist del usuario ${targetUser.UserID} tras trade`
            );
          }
        }
      } catch (wishlistError1) {
        console.error(
          "⚠️ Error eliminando jugador iniciador de wishlist del objetivo tras trade:",
          wishlistError1
        );
      }

      try {
        const targetPlayer = await this.playerDAO.getPlayerById(
          offer.targetPlayerId
        );
        const targetLoungeId =
          targetPlayer?.LoungeID ||
          targetPlayer?.lounge_id ||
          targetPlayer?.id ||
          targetPlayer?.loungeId;
        if (targetLoungeId && initiatorUser?.UserID) {
          const removeResult2 =
            await this.wishlistDAO.removePlayerFromWishlistByLoungeId(
              initiatorUser.UserID,
              targetLoungeId
            );
          if (removeResult2.success && removeResult2.removedCount > 0) {
            console.log(
              `✅ Jugador con LoungeID ${targetLoungeId} eliminado automáticamente de la wishlist del usuario ${initiatorUser.UserID} tras trade`
            );
          }
        } else if (initiatorUser?.UserID) {
          const removeResult2 = await this.wishlistDAO.removePlayerFromWishlist(
            initiatorUser.UserID,
            offer.targetPlayerId
          );
          if (removeResult2.success) {
            console.log(
              `✅ Jugador ${offer.targetPlayerId} eliminado automáticamente de la wishlist del usuario ${initiatorUser.UserID} tras trade`
            );
          }
        }
      } catch (wishlistError2) {
        console.error(
          "⚠️ Error eliminando jugador objetivo de wishlist del iniciador tras trade:",
          wishlistError2
        );
      }

      const initiatorPlayerReal = initiatorOwnedPlayers.find(
        (p) => p.IDPlayer === offer.initiatorPlayerId
      );
      const targetPlayerReal = targetOwnedPlayers.find(
        (p) => p.IDPlayer === offer.targetPlayerId
      );

      const initiatorRealName =
        initiatorPlayerReal?.LoungeName ||
        initiatorPlayerReal?.Name ||
        offer.initiatorPlayerName;
      const targetRealName =
        targetPlayerReal?.LoungeName ||
        targetPlayerReal?.Name ||
        offer.targetPlayerName;

      console.log(
        `🔄 Trade completado: Usuario ${initiatorUser.UserID} intercambió ${offer.initiatorPlayerName} por ${offer.targetPlayerName} con usuario ${targetUser.UserID}.`
      );

      return {
        success: true,
        initiatorPlayerName: offer.initiatorPlayerName,
        targetPlayerName: offer.targetPlayerName,
        initiatorRealName,
        targetRealName,
        initiatorUser,
        targetUser,
      };
    } catch (err) {
      console.error("❌ Error completando trade:", err);
      return {
        success: false,
        error: "unknown_error",
      };
    }
  }

  async getAllTracks() {
    try {
      return await this.trackDAO.getAllTracks();
    } catch (err) {
      console.error("❌ Error obteniendo todas las pistas:", err);
      throw err;
    }
  }

  async getTrackByName(trackName) {
    try {
      return await this.trackDAO.getTrackByName(trackName);
    } catch (err) {
      console.error("❌ Error obteniendo pista por nombre:", err);
      throw err;
    }
  }

  async getTrackById(trackId) {
    try {
      return await this.trackDAO.getTrackById(trackId);
    } catch (err) {
      console.error("❌ Error obteniendo pista por ID:", err);
      throw err;
    }
  }

  async getTrackByAbbreviation(abbreviation) {
    try {
      const trackAbbreviations = [
        "AH",
        "rAF",
        "BCi",
        "BC",
        "CCF",
        "rCM",
        "CC",
        "DD",
        "rDS",
        "rDDJ",
        "rDKP",
        "DKS",
        "DBB",
        "FO",
        "GBR",
        "rKTB",
        "MBC",
        "rMC",
        "rMMM",
        "rPB",
        "PS",
        "RR",
        "SSS",
        "rSGB",
        "rSHS",
        "SP",
        "rTF",
        "rWS",
        "rWSh",
        "WS",
      ];

      const index = trackAbbreviations.findIndex(
        (abb) => abb.toLowerCase() === abbreviation.toLowerCase()
      );

      if (index === -1) {
        return null;
      }

      const tracks = await this.getAllTracks();

      if (index < tracks.length) {
        return tracks[index];
      }

      return null;
    } catch (err) {
      console.error("❌ Error obteniendo pista por abreviatura:", err);
      throw err;
    }
  }

  async updateUserTrack(
    discordId,
    discordServerId,
    userName,
    trackType,
    trackId
  ) {
    try {
      const user = await this.getUser(discordId, discordServerId, userName);
      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const columnMap = {
        balancedA: "TrackBalancedA",
        balancedB: "TrackBalancedB",
        topA: "TrackTopA",
        topB: "TrackTopB",
        antiTopA: "TrackRemoveTopA",
        antiTopB: "TrackRemoveTopB",
        removeTopA: "TrackRemoveTopA",
        removeTopB: "TrackRemoveTopB",
        bottomA: "TrackBottomA",
        bottomB: "TrackBottomB",
      };

      let finalTrackType = trackType;
      if (trackType === "top") {
        if (!user.TrackTopA) {
          finalTrackType = "topA";
        } else if (!user.TrackTopB) {
          finalTrackType = "topB";
        } else {
          return { success: false, error: "track_slot_full", trackType: "top" };
        }
      } else if (trackType === "bottom") {
        if (!user.TrackBottomA) {
          finalTrackType = "bottomA";
        } else if (!user.TrackBottomB) {
          finalTrackType = "bottomB";
        } else {
          return {
            success: false,
            error: "track_slot_full",
            trackType: "bottom",
          };
        }
      } else if (trackType === "antitop") {
        if (!user.TrackRemoveTopA) {
          finalTrackType = "antiTopA";
        } else if (!user.TrackRemoveTopB) {
          finalTrackType = "antiTopB";
        } else {
          return {
            success: false,
            error: "track_slot_full",
            trackType: "antitop",
          };
        }
      } else if (trackType === "balanced") {
        if (!user.TrackBalancedA) {
          finalTrackType = "balancedA";
        } else if (!user.TrackBalancedB) {
          finalTrackType = "balancedB";
        } else {
          return {
            success: false,
            error: "track_slot_full",
            trackType: "balanced",
          };
        }
      }

      const validTrackTypes = [
        "balanced",
        "balancedA",
        "balancedB",
        "topA",
        "topB",
        "antiTopA",
        "antiTopB",
        "removeTopA",
        "removeTopB",
        "bottomA",
        "bottomB",
      ];

      if (!validTrackTypes.includes(finalTrackType)) {
        return { success: false, error: "invalid_track_type" };
      }

      const columnName = columnMap[finalTrackType];
      if (!columnName) {
        return { success: false, error: "invalid_track_type" };
      }

      if (trackId !== null) {
        const track = await this.trackDAO.getTrackById(trackId);
        if (!track) {
          return { success: false, error: "track_not_found" };
        }

        if (finalTrackType === "topA" && user.TrackTopB === trackId) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "topB",
          };
        }
        if (finalTrackType === "topB" && user.TrackTopA === trackId) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "topA",
          };
        }
        if (finalTrackType === "bottomA" && user.TrackBottomB === trackId) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "bottomB",
          };
        }
        if (finalTrackType === "bottomB" && user.TrackBottomA === trackId) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "bottomA",
          };
        }
        if (finalTrackType === "balancedA" && user.TrackBalancedB === trackId) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "balancedB",
          };
        }
        if (finalTrackType === "balancedB" && user.TrackBalancedA === trackId) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "balancedA",
          };
        }
        if (
          (finalTrackType === "antiTopA" || finalTrackType === "removeTopA") &&
          user.TrackRemoveTopB === trackId
        ) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "antiTopB",
          };
        }
        if (
          (finalTrackType === "antiTopB" || finalTrackType === "removeTopB") &&
          user.TrackRemoveTopA === trackId
        ) {
          return {
            success: false,
            error: "track_already_assigned",
            trackType: "antiTopA",
          };
        }
      }

      const updatedUser = await this.userDAO.updateUserTrack(
        user.UserID,
        columnName,
        trackId
      );

      return {
        success: true,
        user: updatedUser,
        trackType: finalTrackType,
        trackId,
      };
    } catch (err) {
      console.error("❌ Error actualizando track del usuario:", err);
      throw err;
    }
  }

  async fullResetServer(discordServerId) {
    try {
      await this.ownershipDAO.getClient().query("BEGIN");

      const playerIds = await this.playerDAO.getPlayerIdsByServer(
        discordServerId
      );

      const lineupsCleared = await this.userDAO.clearLineupsByServer(
        discordServerId
      );

      await this.userDAO.clearLineupsContainingPlayers(playerIds);

      const aliasesCleared = await this.ownershipDAO.clearAliasesByServer(
        discordServerId
      );

      const ownershipsDeleted =
        await this.ownershipDAO.deleteOwnershipsByServer(discordServerId);

      const playersDeleted = await this.playerDAO.deleteOrphanedPlayers(
        playerIds,
        discordServerId
      );

      const usersReset = await this.userDAO.resetCoinsAndEloByServer(
        discordServerId
      );

      const usersRollsUpdated =
        await this.updateRollsAndTrainingsByRankForServer(discordServerId);

      const wishlistsDeleted = await this.wishlistDAO.deleteWishlistsByServer(
        discordServerId
      );

      await this.ownershipDAO.getClient().query("COMMIT");

      return {
        success: true,
        ownershipsDeleted,
        usersReset,
        playersDeleted,
        usersRollsUpdated,
        aliasesCleared,
        lineupsCleared,
        wishlistsDeleted,
      };
    } catch (err) {
      await this.ownershipDAO.getClient().query("ROLLBACK");
      console.error("❌ Error en fullResetServer:", err);
      throw err;
    }
  }

  async thanosServer(discordServerId) {
    try {
      await this.ownershipDAO.getClient().query("BEGIN");

      const users = await this.userDAO.getUsersByServer(discordServerId);
      let totalPlayersRemoved = 0;

      for (const user of users) {
        const ownerships = await this.ownershipDAO.getUserOwnershipsByServer(
          user.UserID,
          discordServerId
        );
        const totalOwnerships = ownerships.length;

        if (totalOwnerships > 0) {
          const currentLineupIds = this.getLineupPlayerIdsFromRecord(user);

          const toRemove = Math.ceil(totalOwnerships / 2);

          const removed =
            await this.ownershipDAO.removeRandomOwnershipsByServer(
              user.UserID,
              discordServerId,
              toRemove
            );
          totalPlayersRemoved += removed;

          const remainingOwnerships =
            await this.ownershipDAO.getUserOwnershipsByServer(
              user.UserID,
              discordServerId
            );
          const remainingPlayerIds = new Set(
            remainingOwnerships.map((o) => Number(o.PlayerID))
          );

          const validLineupIds = currentLineupIds.filter((playerId) =>
            remainingPlayerIds.has(playerId)
          );

          await this.userDAO.updateUserLineup(user.UserID, validLineupIds);
        }
      }

      const players = await this.playerDAO.getPlayersByServer(discordServerId);
      let playersStatsReset = 0;

      for (const player of players) {
        if (player.LoungeID) {
          const initialStats = await this.playerDAO.getInitialStatsByLoungeId(
            player.LoungeID
          );

          await this.playerDAO.updatePlayerStatsFromInitialStats(
            player.IDPlayer,
            initialStats
          );
          playersStatsReset++;
        }
      }

      const usersUpdated = await this.userDAO.halveCoinsAndEloByServer(
        discordServerId
      );

      const usersRollsUpdated =
        await this.updateRollsAndTrainingsByRankForServer(discordServerId);

      await this.ownershipDAO.getClient().query("COMMIT");

      return {
        success: true,
        playersRemoved: totalPlayersRemoved,
        usersUpdated,
        playersStatsReset,
        usersRollsUpdated,
      };
    } catch (err) {
      await this.ownershipDAO.getClient().query("ROLLBACK");
      console.error("❌ Error en thanosServer:", err);
      throw err;
    }
  }

  async resetPlayerStatsByServer(discordServerId) {
    try {
      const result = await this.playerDAO.resetPlayerStatsByServer(
        discordServerId
      );
      return result;
    } catch (err) {
      console.error("❌ Error en resetPlayerStatsByServer:", err);
      return {
        success: false,
        playersReset: 0,
        error: err.message,
      };
    }
  }

  async updateRollsAndTrainingsByRankForServer(discordServerId) {
    try {
      const users = await this.userDAO.getUsersByServer(discordServerId);
      const ranks = await Utils.getRanksData();
      let usersUpdated = 0;

      for (const user of users) {
        const userElo = user.Elo || 0;
        const userRank = Utils.findRankForElo(ranks, userElo);
        const rollsToSet = userRank.pulls || 0;
        const trainingsToSet = userRank.training_sessions || 0;

        await this.userDAO.updateUserRollsAndTrainingsByRank(
          user.UserID,
          rollsToSet,
          trainingsToSet
        );
        usersUpdated++;
      }

      return usersUpdated;
    } catch (err) {
      console.error(
        "❌ Error actualizando rolls y entrenamientos por rango:",
        err
      );
      throw err;
    }
  }

  async isUserBanned(discordId, discordServerId) {
    try {
      return await this.userDAO.isUserBanned(discordId, discordServerId);
    } catch (err) {
      console.error("❌ Error verificando ban del usuario:", err);
      return false;
    }
  }

  async banUser(discordId, discordServerId, userName, guildLocale = null) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const isBanned = await this.userDAO.isUserBanned(
        discordId,
        discordServerId
      );

      if (isBanned) {
        return {
          success: false,
          error: "already_banned",
        };
      }

      const updatedUser = await this.userDAO.setUserBanned(
        discordId,
        discordServerId,
        true
      );

      if (!updatedUser) {
        return {
          success: false,
          error: "ban_failed",
        };
      }

      return {
        success: true,
        user: updatedUser,
      };
    } catch (err) {
      console.error("❌ Error baneando usuario:", err);
      throw err;
    }
  }

  async unbanUser(discordId, discordServerId, userName, guildLocale = null) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const isBanned = await this.userDAO.isUserBanned(
        discordId,
        discordServerId
      );

      if (!isBanned) {
        return {
          success: false,
          error: "not_banned",
        };
      }

      const updatedUser = await this.userDAO.setUserBanned(
        discordId,
        discordServerId,
        false
      );

      if (!updatedUser) {
        return {
          success: false,
          error: "unban_failed",
        };
      }

      return {
        success: true,
        user: updatedUser,
      };
    } catch (err) {
      console.error("❌ Error desbaneando usuario:", err);
      throw err;
    }
  }

  async isUserRestricted(discordId, discordServerId) {
    try {
      return await this.userDAO.isUserRestricted(discordId, discordServerId);
    } catch (err) {
      console.error("❌ Error verificando restricted del usuario:", err);
      return false;
    }
  }

  async restrictUser(discordId, discordServerId, userName, guildLocale = null) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const isRestricted = await this.userDAO.isUserRestricted(
        discordId,
        discordServerId
      );

      if (isRestricted) {
        return {
          success: false,
          error: "already_restricted",
        };
      }

      const updatedUser = await this.userDAO.setUserRestricted(
        discordId,
        discordServerId,
        true
      );

      if (!updatedUser) {
        return {
          success: false,
          error: "restrict_failed",
        };
      }

      return {
        success: true,
        user: updatedUser,
      };
    } catch (err) {
      console.error("❌ Error restringiendo usuario:", err);
      throw err;
    }
  }

  async unrestrictUser(
    discordId,
    discordServerId,
    userName,
    guildLocale = null
  ) {
    try {
      const user = await this.userDAO.getUserByIds(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        return {
          success: false,
          error: "user_not_found",
        };
      }

      const isRestricted = await this.userDAO.isUserRestricted(
        discordId,
        discordServerId
      );

      if (!isRestricted) {
        return {
          success: false,
          error: "not_restricted",
        };
      }

      const updatedUser = await this.userDAO.setUserRestricted(
        discordId,
        discordServerId,
        false
      );

      if (!updatedUser) {
        return {
          success: false,
          error: "unrestrict_failed",
        };
      }

      return {
        success: true,
        user: updatedUser,
      };
    } catch (err) {
      console.error("❌ Error desrestringiendo usuario:", err);
      throw err;
    }
  }

  async removeUserTrack(discordId, discordServerId, userName, trackType) {
    try {
      const user = await this.getUser(discordId, discordServerId, userName);
      if (!user || !user.UserID) {
        return { success: false, error: "user_not_found" };
      }

      const columnMap = {
        balancedA: "TrackBalancedA",
        balancedB: "TrackBalancedB",
        topA: "TrackTopA",
        topB: "TrackTopB",
        antiTopA: "TrackRemoveTopA",
        antiTopB: "TrackRemoveTopB",
        removeTopA: "TrackRemoveTopA",
        removeTopB: "TrackRemoveTopB",
        bottomA: "TrackBottomA",
        bottomB: "TrackBottomB",
      };

      let finalTrackTypes = [trackType];
      if (trackType === "top") {
        finalTrackTypes = ["topA", "topB"];
      } else if (trackType === "bottom") {
        finalTrackTypes = ["bottomA", "bottomB"];
      } else if (trackType === "antitop") {
        finalTrackTypes = ["antiTopA", "antiTopB"];
      } else if (trackType === "balanced") {
        finalTrackTypes = ["balancedA", "balancedB"];
      }

      const validTrackTypes = [
        "balanced",
        "balancedA",
        "balancedB",
        "topA",
        "topB",
        "antiTopA",
        "antiTopB",
        "removeTopA",
        "removeTopB",
        "bottomA",
        "bottomB",
        "top",
        "bottom",
        "antitop",
      ];

      if (!validTrackTypes.includes(trackType)) {
        return { success: false, error: "invalid_track_type" };
      }

      for (const finalType of finalTrackTypes) {
        const columnName = columnMap[finalType];
        if (columnName) {
          await this.userDAO.updateUserTrack(user.UserID, columnName, null);
        }
      }

      const updatedUser = await this.getUser(
        discordId,
        discordServerId,
        userName
      );

      return {
        success: true,
        user: updatedUser,
        trackType: trackType,
        removedTypes: finalTrackTypes,
      };
    } catch (err) {
      console.error("❌ Error eliminando track del usuario:", err);
      throw err;
    }
  }

  async updateUserTrackByUserId(userId, columnName, trackId) {
    try {
      return await this.userDAO.updateUserTrack(userId, columnName, trackId);
    } catch (err) {
      console.error("❌ Error actualizando track del usuario por UserID:", err);
      throw err;
    }
  }

  async updateUserElo(userId, newElo) {
    try {
      const normalizedElo = Math.max(0, Math.floor(newElo));
      return await this.userDAO.updateUserElo(userId, normalizedElo);
    } catch (err) {
      console.error("❌ Error actualizando Elo del usuario:", err);
      throw err;
    }
  }

  async updateUserCanWarCPU(userId, canWarCPU) {
    try {
      return await this.userDAO.updateCanWarCPU(userId, canWarCPU);
    } catch (err) {
      console.error("❌ Error actualizando CanWarCPU del usuario:", err);
      throw err;
    }
  }

  async reduceEnergyAfterWar(playerIds) {
    try {
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        return 0;
      }

      const energyReduction = Math.floor(Math.random() * 11) + 20;

      return await this.playerDAO.reduceEnergyForPlayers(
        playerIds,
        energyReduction
      );
    } catch (err) {
      console.error("❌ Error reduciendo energía después de war:", err);
      throw err;
    }
  }

  async getPlayerEnergy(playerId) {
    try {
      const player = await this.playerDAO.getPlayerById(playerId);
      return player?.energy ?? player?.Energy ?? 100;
    } catch (err) {
      console.error("❌ Error obteniendo energía del jugador:", err);
      return 100;
    }
  }

  getLoungeRankByMMR(mmr) {
    const mmrValue = Number.isFinite(mmr) ? mmr : -1;

    const LOUNGE_RANKS = [
      { name: "PLACEMENT", min: -1, max: -1 },
      { name: "IRON", min: 0, max: 1999 },
      { name: "BRONZE", min: 2000, max: 3499 },
      { name: "SILVER", min: 3500, max: 4999 },
      { name: "GOLD", min: 5000, max: 6499 },
      { name: "PLATINUM", min: 6500, max: 7999 },
      { name: "SAPPHIRE", min: 8000, max: 9499 },
      { name: "RUBY", min: 9500, max: 10999 },
      { name: "DIAMOND", min: 11000, max: 12499 },
      { name: "MASTER", min: 12500, max: 13499 },
      { name: "GRANDMASTER", min: 13500, max: Infinity },
    ];

    for (const rank of LOUNGE_RANKS) {
      if (mmrValue >= rank.min && mmrValue <= rank.max) {
        return rank.name;
      }
    }

    return "PLACEMENT";
  }

  async getLoungeRates() {
    try {
      const players = await this.loungeDAO.getAll();

      if (!players || players.length === 0) {
        return { success: false, error: "no_players" };
      }

      const LOUNGE_RANKS = [
        { name: "IRON", emote: "<:emoji:1441958305466552340>" },
        { name: "BRONZE", emote: "<:emoji:1441958154010234973>" },
        { name: "SILVER", emote: "<:emoji:1441958450354716692>" },
        { name: "GOLD", emote: "<:emoji:1441958237296660531>" },
        { name: "PLATINUM", emote: "<:emoji:1441958362958008332>" },
        { name: "SAPPHIRE", emote: "<:emoji:1441958418297655367>" },
        { name: "RUBY", emote: "<:emoji:1441958385619828810>" },
        { name: "DIAMOND", emote: "<:emoji:1441958204937601064>" },
        { name: "MASTER", emote: "<:emoji:1441958336567312404>" },
        { name: "GRANDMASTER", emote: "<:emoji:1441958268195962952>" },
      ];

      const rankCounts = {};
      LOUNGE_RANKS.forEach((rank) => {
        rankCounts[rank.name] = {
          count: 0,
          emote: rank.emote,
        };
      });

      players.forEach((player) => {
        const mmr = player.MMR || player.mmr || 0;
        const rankName = this.getLoungeRankByMMR(mmr);

        if (rankName !== "PLACEMENT" && rankCounts[rankName]) {
          rankCounts[rankName].count++;
        }
      });

      const totalPlayers = players.filter((player) => {
        const mmr = player.MMR || player.mmr || 0;
        return this.getLoungeRankByMMR(mmr) !== "PLACEMENT";
      }).length;

      const rates = LOUNGE_RANKS.map((rank) => {
        const data = rankCounts[rank.name];
        const percentage =
          totalPlayers > 0
            ? ((data.count / totalPlayers) * 100).toFixed(2)
            : "0.00";
        return {
          name: rank.name,
          emote: rank.emote,
          count: data.count,
          percentage: parseFloat(percentage),
        };
      });

      return {
        success: true,
        rates,
        totalPlayers,
      };
    } catch (err) {
      console.error("❌ Error en getLoungeRates del Model:", err);
      throw err;
    }
  }

  async getLeaderboardMMR(discordServerId) {
    try {
      const users = await this.userDAO.getUsersByServer(discordServerId);

      if (!users || users.length === 0) {
        return { success: false, error: "no_users" };
      }

      const leaderboard = [];

      for (const user of users) {
        try {
          const ownedPlayers = await this.getUserOwnedPlayers(user.UserID);

          if (!Array.isArray(ownedPlayers) || ownedPlayers.length < 6) {
            continue;
          }

          const ownedEntries = ownedPlayers
            .map((player) => {
              const id = Number(player.IDPlayer);
              if (!Number.isInteger(id)) {
                return null;
              }
              const mmr = Number(player.MMR || player.mmr || 0);
              return {
                id,
                mmr: Number.isFinite(mmr) ? mmr : 0,
              };
            })
            .filter(Boolean);

          if (ownedEntries.length < 6) {
            continue;
          }

          const existingLineupEntries = await this.getLineupDetailsFromRecord(
            user,
            ownedPlayers
          );

          const finalEntries = [];
          const seenIds = new Set();

          existingLineupEntries.forEach((entry) => {
            const entryId = Number(entry.id);
            if (!seenIds.has(entryId)) {
              const ownedEntry = ownedEntries.find((e) => e.id === entryId);
              if (ownedEntry) {
                seenIds.add(entryId);
                finalEntries.push(ownedEntry);
              }
            }
          });

          const availableEntries = ownedEntries
            .filter((entry) => !seenIds.has(entry.id))
            .sort((a, b) => b.mmr - a.mmr);

          for (const entry of availableEntries) {
            if (finalEntries.length >= 6) {
              break;
            }
            finalEntries.push(entry);
            seenIds.add(entry.id);
          }

          if (finalEntries.length < 6) {
            continue;
          }

          const totalMMR = finalEntries.reduce(
            (sum, entry) => sum + entry.mmr,
            0
          );
          const averageMMR = totalMMR / 6;

          leaderboard.push({
            userId: user.UserID,
            discordId: user.DiscordID,
            teamName: user.TeamName || user.Name || "Unknown",
            name: user.Name || "Unknown",
            averageMMR,
          });
        } catch (err) {
          console.error(
            `⚠️ Error procesando usuario ${user.UserID} para leaderboard:`,
            err
          );
          continue;
        }
      }

      leaderboard.sort((a, b) => b.averageMMR - a.averageMMR);

      return {
        success: true,
        leaderboard: leaderboard,
        total: leaderboard.length,
      };
    } catch (err) {
      console.error("❌ Error en getLeaderboardMMR del Model:", err);
      throw err;
    }
  }

  async getLeaderboardElo(discordServerId) {
    try {
      const users = await this.userDAO.getUsersByServer(discordServerId);

      if (!users || users.length === 0) {
        return { success: false, error: "no_users" };
      }

      const leaderboard = users
        .map((user) => ({
          userId: user.UserID,
          discordId: user.DiscordID,
          teamName: user.TeamName || user.Name || "Unknown",
          name: user.Name || "Unknown",
          elo: Number(user.Elo) || 0,
        }))
        .filter((user) => user.elo >= 0)
        .sort((a, b) => b.elo - a.elo);

      return {
        success: true,
        leaderboard,
        total: users.length,
      };
    } catch (err) {
      console.error("❌ Error en getLeaderboardElo del Model:", err);
      throw err;
    }
  }
}

module.exports = Model;
