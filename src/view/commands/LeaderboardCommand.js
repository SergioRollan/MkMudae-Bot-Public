const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedLeaderboard = require("../../extras/embedbuilder/embedcomponents/EmbedLeaderboard");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      if (!guildId) {
        const errorMessage = langManager.getString(
          guildId,
          "channel_only_server",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const result = await model.getLeaderboardElo(guildId);

      if (!result.success) {
        let errorKey = "leaderboard_error_unknown";
        if (result.error === "no_users") {
          errorKey = "leaderboard_no_users";
        }

        const errorMessage = langManager.getString(
          guildId,
          errorKey,
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const ranks = await Utils.getRanksData();

      const leaderboardEmbed = new EmbedLeaderboard(
        result.leaderboard,
        result.total,
        ranks,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [leaderboardEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en LeaderboardCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "leaderboard_error_unknown",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
