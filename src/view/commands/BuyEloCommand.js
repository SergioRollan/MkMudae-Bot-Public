const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const Utils = require("../../extras/Utils");

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

      const user = await model.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!user || !user.UserID) {
        const errorMessage = langManager.getString(
          guildId,
          "buyelo_user_not_found",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const currentCoins = user.Coins || 0;

      if (currentCoins <= 0) {
        const errorMessage = langManager.getString(
          guildId,
          "buyelo_not_enough_coins",
          { coins: currentCoins.toLocaleString() },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const amountArg = args[0];
      let coinsToSpend;

      if (!amountArg) {
        coinsToSpend = currentCoins;
      } else {
        coinsToSpend = Number(amountArg);

        if (!Number.isFinite(coinsToSpend) || coinsToSpend <= 0) {
          const errorMessage = langManager.getString(
            guildId,
            "buyelo_invalid_amount",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        if (currentCoins < coinsToSpend) {
          const errorMessage = langManager.getString(
            guildId,
            "buyelo_not_enough_coins",
            { coins: currentCoins.toLocaleString() },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }
      }

      const userElo = user.Elo || 0;
      const ranks = await Utils.getRanksData();
      const currentRank = Utils.findRankForElo(ranks, userElo);
      const eloCost = currentRank.elo_cost || 1;

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

      let coinsToUse = coinsToSpend;
      let eloGained = Math.floor(coinsToUse * eloCost);

      if (eloNeededForNextRank !== null && eloGained > eloNeededForNextRank) {
        const coinsNeeded = Math.ceil(eloNeededForNextRank / eloCost);

        if (!amountArg) {
          coinsToUse = Math.min(coinsNeeded, currentCoins);
        } else {
          coinsToUse = coinsNeeded;
        }
        eloGained = Math.floor(coinsToUse * eloCost);
      }

      let confirmMessage;

      if (eloNeededForNextRank !== null && eloGained >= eloNeededForNextRank) {
        confirmMessage = langManager.getString(
          guildId,
          "buyelo_exceeds_next_rank",
          {
            eloNeeded: eloNeededForNextRank,
            coinsNeeded: coinsToUse,
          },
          guildLocale
        );
      } else {
        confirmMessage = langManager.getString(
          guildId,
          "buyelo_confirm_prompt",
          {
            eloGained: eloGained.toLocaleString(),
            coins: coinsToUse.toLocaleString(),
          },
          guildLocale
        );
      }

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
          "buyelo_confirm_timeout",
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
          "buyelo_confirm_cancelled",
          {},
          guildLocale
        );
        await message.reply({ content: cancelledMessage });
        return;
      }

      if (!yesValues.includes(answer)) {
        const invalidMessage = langManager.getString(
          guildId,
          "buyelo_confirm_invalid",
          {},
          guildLocale
        );
        await message.reply({ content: invalidMessage });
        return;
      }

      const result = await model.buyElo(
        discordId,
        discordServerId,
        userName,
        coinsToUse
      );

      if (!result.success) {
        let errorKey = "buyelo_error_processing";
        const params = {};

        if (result.error === "invalid_amount") {
          errorKey = "buyelo_invalid_amount";
        } else if (result.error === "not_enough_coins") {
          errorKey = "buyelo_not_enough_coins";
          params.coins = (result.coins || 0).toLocaleString();
        } else if (result.error === "user_not_found") {
          errorKey = "buyelo_user_not_found";
        }

        const errorMessage = langManager.getString(
          guildId,
          errorKey,
          params,
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const newElo = result.elo;
      const allRanks = await Utils.getRanksData();
      const sortedRanksAfterPurchase = [...allRanks].sort((a, b) => {
        const eloA = a.elo_needed ?? 0;
        const eloB = b.elo_needed ?? 0;
        return eloA - eloB;
      });

      const newRankIndex = sortedRanksAfterPurchase.findIndex(
        (r) => r.name === result.rank?.name
      );
      const nextRankAfterPurchase = sortedRanksAfterPurchase[newRankIndex + 1];

      let eloToNextRank = null;
      if (nextRankAfterPurchase) {
        eloToNextRank = nextRankAfterPurchase.elo_needed - newElo;
        if (eloToNextRank <= 0) {
          eloToNextRank = null;
        }
      }

      const description = langManager.getString(
        guildId,
        "buyelo_success_description",
        {
          eloGained: result.eloGained.toLocaleString(),
        },
        guildLocale
      );
      const spentLabel = langManager.getString(
        guildId,
        "buyelo_field_spent",
        {},
        guildLocale
      );
      const coinsLabel = langManager.getString(
        guildId,
        "buyelo_field_new_coins",
        {},
        guildLocale
      );
      const eloLabel = langManager.getString(
        guildId,
        "buyelo_field_new_elo",
        {},
        guildLocale
      );
      const rankLabel = langManager.getString(
        guildId,
        "buyelo_field_new_rank",
        {},
        guildLocale
      );
      const rankValue = result.rank?.name
        ? `${result.rank?.emote || ""} ${result.rank?.name}`.trim()
        : langManager.getString(guildId, "player_unknown", {}, guildLocale);

      const successMessageLines = [
        description,
        "",
        `${spentLabel}: ${result.spent.toLocaleString()} ${Utils.formatCoins(
          result.spent
        )}`,
        `${coinsLabel}: ${result.coins.toLocaleString()} ${Utils.formatCoins(
          result.coins
        )}`,
        `${eloLabel}: ${result.elo.toLocaleString()} Elo`,
        `${rankLabel}: ${rankValue}`,
      ];

      if (eloToNextRank !== null) {
        const nextRankLabel = langManager.getString(
          guildId,
          "buyelo_field_elo_to_next_rank",
          {},
          guildLocale
        );
        const nextRankName = nextRankAfterPurchase?.name
          ? `${nextRankAfterPurchase?.emote || ""} ${
              nextRankAfterPurchase?.name
            }`.trim()
          : langManager.getString(guildId, "player_unknown", {}, guildLocale);
        successMessageLines.push(
          `${nextRankLabel}: ${eloToNextRank.toLocaleString()} Elo (${nextRankName})`
        );
      }

      const successMessage = successMessageLines.join("\n");

      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en BuyEloCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "buyelo_error_processing",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const embed = errorEmbed.build();
      embed.setFooter({ text: error.message });

      await message.reply({ embeds: [embed] });
    }
  },
};
