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
      const newTeamName = args.join(" ").trim();

      if (!newTeamName) {
        const errorMessage = langManager.getString(
          guildId,
          "teamname_missing",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;

      const updateResult = await model.updateTeamName(
        discordId,
        guildId || "DM",
        message.author.username,
        newTeamName,
        guildLocale
      );

      if (!updateResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (updateResult.error) {
          case "empty":
            errorKey = "teamname_missing";
            break;
          case "too_long":
            errorKey = "teamname_too_long";
            params = { max: updateResult.maxLength };
            break;
          case "no_change":
            errorKey = "teamname_no_change";
            params = { teamName: updateResult.teamName };
            break;
          case "name_restricted":
            errorKey = "name_restricted";
            break;
          case "teamname_taken":
            errorKey = "teamname_taken";
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
        "teamname_success",
        { teamName: updateResult.teamName },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en TeamNameCommand:", error);
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
