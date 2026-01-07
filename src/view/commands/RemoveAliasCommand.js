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
      const mentions = Array.from(message.mentions.users.values());
      if (mentions.length > 0) {
        const errorMessage = langManager.getString(
          guildId,
          "removealias_no_mention_allowed",
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
          "removealias_missing_player",
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
            "removealias_missing_quote",
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
          "removealias_missing_player",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const removeResult = await model.removePlayerAliasForUser(
        discordId,
        discordServerId,
        userName,
        playerIdentifier,
        guildLocale
      );

      if (!removeResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (removeResult.error) {
          case "player_not_found":
          case "not_in_roster":
            errorKey = "removealias_player_not_owned";
            break;
          case "user_not_found":
            errorKey = "removealias_user_not_found";
            break;
          case "no_alias":
            errorKey = "removealias_no_alias";
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
        "removealias_success",
        {
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
      console.error("❌ Error en RemoveAliasCommand:", error);
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
