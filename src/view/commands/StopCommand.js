const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");

module.exports = {
  async handleMessage(message) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      if (!message.channel.isThread()) {
        const errorMessage = langManager.getString(
          guildId,
          "stop_not_in_thread",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const threadId = message.channel.id;
      const userId = message.author.id;

      const result = model.warManager.requestStop(threadId, userId);

      if (!result.success) {
        let errorKey = "stop_error_unknown";
        switch (result.error) {
          case "no_active_war":
            errorKey = "stop_no_active_war";
            break;
          case "not_participant":
            errorKey = "stop_not_participant";
            break;
          case "cpu_war":
            errorKey = "stop_cpu_war";
            break;
          default:
            break;
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

      if (result.bothRequested) {
        const successMessage = langManager.getString(
          guildId,
          "stop_both_requested",
          {},
          guildLocale
        );
        const successEmbed = new EmbedSuccess(
          successMessage,
          guildId,
          guildLocale
        );
        await message.reply({ embeds: [successEmbed.build()] });
      } else {
        const waitingMessage = langManager.getString(
          guildId,
          "stop_waiting_other",
          {},
          guildLocale
        );
        const successEmbed = new EmbedSuccess(
          waitingMessage,
          guildId,
          guildLocale
        );
        await message.reply({ embeds: [successEmbed.build()] });
      }
    } catch (error) {
      console.error("❌ Error en StopCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "stop_error_unknown",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
