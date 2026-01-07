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

    if (!message.guild) {
      const errorMessage = langManager.getString(
        guildId,
        "restrict_only_server",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    if (!(await Utils.hasAdminPermissions(message.member, guildId))) {
      const errorMessage = langManager.getString(
        guildId,
        "restrict_no_permission",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const mentions = Array.from(message.mentions.users.values());
      if (mentions.length === 0) {
        const errorMessage = langManager.getString(
          guildId,
          "restrict_no_mention",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const targetUser = mentions[0];

      if (targetUser.id === message.author.id) {
        const errorMessage = langManager.getString(
          guildId,
          "restrict_cannot_restrict_self",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const targetDiscordId = targetUser.id;
      const targetDiscordServerId = guildId || "DM";
      const targetName = targetUser.username;

      const restrictResult = await model.restrictUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        guildLocale
      );

      if (!restrictResult.success) {
        let errorKey = "restrict_error";
        switch (restrictResult.error) {
          case "user_not_found":
            errorKey = "restrict_user_not_found";
            break;
          case "already_restricted":
            errorKey = "restrict_already_restricted";
            break;
          case "restrict_failed":
            errorKey = "restrict_error";
            break;
          default:
            break;
        }

        const errorMessage = langManager.getString(
          guildId,
          errorKey,
          { user: targetName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const successMessage = langManager.getString(
        guildId,
        "restrict_success",
        { user: targetName },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en RestrictCommand:", error);
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
