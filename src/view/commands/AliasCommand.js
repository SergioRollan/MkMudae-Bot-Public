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
      if (!Array.isArray(args) || args.length < 2) {
        const errorMessage = langManager.getString(
          guildId,
          "alias_missing_args",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let playerIdentifier = "";
      let aliasValue = "";

      const fullText = args.join(" ");
      const firstQuote = fullText.indexOf('"');

      if (firstQuote !== -1) {
        const secondQuote = fullText.indexOf('"', firstQuote + 1);

        if (secondQuote === -1) {
          const errorMessage = langManager.getString(
            guildId,
            "alias_missing_quote",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        playerIdentifier = fullText.slice(0, firstQuote).trim();
        aliasValue = fullText.slice(firstQuote + 1, secondQuote).trim();
      } else {
        playerIdentifier = args.slice(0, -1).join(" ").trim();
        aliasValue = args[args.length - 1].trim();
      }

      if (!playerIdentifier) {
        const errorMessage = langManager.getString(
          guildId,
          "alias_missing_player",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      if (!aliasValue) {
        const errorMessage = langManager.getString(
          guildId,
          "alias_missing_alias",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;
      const userName = message.author.username;
      const discordServerId = guildId || "DM";

      const result = await model.updatePlayerAlias(
        discordId,
        discordServerId,
        userName,
        playerIdentifier,
        aliasValue,
        guildLocale
      );

      if (!result.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (result.error) {
          case "alias_missing":
            errorKey = "alias_missing_alias";
            break;
          case "alias_too_long":
            errorKey = "alias_too_long";
            params = { max: result.maxLength };
            break;
          case "player_not_found":
          case "not_in_roster":
            if (aliasValue.includes(" ") && firstQuote === -1) {
              errorKey = "alias_player_not_owned_suggest_quotes";
            } else {
              errorKey = "alias_player_not_owned";
            }
            break;
          case "alias_no_change":
            errorKey = "alias_no_change";
            params = { alias: result.alias };
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
        "alias_success",
        {
          player: result.originalName,
          alias: result.newAlias,
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
      console.error("❌ Error en AliasCommand:", error);
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
