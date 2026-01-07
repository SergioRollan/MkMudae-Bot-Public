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
        "lineupremove_no_players",
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

      const result = await model.removePlayersFromLineup(
        discordId,
        discordServerId,
        userName,
        players
      );

      if (!result.success) {
        let errorKey = "lineupremove_error_processing";
        const params = {};

        switch (result.error) {
          case "no_players":
            errorKey = "lineupremove_no_players";
            break;
          case "user_not_found":
            errorKey = "lineupremove_user_not_found";
            break;
          case "lineup_empty":
            errorKey = "lineupremove_empty";
            break;
          case "players_not_in_lineup":
            errorKey = "lineupremove_not_found";
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
        changedPlayers: result.removed,
        changedFieldKey: "lineupremove_field_removed",
        titleKey: "lineupremove_success_title",
        descriptionKey: "lineupremove_success_description",
        descriptionParams: { count: result.lineup.length },
        lineupFieldKey: "lineupremove_field_lineup",
        guildId,
        guildLocale,
      });

      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en LineupRemoveCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "lineupremove_error_processing",
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
