const EmbedPlayer = require("../../extras/embedbuilder/embedcomponents/EmbedPlayer");
const DecoratorOwnedBy = require("../../extras/embedbuilder/decorators/DecoratorOwnedBy");
const DecoratorPlayerAttributes = require("../../extras/embedbuilder/decorators/DecoratorPlayerAttributes");
const DecoratorPlayerEnergy = require("../../extras/embedbuilder/decorators/DecoratorPlayerEnergy");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const LanguageManager = require("../../managers/LanguageManager");
const Model = require("../../model/Model");
const PlayerDAO = require("../../dao/PlayerDAO");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const playerName = args.join(" ").trim();

      if (!playerName) {
        const errorMessage = langManager.getString(
          guildId,
          "playerinfo_no_name",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      let loungePlayer = null;
      try {
        const user = await model.getUser(
          discordId,
          discordServerId,
          userName,
          guildLocale
        );

        if (user) {
          const ownedPlayers = await model.getUserOwnedPlayers(user.UserID);
          const index = model.buildOwnedPlayerIndex(
            ownedPlayers,
            (playerData, playerId) =>
              model.getPlayerDisplayName(playerData, playerId)
          );

          const token = model.createPlayerToken(playerName);
          const match = model.resolveOwnedPlayerToken(token, index);

          if (match && match.data?.LoungeID) {
            loungePlayer = await model.loungeDAO.getPlayerByLoungeIdOrName(
              match.data.LoungeID,
              null
            );
          }
        }
      } catch (error) {
        console.error("❌ Error buscando por alias en roster:", error);
      }

      if (!loungePlayer) {
        loungePlayer = await model.getLoungePlayerByName(playerName);
      }

      if (!loungePlayer) {
        const errorMessage = langManager.getString(
          guildId,
          "playerinfo_not_found",
          { name: playerName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let ownerName = null;
      let ownerDiscordId = null;
      let ownerAvatarURL = null;
      let roles = null;
      let energy = 100;
      const playerRecord = await model.getPlayerByLoungeIdInServer(
        loungePlayer.lounge_id,
        discordServerId
      );

      if (playerRecord) {
        roles = {
          Lines: playerRecord.Lines || 0,
          Consistency: playerRecord.Consistency || 0,
          ItemUsage: playerRecord.ItemUsage || 0,
          Precision: playerRecord.Precision || 0,
          Communication: playerRecord.Communication || 0,
          Mental: playerRecord.Mental || 0,
          GameSense: playerRecord.GameSense || 0,
          Shockfinding: playerRecord.Shockfinding || 0,
        };

        energy = playerRecord.energy ?? playerRecord.Energy ?? 100;

        const allZero = Object.values(roles).every((val) => val === 0);
        if (allZero) {
          const playerDAO = new PlayerDAO();
          const initialStats = await playerDAO.getInitialStatsByLoungeId(
            loungePlayer.lounge_id
          );
          if (initialStats) {
            roles = initialStats;
          }
        }

        const owner = await model.getPlayerOwner(
          playerRecord.IDPlayer,
          discordServerId
        );
        if (owner) {
          ownerName = owner.Name;
          ownerDiscordId = owner.DiscordID;

          try {
            let discordUser = message.client.users.cache.get(ownerDiscordId);
            if (!discordUser) {
              discordUser = await message.client.users.fetch(ownerDiscordId);
            }
            if (discordUser) {
              ownerAvatarURL = discordUser.displayAvatarURL({ dynamic: true });
            }
          } catch (error) {
            console.error("❌ Error obteniendo avatar del usuario:", error);
          }
        }
      } else {
        const playerDAO = new PlayerDAO();
        const initialStats = await playerDAO.getInitialStatsByLoungeId(
          loungePlayer.lounge_id
        );
        if (initialStats) {
          roles = initialStats;
        }
      }

      let ranking = null;
      let totalPlayers = null;
      try {
        if (loungePlayer.mmr) {
          const rankingData = await model.loungeDAO.getPlayerRankingByMMR(
            loungePlayer.mmr
          );
          ranking = rankingData.ranking;
          totalPlayers = rankingData.totalPlayers;
        }
      } catch (rankingError) {
        console.error("❌ Error obteniendo ranking:", rankingError);
      }

      let playerInfoEmbed = new EmbedPlayer(
        {
          name: loungePlayer.name,
          mmr: loungePlayer.mmr,
          peak_mmr: loungePlayer.peak_mmr,
          events_played: loungePlayer.events_played || 0,
          ranking: ranking,
          totalPlayers: totalPlayers,
          Lines: roles?.Lines || 0,
          Consistency: roles?.Consistency || 0,
          ItemUsage: roles?.ItemUsage || 0,
          Precision: roles?.Precision || 0,
          Communication: roles?.Communication || 0,
          Mental: roles?.Mental || 0,
          GameSense: roles?.GameSense || 0,
          Shockfinding: roles?.Shockfinding || 0,
        },
        guildId,
        guildLocale
      );

      playerInfoEmbed = new DecoratorPlayerAttributes(
        playerInfoEmbed,
        roles,
        loungePlayer.mmr || 0,
        guildId,
        guildLocale
      );

      playerInfoEmbed = new DecoratorPlayerEnergy(
        playerInfoEmbed,
        energy,
        guildId,
        guildLocale
      );

      if (ownerName) {
        playerInfoEmbed = new DecoratorOwnedBy(
          playerInfoEmbed,
          ownerName,
          ownerAvatarURL,
          guildId,
          guildLocale
        );
      }

      await message.reply({ embeds: [playerInfoEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en PlayerInfoCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      await message.reply({ content: errorMessage });
    }
  },
};
