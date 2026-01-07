const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedWarResponse = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarResponse");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const responderId = message.author.id;

      let challengerId = null;
      if (
        message.mentions &&
        message.mentions.users &&
        message.mentions.users.size > 0
      ) {
        challengerId = message.mentions.users.first().id;
      }

      const result = await model.respondToWarRequest(
        responderId,
        "deny",
        challengerId
      );

      if (!result.success) {
        if (result.error === "not_opponent") {
          return;
        }

        if (result.error === "multiple_pending") {
          const errorMessage = langManager.getString(
            guildId,
            "war_error_multiple_pending",
            { count: result.count },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        const errorMessage = langManager.getString(
          guildId,
          "war_error_no_pending_request",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const { request } = result;
      const challengerTag = `<@${request.challengerId}>`;
      const opponentTag = `<@${request.opponentId}>`;
      const responderTag = message.author.toString();

      const embed = new EmbedWarResponse({
        type: request.type,
        accepted: false,
        challengerTag,
        opponentTag,
        responderTag,
        amount: request.amount,
        guildId,
        guildLocale,
      });

      await message.reply({ embeds: [embed.build()] });
    } catch (error) {
      console.error("❌ Error en DenyCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "war_error_unknown",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
