const Model = require("../../model/Model");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const LanguageManager = require("../../managers/LanguageManager");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    const mentions = Array.from(message.mentions.users.values());
    const mentionedUser = mentions.length > 0 ? mentions[0] : null;

    const argsWithoutMentions = args.filter((arg) => !arg.startsWith("<@"));

    let customPrice = null;
    let playerName = argsWithoutMentions.join(" ").trim();

    if (!playerName) {
      const errorMessage = langManager.getString(
        guildId,
        "sell_no_name",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const finalEmbed = errorEmbed.build();
      await message.reply({ embeds: [finalEmbed] });
      return;
    }

    try {
      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const userCollection = await model.getUserCollection(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!userCollection.success || userCollection.count <= 6) {
        const errorMessage = langManager.getString(
          guildId,
          "sell_minimum_roster_required",
          { count: userCollection.count || 0, required: 6 },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      if (mentionedUser) {
        if (mentionedUser.id === discordId) {
          const errorMessage = langManager.getString(
            guildId,
            "sell_cannot_sell_to_self",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        if (argsWithoutMentions.length > 0) {
          const lastArg = argsWithoutMentions[argsWithoutMentions.length - 1];

          if (/^\d+$/.test(lastArg)) {
            const potentialPrice = Number(lastArg);

            if (Number.isFinite(potentialPrice) && potentialPrice > 0) {
              const playerNameWithoutNumber = argsWithoutMentions
                .slice(0, -1)
                .join(" ")
                .trim();

              if (playerNameWithoutNumber) {
                const previewWithoutNumber = await model.getSellPlayerInfo(
                  discordId,
                  discordServerId,
                  userName,
                  playerNameWithoutNumber
                );

                if (previewWithoutNumber.success) {
                  const minPrice = Math.floor(
                    previewWithoutNumber.salePrice * 0.5
                  );
                  const maxPrice = previewWithoutNumber.salePrice * 2;

                  if (
                    potentialPrice >= minPrice &&
                    potentialPrice <= maxPrice
                  ) {
                    playerName = playerNameWithoutNumber;
                    customPrice = potentialPrice;
                  }
                }
              }
            }
          }
        }

        const buyerDiscordId = mentionedUser.id;
        const buyerName = mentionedUser.username;

        const offerResult = await model.createSaleOffer(
          discordId,
          discordServerId,
          userName,
          buyerDiscordId,
          discordServerId,
          buyerName,
          playerName,
          customPrice,
          guildLocale
        );

        if (!offerResult.success) {
          let errorKey = "sell_unknown_error";
          const errorParams = { name: playerName };

          if (offerResult.error === "player_not_found") {
            errorKey = "sell_player_not_found";
          } else if (offerResult.error === "not_owned") {
            errorKey = "sell_not_owned";
          } else if (offerResult.error === "already_pending") {
            errorKey = "sell_offer_already_pending";
          } else if (offerResult.error === "invalid_price") {
            errorKey = "sell_invalid_price";
          } else if (offerResult.error === "price_out_of_range") {
            errorKey = "sell_price_out_of_range";
            errorParams.minPrice = offerResult.minPrice.toLocaleString();
            errorParams.maxPrice = offerResult.maxPrice.toLocaleString();
            errorParams.marketPrice = offerResult.marketPrice.toLocaleString();
          }

          const errorMessage = langManager.getString(
            guildId,
            errorKey,
            errorParams,
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        const playerDisplayName =
          offerResult.playerInfo.loungePlayer.name || playerName;

        const playerRecord = offerResult.playerInfo.playerRecord;
        const realName =
          playerRecord?.LoungeName || playerRecord?.Name || playerDisplayName;
        const normalizedInput = model.normalizePlayerKey(playerName);
        const normalizedRealName = model.normalizePlayerKey(realName);
        const normalizedDisplayName =
          model.normalizePlayerKey(playerDisplayName);

        let finalPlayerDisplayName = playerDisplayName;
        if (
          normalizedInput !== normalizedRealName &&
          normalizedDisplayName !== normalizedRealName
        ) {
          finalPlayerDisplayName = `${playerDisplayName} (${realName})`;
        }

        const finalPrice = offerResult.salePrice;
        const offerMessage = langManager.getString(
          guildId,
          "sell_offer_created",
          {
            player: finalPlayerDisplayName,
            buyer: buyerName,
            seller: userName,
            amount: finalPrice.toLocaleString(),
          },
          guildLocale
        );
        const successEmbed = new EmbedSuccess(
          offerMessage,
          guildId,
          guildLocale
        );
        await message.reply({ embeds: [successEmbed.build()] });

        const timeoutId = setTimeout(async () => {
          const offer = model.saleManager.getSaleOffer(
            offerResult.sellerUser.UserID,
            offerResult.buyerUser.UserID
          );

          if (offer && offer.status === "pending") {
            model.saleManager.removeSaleOffer(
              offerResult.sellerUser.UserID,
              offerResult.buyerUser.UserID
            );

            const timeoutMessage = langManager.getString(
              guildId,
              "sell_confirm_timeout",
              {},
              guildLocale
            );

            try {
              await message.channel.send(timeoutMessage);
            } catch (err) {
              console.error("❌ Error enviando mensaje de timeout:", err);
            }
          }
        }, 30000);

        model.saleManager.setOfferTimeout(
          offerResult.sellerUser.UserID,
          offerResult.buyerUser.UserID,
          timeoutId
        );

        return;
      }

      const preview = await model.getSellPlayerInfo(
        discordId,
        discordServerId,
        userName,
        playerName
      );

      if (!preview.success) {
        let errorKey = "sell_unknown_error";

        if (preview.error === "player_not_found") {
          errorKey = "sell_player_not_found";
        } else if (preview.error === "not_owned") {
          errorKey = "sell_not_owned";
        }

        const errorMessage = langManager.getString(
          guildId,
          errorKey,
          { name: playerName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const playerDisplayName =
        preview.loungePlayer.name ||
        preview.playerRecord?.Alias ||
        preview.playerRecord?.Name ||
        playerName;

      const userElo = preview.user?.Elo || 0;
      const userRank = await Utils.getRankForElo(userElo);
      const discount = userRank?.discount || 0;

      const sellPercentage = (discount === 0 ? 50 : discount) / 100;
      const marketSalePrice = Math.round(preview.salePrice * sellPercentage);

      const confirmMessage = langManager.getString(
        guildId,
        "sell_confirm_prompt",
        {
          player: playerDisplayName,
          amount: marketSalePrice.toLocaleString(),
        },
        guildLocale
      );

      await message.reply({ content: confirmMessage });

      const filter = (response) => response.author.id === message.author.id;

      let confirmationResponse;
      try {
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
          errors: ["time"],
        });

        confirmationResponse = collected.first();
      } catch (err) {
        const timeoutMessage = langManager.getString(
          guildId,
          "sell_confirm_timeout",
          {},
          guildLocale
        );
        await message.reply({ content: timeoutMessage });
        return;
      }

      const answer = confirmationResponse.content.trim().toLowerCase();

      const yesValues = ["y", "yes", "s", "si", "sí"];
      const noValues = ["n", "no"];

      if (noValues.includes(answer)) {
        const cancelledMessage = langManager.getString(
          guildId,
          "sell_confirm_cancelled",
          {},
          guildLocale
        );
        await message.reply({ content: cancelledMessage });
        return;
      }

      if (!yesValues.includes(answer)) {
        const invalidMessage = langManager.getString(
          guildId,
          "sell_confirm_invalid",
          {},
          guildLocale
        );
        await message.reply({ content: invalidMessage });
        return;
      }

      const result = await model.sellPlayer(
        discordId,
        discordServerId,
        userName,
        playerName
      );

      if (!result.success) {
        const errorMessage = langManager.getString(
          guildId,
          "sell_unknown_error",
          { name: playerName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const realName =
        preview.playerRecord?.LoungeName ||
        preview.playerRecord?.Name ||
        result.player.name;
      const normalizedInput = model.normalizePlayerKey(playerName);
      const normalizedRealName = model.normalizePlayerKey(realName);
      const normalizedDisplayName = model.normalizePlayerKey(
        result.player.name
      );

      let finalPlayerDisplayName = result.player.name;
      if (
        normalizedInput !== normalizedRealName &&
        normalizedDisplayName !== normalizedRealName
      ) {
        finalPlayerDisplayName = `${result.player.name} (${realName})`;
      }

      const description = langManager.getString(
        guildId,
        "sell_success_description",
        {
          player: finalPlayerDisplayName,
          amount: result.salePrice.toLocaleString(),
          balance: result.coins.toLocaleString(),
        },
        guildLocale
      );
      const amountLabel = langManager.getString(
        guildId,
        "sell_field_amount",
        {},
        guildLocale
      );
      const balanceLabel = langManager.getString(
        guildId,
        "sell_field_balance",
        {},
        guildLocale
      );
      const successMessage = [
        description,
        "",
        `${amountLabel}: ${result.salePrice.toLocaleString()} ${Utils.formatCoins(
          result.salePrice
        )}`,
        `${balanceLabel}: ${result.coins.toLocaleString()} ${Utils.formatCoins(
          result.coins
        )}`,
      ].join("\n");
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en SellCommand:", error);

      const errorMessage = langManager.getString(
        guildId,
        "sell_unknown_error",
        { name: playerName },
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const embed = errorEmbed.build();
      embed.setFooter({ text: error.message });

      await message.reply({ embeds: [embed] });
    }
  },
};
