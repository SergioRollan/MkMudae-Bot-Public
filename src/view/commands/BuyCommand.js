const Model = require("../../model/Model");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const LanguageManager = require("../../managers/LanguageManager");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    const mentions = Array.from(message.mentions.users.values());
    if (mentions.length === 0) {
      const errorMessage = langManager.getString(
        guildId,
        "buy_no_mention",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    const sellerUser = mentions[0];
    const buyerDiscordId = message.author.id;
    const buyerDiscordServerId = guildId || "DM";
    const buyerName = message.author.username;
    const sellerDiscordId = sellerUser.id;

    try {
      const result = await model.completeSale(
        buyerDiscordId,
        buyerDiscordServerId,
        buyerName,
        sellerDiscordId,
        guildLocale
      );

      if (!result.success) {
        let errorKey = "buy_unknown_error";
        let errorParams = {
          coins: result.coins || 0,
          seller: sellerUser.username,
        };

        if (result.error === "seller_not_found") {
          errorKey = "buy_seller_not_found";
        } else if (result.error === "no_pending_offer") {
          errorKey = "buy_no_pending_offer";
        } else if (result.error === "not_enough_coins") {
          errorKey = "buy_not_enough_coins";
        } else if (result.error === "player_no_longer_owned") {
          errorKey = "buy_player_no_longer_owned";
        } else if (result.error === "buyer_already_owns") {
          errorKey = "buy_buyer_already_owns";
        } else if (result.error === "recipient_roster_full") {
          errorKey = "buy_buyer_roster_full";
          errorParams = {
            current: result.currentCount,
            max: result.maxRoster,
            toSell: result.toSell,
          };
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

      const successMessage = langManager.getString(
        guildId,
        "buy_success_description",
        {
          player: result.playerName,
          seller: sellerUser.username,
          amount: result.salePrice.toLocaleString(),
          balance: result.buyerCoins.toLocaleString(),
        },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en BuyCommand:", error);

      const errorMessage = langManager.getString(
        guildId,
        "buy_unknown_error",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
