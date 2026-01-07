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
        "edittag_only_server",
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
        "edittag_no_permission",
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
          "edittag_no_mention",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const targetUser = mentions[0];

      const textArgs = args.filter((arg) => !arg.startsWith("<@"));
      const newTag = textArgs.join(" ").trim();

      if (!newTag) {
        const errorMessage = langManager.getString(
          guildId,
          "edittag_missing_tag",
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

      const updateResult = await model.updateTagForUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        newTag,
        guildLocale
      );

      if (!updateResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (updateResult.error) {
          case "empty":
            errorKey = "edittag_missing_tag";
            break;
          case "too_long":
            errorKey = "edittag_too_long";
            params = { max: updateResult.maxLength };
            break;
          case "no_change":
            errorKey = "edittag_no_change";
            params = { tag: updateResult.tag };
            break;
          case "user_not_found":
            errorKey = "edittag_user_not_found";
            break;
          case "tag_cpu_forbidden":
            errorKey = "tag_cpu_forbidden";
            break;
          default:
            break;
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

      const previousTagText = updateResult.previousTag
        ? ` (anteriormente: ${updateResult.previousTag})`
        : "";

      const successMessage = langManager.getString(
        guildId,
        "edittag_success",
        {
          user: targetName,
          tag: updateResult.tag,
          previousTag: previousTagText,
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
      console.error("❌ Error en EditTagCommand:", error);
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
