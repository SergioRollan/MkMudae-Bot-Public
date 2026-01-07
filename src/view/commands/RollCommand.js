const Model = require("../../model/Model");
const EmbedPlayer = require("../../extras/embedbuilder/embedcomponents/EmbedPlayer");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const DecoratorRollsLeft = require("../../extras/embedbuilder/decorators/DecoratorRollsLeft");
const DecoratorOwnedBy = require("../../extras/embedbuilder/decorators/DecoratorOwnedBy");
const DecoratorPlayerRollLayout = require("../../extras/embedbuilder/decorators/DecoratorPlayerRollLayout");
const DecoratorPlayerAttributes = require("../../extras/embedbuilder/decorators/DecoratorPlayerAttributes");
const LanguageManager = require("../../managers/LanguageManager");
const Utils = require("../../extras/Utils");
const PlayerDAO = require("../../dao/PlayerDAO");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const result = await model.getRandomPlayer(
        discordId,
        discordServerId,
        userName,
        null,
        guildLocale
      );

      if (!result.success) {
        let errorMessage = "";

        if (result.error === "no_rolls_left") {
          errorMessage = langManager.getString(
            guildId,
            "error_no_rolls_left",
            {},
            guildLocale
          );
        } else if (result.error === "no_players_available") {
          errorMessage = langManager.getString(
            guildId,
            "error_no_players_available",
            {},
            guildLocale
          );
        } else {
          errorMessage = langManager.getString(
            guildId,
            "error_unknown",
            {},
            guildLocale
          );
        }

        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        const decoratedError = new DecoratorRollsLeft(
          errorEmbed,
          result.rollsLeft || 0,
          guildId,
          guildLocale
        );
        const finalEmbed = decoratedError.build();

        await message.reply({ embeds: [finalEmbed] });
        return;
      }

      let ownerName = null;
      let ownerDiscordId = null;
      let ownerAvatarURL = null;
      let isOwned = false;
      let roles = null;
      let playerRecord = null;

      try {
        const loungeId =
          result.player.lounge_id ||
          result.player.LoungeID ||
          result.player.id ||
          result.player.loungeId ||
          null;

        if (!loungeId) {
          throw new Error(
            "Lounge ID no disponible para el jugador obtenido en el roll."
          );
        }

        playerRecord = await model.getPlayerByLoungeIdInServer(
          loungeId,
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

          const allZero = Object.values(roles).every((val) => val === 0);
          if (allZero) {
            const playerDAO = new PlayerDAO();
            const initialStats = await playerDAO.getInitialStatsByLoungeId(
              loungeId
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
            isOwned = true;
            ownerName = owner.Name;
            ownerDiscordId = owner.DiscordID;

            try {
              let discordUser = message.client.users.cache.get(ownerDiscordId);
              if (!discordUser) {
                discordUser = await message.client.users.fetch(ownerDiscordId);
              }
              if (discordUser) {
                ownerAvatarURL = discordUser.displayAvatarURL({
                  dynamic: true,
                });
              }
            } catch (avatarError) {}
          }
        } else {
          const playerDAO = new PlayerDAO();
          const initialStats = await playerDAO.getInitialStatsByLoungeId(
            loungeId
          );
          if (initialStats) {
            roles = initialStats;
          }
        }
      } catch (ownerCheckError) {}

      let ranking = null;
      let totalPlayers = null;
      try {
        const loungeId =
          result.player.lounge_id ||
          result.player.LoungeID ||
          result.player.id ||
          result.player.loungeId ||
          null;
        if (loungeId && result.player.mmr) {
          const rankingData = await model.loungeDAO.getPlayerRankingByMMR(
            result.player.mmr
          );
          ranking = rankingData.ranking;
          totalPlayers = rankingData.totalPlayers;
        }
      } catch (rankingError) {
        console.error("❌ Error obteniendo ranking:", rankingError);
      }

      const playerWithAttributes = {
        ...result.player,
        Lines: roles?.Lines || 0,
        Consistency: roles?.Consistency || 0,
        ItemUsage: roles?.ItemUsage || 0,
        Precision: roles?.Precision || 0,
        Communication: roles?.Communication || 0,
        Mental: roles?.Mental || 0,
        GameSense: roles?.GameSense || 0,
        Shockfinding: roles?.Shockfinding || 0,
        ranking: ranking,
        totalPlayers: totalPlayers,
      };

      let wishlistUsers = [];
      let isInUserWishlist = false;

      try {
        const loungeId =
          result.player.lounge_id ||
          result.player.LoungeID ||
          result.player.id ||
          result.player.loungeId ||
          null;

        if (loungeId) {
          wishlistUsers = await model.getUsersWithPlayerInWishlistByLoungeId(
            loungeId,
            discordServerId
          );

          isInUserWishlist = wishlistUsers.some(
            (user) => (user.DiscordID || user.discordId) === discordId
          );
        }
      } catch (wishlistError) {
        console.error("❌ Error verificando wishlist:", wishlistError);
      }

      const PINK_COLOR = 0xff69b4;
      const embedColor = isInUserWishlist ? PINK_COLOR : null;

      let playerEmbed = new EmbedPlayer(
        playerWithAttributes,
        guildId,
        guildLocale,
        embedColor
      );

      playerEmbed = new DecoratorPlayerRollLayout(
        playerEmbed,
        playerWithAttributes,
        guildId,
        guildLocale
      );

      if (ownerName) {
        playerEmbed = new DecoratorOwnedBy(
          playerEmbed,
          ownerName,
          ownerAvatarURL,
          guildId,
          guildLocale
        );
      }

      if (roles) {
        playerEmbed = new DecoratorPlayerAttributes(
          playerEmbed,
          roles,
          result.player.mmr || 0,
          guildId,
          guildLocale
        );
      }

      playerEmbed = new DecoratorRollsLeft(
        playerEmbed,
        result.rollsLeft,
        guildId,
        guildLocale
      );
      const finalEmbed = playerEmbed.build();

      const responseOptions = {
        embeds: [finalEmbed],
      };

      const claimButton = new ButtonBuilder()
        .setCustomId(
          `claim_${result.player.lounge_id || result.player.name}_${discordId}`
        )
        .setLabel(
          langManager.getString(guildId, "roll_claim_button", {}, guildLocale)
        )
        .setStyle(ButtonStyle.Secondary);

      if (isOwned) {
        claimButton.setEmoji("💰");
      } else {
        claimButton.setEmoji("✅");
      }

      const row = new ActionRowBuilder().addComponents(claimButton);
      responseOptions.components = [row];

      const replyMessage = await message.reply(responseOptions);

      if (replyMessage) {
        const messageId = replyMessage.id;
        const timestamp = Date.now();
        Utils.addClaimableRoll(messageId, timestamp);
      }
    } catch (error) {
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const finalEmbed = errorEmbed.build();
      finalEmbed.setFooter({ text: error.message });

      await message.reply({ embeds: [finalEmbed] });
    }
  },
};
