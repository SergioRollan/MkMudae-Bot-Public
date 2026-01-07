const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedLoungeOdds = require("../../extras/embedbuilder/embedcomponents/EmbedLoungeOdds");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const result = await model.getLoungeRates();

      if (!result.success) {
        const errorMessage = langManager.getString(
          guildId,
          "loungeodds_error_processing",
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

      let wishlistInfo = null;
      try {
        const userRank = await model.getUserRankData(
          discordId,
          discordServerId,
          userName,
          guildLocale
        );
        const wishlistResult = await model.getUserWishlist(
          discordId,
          discordServerId
        );
        const wishlistCount = wishlistResult?.count || 0;
        const wishlistMultiplier = userRank?.wishlist_mult || 0;

        if (wishlistCount > 0 && wishlistMultiplier > 0) {
          wishlistInfo = {
            count: wishlistCount,
            multiplier: wishlistMultiplier,
          };
        }
      } catch (err) {
        console.error("❌ Error obteniendo información de wishlist:", err);
      }

      const ratesEmbed = new EmbedLoungeOdds(
        result.rates,
        result.totalPlayers,
        guildId,
        guildLocale,
        wishlistInfo
      );

      await message.reply({ embeds: [ratesEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en LoungeOddsCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "loungeodds_error_processing",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
