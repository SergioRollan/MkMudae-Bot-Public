const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedLineupUpdate = require("../../extras/embedbuilder/embedcomponents/EmbedLineupUpdate");

function parseQuotedPlayers(text) {
  const players = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const quoteStart = text.indexOf('"', currentIndex);

    if (quoteStart === -1) {
      break;
    }

    const quoteEnd = text.indexOf('"', quoteStart + 1);

    if (quoteEnd === -1) {
      return { error: "unclosed_quote", position: quoteStart };
    }

    const playerName = text.slice(quoteStart + 1, quoteEnd).trim();

    if (playerName.length > 0) {
      players.push(playerName);
    }

    currentIndex = quoteEnd + 1;
  }

  return { players };
}

function parseCommaSeparatedPlayers(text) {
  const players = text
    .split(",")
    .map((player) => player.trim())
    .filter((player) => player.length > 0);

  return { players };
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const fullText = message.content || "";

      const commandMatch = fullText.match(/^\s*\$(lineup|lu)\s+/i);
      const textAfterCommand = commandMatch
        ? fullText.slice(commandMatch[0].length).trim()
        : args.join(" ").trim();

      if (!textAfterCommand) {
        const discordId = message.author.id;
        const discordServerId = guildId || "DM";
        const userName = message.author.username;

        const result = await model.setLineup(
          discordId,
          discordServerId,
          userName,
          []
        );

        if (!result.success) {
          const errorMessage = langManager.getString(
            guildId,
            "lineup_error_processing",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        const successEmbed = new EmbedLineupUpdate({
          lineup: result.lineup || [],
          guildId,
          guildLocale,
        });

        await message.reply({ embeds: [successEmbed.build()] });
        return;
      }

      let players = [];
      const hasQuotes = textAfterCommand.includes('"');

      if (hasQuotes) {
        const parseResult = parseQuotedPlayers(textAfterCommand);

        if (parseResult.error) {
          const errorMessage = langManager.getString(
            guildId,
            "lineup_unclosed_quote",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        players = parseResult.players;
      } else {
        const parseResult = parseCommaSeparatedPlayers(textAfterCommand);
        players = parseResult.players;
      }

      if (players.length === 0) {
        const errorMessage = langManager.getString(
          guildId,
          "lineup_no_players",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      if (players.length > 6) {
        const errorMessage = langManager.getString(
          guildId,
          "lineup_too_many_players",
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

      const result = await model.setLineup(
        discordId,
        discordServerId,
        userName,
        players
      );

      if (!result.success) {
        let errorKey = "lineup_error_processing";
        const params = {};

        switch (result.error) {
          case "too_many_players":
            errorKey = "lineup_too_many_players";
            break;
          case "user_not_found":
            errorKey = "lineup_user_not_found";
            break;
          case "invalid_players":
            errorKey = "lineup_invalid_players";
            break;
          case "players_not_in_roster":
            errorKey = "lineup_not_in_roster";
            params.players = Array.isArray(result.players)
              ? result.players.join(", ")
              : "";
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

      const successEmbed = new EmbedLineupUpdate({
        lineup: result.lineup,
        guildId,
        guildLocale,
      });

      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en LineupCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "lineup_error_processing",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const embed = errorEmbed.build();
      embed.setFooter({ text: error.message });

      await message.reply({ embeds: [embed] });
    }
  },
};
