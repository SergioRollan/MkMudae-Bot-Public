const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedLineupUpdate = require("../../extras/embedbuilder/embedcomponents/EmbedLineupUpdate");

function parsePlayers(args) {
  const joined = args.join(" ").trim();
  if (!joined) {
    return [];
  }

  if (joined.includes(",")) {
    return joined
      .split(",")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
  }

  return [joined];
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    const players = parsePlayers(args);

    if (players.length === 0) {
      const errorMessage = langManager.getString(
        guildId,
        "lineupadd_no_players",
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
        "lineupadd_too_many_at_once",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const result = await model.addPlayersToLineup(
        discordId,
        discordServerId,
        userName,
        players
      );

      if (!result.success) {
        let errorKey = "lineupadd_error_processing";
        const params = {};

        switch (result.error) {
          case "no_players":
            errorKey = "lineupadd_no_players";
            break;
          case "too_many_requested":
            errorKey = "lineupadd_too_many_at_once";
            break;
          case "user_not_found":
            errorKey = "lineupadd_user_not_found";
            break;
          case "players_already_present":
            errorKey = "lineupadd_already_present";
            break;
          case "lineup_limit_exceeded":
            errorKey = "lineupadd_limit_exceeded";
            params.current = result.current ?? 0;
            params.available =
              result.availableSlots !== undefined
                ? result.availableSlots
                : Math.max(0, 6 - (result.current ?? 0));
            params.limit = 6;
            break;
          case "players_not_in_roster":
            errorKey = "lineupadd_not_in_roster";
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
      console.error("❌ Error en LineupAddCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "lineupadd_error_processing",
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
