const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    if (!message.guild) {
      const errorMessage = langManager.getString(
        guildId,
        "fullreset_only_server",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const application = await message.client.application.fetch();
      const ownerId = application.owner?.id || application.ownerId;

      if (!ownerId || message.author.id !== ownerId) {
        const errorMessage = langManager.getString(
          guildId,
          "fullreset_no_permission",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }
    } catch (err) {
      console.error("❌ Error verificando owner:", err);
      const errorMessage = langManager.getString(
        guildId,
        "fullreset_error_verifying",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const confirmMessage = langManager.getString(
        guildId,
        "fullreset_confirm_prompt",
        { server: message.guild.name },
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
          "fullreset_confirm_timeout",
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
          "fullreset_confirm_cancelled",
          {},
          guildLocale
        );
        await message.reply({ content: cancelledMessage });
        return;
      }

      if (!yesValues.includes(answer)) {
        const invalidMessage = langManager.getString(
          guildId,
          "fullreset_confirm_invalid",
          {},
          guildLocale
        );
        await message.reply({ content: invalidMessage });
        return;
      }

      const result = await model.fullResetServer(guildId);

      if (!result.success) {
        const errorMessage = langManager.getString(
          guildId,
          "fullreset_error",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const successMessage = langManager.getString(
        guildId,
        "fullreset_success",
        {
          ownershipsDeleted: result.ownershipsDeleted.toLocaleString(),
          usersReset: result.usersReset.toLocaleString(),
          playersDeleted: result.playersDeleted.toLocaleString(),
          usersRollsUpdated: result.usersRollsUpdated.toLocaleString(),
          aliasesCleared: result.aliasesCleared.toLocaleString(),
          lineupsCleared: result.lineupsCleared.toLocaleString(),
          wishlistsDeleted: result.wishlistsDeleted.toLocaleString(),
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
      console.error("❌ Error en FullResetCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
