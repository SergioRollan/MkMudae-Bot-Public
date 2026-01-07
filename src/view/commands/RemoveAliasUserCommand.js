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
        "removealiasuser_only_server",
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
        "removealiasuser_no_permission",
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
          "removealiasuser_no_mention",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const textArgs = args.filter((arg) => !arg.startsWith("<@"));

      if (textArgs.length === 0) {
        const errorMessage = langManager.getString(
          guildId,
          "removealiasuser_missing_player",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let playerIdentifier = "";
      const fullText = textArgs.join(" ");

      if (fullText.startsWith('"')) {
        const quoteStart = fullText.indexOf('"');
        const quoteEnd = fullText.indexOf('"', quoteStart + 1);

        if (quoteEnd === -1) {
          const errorMessage = langManager.getString(
            guildId,
            "removealiasuser_missing_quote",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        playerIdentifier = fullText.slice(quoteStart + 1, quoteEnd).trim();
      } else {
        playerIdentifier = fullText.trim();
      }

      if (!playerIdentifier) {
        const errorMessage = langManager.getString(
          guildId,
          "removealiasuser_missing_player",
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

      const removeResult = await model.removePlayerAliasForUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        playerIdentifier,
        guildLocale
      );

      if (!removeResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (removeResult.error) {
          case "player_not_found":
          case "not_in_roster":
            errorKey = "removealiasuser_player_not_owned";
            break;
          case "user_not_found":
            errorKey = "removealiasuser_user_not_found";
            break;
          case "no_alias":
            errorKey = "removealiasuser_no_alias";
            params = { player: removeResult.playerName || playerIdentifier };
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
        "removealiasuser_success",
        {
          user: targetUser.username,
          player: removeResult.playerName,
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
      console.error("❌ Error en RemoveAliasUserCommand:", error);
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
