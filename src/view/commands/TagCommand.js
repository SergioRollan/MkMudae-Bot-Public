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

    try {
      const newTag = args.join(" ").trim();

      if (!newTag) {
        const errorMessage = langManager.getString(
          guildId,
          "tag_missing",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;

      const updateResult = await model.updateTag(
        discordId,
        guildId || "DM",
        message.author.username,
        newTag,
        guildLocale
      );

      if (!updateResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (updateResult.error) {
          case "empty":
            errorKey = "tag_missing";
            break;
          case "too_long":
            errorKey = "tag_too_long";
            params = { max: updateResult.maxLength };
            break;
          case "no_change":
            errorKey = "tag_no_change";
            params = { tag: updateResult.tag };
            break;
          case "tag_cpu_forbidden":
            errorKey = "tag_cpu_forbidden";
            break;
          case "name_restricted":
            errorKey = "name_restricted";
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

      const successMessage = langManager.getString(
        guildId,
        "tag_success",
        { tag: updateResult.tag },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en TagCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      await message.reply({ content: errorMessage });
    }
  },
};
