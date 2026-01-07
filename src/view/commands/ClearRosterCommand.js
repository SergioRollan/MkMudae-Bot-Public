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
        "clearroster_only_server",
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
        "clearroster_no_permission",
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

      let targetDiscordId = null;
      let targetDiscordServerId = guildId || "DM";
      let targetName = null;

      if (targetUser) {
        targetDiscordId = targetUser.id;
        targetName = targetUser.username;
      } else {
        const textArgs = args.filter((arg) => !arg.startsWith("<@"));
        const teamName = textArgs.join(" ").trim();

        if (!teamName) {
          const errorMessage = langManager.getString(
            guildId,
            "clearroster_no_mention_or_teamname",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        const users = await model.userDAO.getUsersByServer(guildId);
        const matchingUser = users.find((u) => {
          const userTeamName = (u.TeamName || "").trim();
          return (
            userTeamName.toLowerCase() === teamName.toLowerCase() ||
            (u.Name || "").toLowerCase() === teamName.toLowerCase()
          );
        });

        if (!matchingUser) {
          const errorMessage = langManager.getString(
            guildId,
            "clearroster_user_not_found",
            { teamname: teamName },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        targetDiscordId = matchingUser.DiscordID;
        targetName = matchingUser.Name || matchingUser.TeamName || "Unknown";
      }

      const clearResult = await model.clearUserRoster(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        guildLocale
      );

      if (!clearResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (clearResult.error) {
          case "user_not_found":
            errorKey = "clearroster_user_not_found";
            params = { teamname: targetName };
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
        "clearroster_success",
        {
          user: targetName,
          count: clearResult.playersRemoved,
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
      console.error("❌ Error en ClearRosterCommand:", error);
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
