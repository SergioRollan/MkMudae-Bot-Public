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
        "editteamname_only_server",
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
        "editteamname_no_permission",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const mentions = Array.from(message.mentions.users.values());
      const targetUser = mentions.length > 0 ? mentions[0] : null;

      if (!targetUser) {
        const errorMessage = langManager.getString(
          guildId,
          "editteamname_no_mention",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const textArgs = args.filter((arg) => !arg.startsWith("<@"));
      const newTeamName = textArgs.join(" ").trim();

      if (!newTeamName) {
        const errorMessage = langManager.getString(
          guildId,
          "editteamname_missing",
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

      const updateResult = await model.updateTeamNameForUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        newTeamName,
        guildLocale
      );

      if (!updateResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (updateResult.error) {
          case "empty":
            errorKey = "editteamname_missing";
            break;
          case "too_long":
            errorKey = "editteamname_too_long";
            params = { max: updateResult.maxLength };
            break;
          case "no_change":
            errorKey = "editteamname_no_change";
            params = { teamName: updateResult.teamName };
            break;
          case "user_not_found":
            errorKey = "editteamname_user_not_found";
            break;
          case "teamname_taken":
            errorKey = "editteamname_teamname_taken";
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
        "editteamname_success",
        {
          user: targetUser.username,
          teamName: updateResult.teamName,
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
      console.error("❌ Error en EditTeamNameCommand:", error);
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
