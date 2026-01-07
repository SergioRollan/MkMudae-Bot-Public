const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedLeaderboardMMR = require("../../extras/embedbuilder/embedcomponents/EmbedLeaderboardMMR");

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

      const result = await model.getLeaderboardMMR(guildId);

      if (!result.success) {
        let errorKey = "leaderboardmmr_error_unknown";
        if (result.error === "no_users") {
          errorKey = "leaderboardmmr_no_users";
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

      const leaderboardEmbed = new EmbedLeaderboardMMR(
        result.leaderboard,
        result.total,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [leaderboardEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en LeaderboardMMRCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "leaderboardmmr_error_unknown",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
