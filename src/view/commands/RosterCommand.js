const Model = require("../../model/Model");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedRoster = require("../../extras/embedbuilder/embedcomponents/EmbedRoster");
const LanguageManager = require("../../managers/LanguageManager");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      let targetUser = message.author;
      let isOwnRoster = true;

      if (args.length > 0 && message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
        isOwnRoster = false;
      } else if (args.length > 0) {
        const errorMessage = langManager.getString(
          guildId,
          "roster_invalid_mention",
          {},
          guildLocale
        );

        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = targetUser.id;
      const discordServerId = guildId || "DM";
      const userName = targetUser.username;

      const result = await model.getUserCollection(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      const userRank = await model.getUserRankData(
        discordId,
        discordServerId,
        userName
      );
      const maxRoster = userRank.max_roster;

      const teamName = result.user?.TeamName || result.user?.Name || userName;

      if (!result.success || result.players.length === 0) {
        const emptyMessage = isOwnRoster
          ? langManager.getString(guildId, "roster_empty", {}, guildLocale)
          : langManager.getString(
              guildId,
              "roster_empty_other",
              { name: teamName },
              guildLocale
            );

        const emptyEmbed = new EmbedRoster(
          teamName,
          isOwnRoster,
          true,
          0,
          guildId,
          guildLocale
        );
        const emptyEmbedBuilt = emptyEmbed.build();

        const footerText =
          langManager.getString(
            guildId,
            "roster_footer_singular",
            { count: 0, max: maxRoster },
            guildLocale
          ) || `Total: 0/${maxRoster} player`;
        emptyEmbedBuilt.setFooter({ text: footerText });

        await message.reply({ embeds: [emptyEmbedBuilt] });
        return;
      }

      const sortedPlayers = result.players.sort(
        (a, b) => (b.MMR || 0) - (a.MMR || 0)
      );

      const rosterEmbed = new EmbedRoster(
        teamName,
        isOwnRoster,
        false,
        result.count,
        guildId,
        guildLocale
      ).build();

      const lines = [];
      for (let i = 0; i < sortedPlayers.length; i += 1) {
        const player = sortedPlayers[i];

        const mmr = player.MMR || 0;
        const fallbackId =
          Number(
            player.IDPlayer ??
              player.PlayerID ??
              player.playerId ??
              player.id ??
              i + 1
          ) || i + 1;
        const displayName =
          model.getPlayerDisplayName(player, fallbackId) ||
          langManager.getString(
            guildId,
            "roster_unknown_player",
            {},
            guildLocale
          );
        const baseName =
          player?.LoungeName || player?.Name || `Player #${fallbackId}`;
        const playerName =
          displayName === baseName
            ? displayName
            : `${displayName} (${baseName})`;

        let mmrEmoji = "";
        if (mmr >= 13500) {
          mmrEmoji = "<:emoji:1441958268195962952>";
        } else if (mmr >= 12500) {
          mmrEmoji = "<:emoji:1441958336567312404>";
        } else if (mmr >= 11000) {
          mmrEmoji = "<:emoji:1441958204937601064>";
        } else if (mmr >= 9500) {
          mmrEmoji = "<:emoji:1441958385619828810>";
        } else if (mmr >= 8000) {
          mmrEmoji = "<:emoji:1441958418297655367>";
        } else if (mmr >= 6500) {
          mmrEmoji = "<:emoji:1441958362958008332>";
        } else if (mmr >= 5000) {
          mmrEmoji = "<:emoji:1441958237296660531>";
        } else if (mmr >= 3500) {
          mmrEmoji = "<:emoji:1441958450354716692>";
        } else if (mmr >= 2000) {
          mmrEmoji = "<:emoji:1441958154010234973>";
        } else {
          mmrEmoji = "<:emoji:1441958305466552340>";
        }

        const indexLabel = String(i + 1).padStart(2, "0");
        const peak = player.PeakMMR || 0;
        const events = player.Events || 0;

        const attributes = {
          Lines: player.Lines || 0,
          Consistency: player.Consistency || 0,
          ItemUsage: player.ItemUsage || 0,
          Precision: player.Precision || 0,
          Communication: player.Communication || 0,
          Mental: player.Mental || 0,
          GameSense: player.GameSense || 0,
          Shockfinding: player.Shockfinding || 0,
        };

        const marketValue = Utils.getMarketValue(mmr, peak, events, attributes);
        const line = `\`${indexLabel}\` ${mmrEmoji} ${playerName} — MMR: ${mmr} · Peak: ${peak} · Events: ${events} · Value: ${marketValue.toLocaleString()}`;
        lines.push(line);
      }

      if (lines.length > 0) {
        const baseDescription = rosterEmbed.data?.description || "";
        const joinedLines = lines.join("\n");
        const maxDescriptionLength = 4096;
        let finalDescription = baseDescription
          ? `${baseDescription}\n\n${joinedLines}`
          : joinedLines;

        if (finalDescription.length > maxDescriptionLength) {
          finalDescription =
            finalDescription.slice(0, maxDescriptionLength - 1).trimEnd() + "…";
        }

        rosterEmbed.setDescription(finalDescription);
      }

      const footerKey =
        result.count === 1 ? "roster_footer_singular" : "roster_footer_plural";
      const footerText = (
        langManager.getString(
          guildId,
          footerKey,
          { count: result.count, max: maxRoster },
          guildLocale
        ) ||
        `Total: ${result.count}/${maxRoster} ${
          result.count === 1 ? "player" : "players"
        }`
      )
        .replace("{count}", result.count)
        .replace("{max}", maxRoster);
      rosterEmbed.setFooter({
        text: footerText,
      });

      await message.reply({ embeds: [rosterEmbed] });
    } catch (error) {
      console.error("❌ Error en RosterCommand:", error);

      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const finalEmbed = errorEmbed.build();
      finalEmbed.setFooter({ text: error.message });

      await message.reply({ embeds: [finalEmbed] });
    }
  },
};
