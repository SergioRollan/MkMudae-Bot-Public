const Model = require("../../model/Model");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedRoster = require("../../extras/embedbuilder/embedcomponents/EmbedRoster");
const LanguageManager = require("../../managers/LanguageManager");
const PlayerDAO = require("../../dao/PlayerDAO");

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

      const playerDAO = new PlayerDAO();

      const playersWithStats = await Promise.all(
        result.players.map(async (player) => {
          const baseMmr = player.MMR || 0;
          let energy = 100;
          let attributes = {
            Lines: player.Lines || 0,
            Consistency: player.Consistency || 0,
            ItemUsage: player.ItemUsage || 0,
            Precision: player.Precision || 0,
            Communication: player.Communication || 0,
            Mental: player.Mental || 0,
            GameSense: player.GameSense || 0,
            Shockfinding: player.Shockfinding || 0,
          };

          if (player.IDPlayer) {
            const playerRecord = await playerDAO.getPlayerByIdInServer(
              player.IDPlayer,
              discordServerId
            );

            if (playerRecord) {
              energy = playerRecord.energy ?? playerRecord.Energy ?? 100;

              const allZero = Object.values(attributes).every(
                (val) => val === 0
              );
              if (allZero) {
                const initialStats = await playerDAO.getInitialStatsByLoungeId(
                  player.LoungeID || player.LoungeId
                );
                if (initialStats) {
                  attributes = initialStats;
                }
              } else {
                attributes = {
                  Lines: playerRecord.Lines || 0,
                  Consistency: playerRecord.Consistency || 0,
                  ItemUsage: playerRecord.ItemUsage || 0,
                  Precision: playerRecord.Precision || 0,
                  Communication: playerRecord.Communication || 0,
                  Mental: playerRecord.Mental || 0,
                  GameSense: playerRecord.GameSense || 0,
                  Shockfinding: playerRecord.Shockfinding || 0,
                };
              }
            } else {
              const allZero = Object.values(attributes).every(
                (val) => val === 0
              );
              if (allZero) {
                const initialStats = await playerDAO.getInitialStatsByLoungeId(
                  player.LoungeID || player.LoungeId
                );
                if (initialStats) {
                  attributes = initialStats;
                }
              }
            }
          }

          const energyMultiplier = energy / 100;

          const statsWithMMR = {
            Lines: Math.max(
              0,
              Math.floor(((attributes.Lines || 0) + baseMmr) * energyMultiplier)
            ),
            Consistency: Math.max(
              0,
              Math.floor(
                ((attributes.Consistency || 0) + baseMmr) * energyMultiplier
              )
            ),
            ItemUsage: Math.max(
              0,
              Math.floor(
                ((attributes.ItemUsage || 0) + baseMmr) * energyMultiplier
              )
            ),
            Precision: Math.max(
              0,
              Math.floor(
                ((attributes.Precision || 0) + baseMmr) * energyMultiplier
              )
            ),
            Communication: Math.max(
              0,
              Math.floor(
                ((attributes.Communication || 0) + baseMmr) * energyMultiplier
              )
            ),
            Mental: Math.max(
              0,
              Math.floor(
                ((attributes.Mental || 0) + baseMmr) * energyMultiplier
              )
            ),
            GameSense: Math.max(
              0,
              Math.floor(
                ((attributes.GameSense || 0) + baseMmr) * energyMultiplier
              )
            ),
            Shockfinding: Math.max(
              0,
              Math.floor(
                ((attributes.Shockfinding || 0) + baseMmr) * energyMultiplier
              )
            ),
          };

          const averageStats =
            (statsWithMMR.Lines +
              statsWithMMR.Consistency +
              statsWithMMR.ItemUsage +
              statsWithMMR.Precision +
              statsWithMMR.Communication +
              statsWithMMR.Mental +
              statsWithMMR.GameSense +
              statsWithMMR.Shockfinding) /
            8;

          return {
            ...player,
            averageStats: averageStats,
          };
        })
      );

      const sortedPlayers = playersWithStats.sort(
        (a, b) => (b.averageStats || 0) - (a.averageStats || 0)
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

        const indexLabel = String(i + 1).padStart(2, "0");
        const averageStats = Math.round((player.averageStats || 0) * 100) / 100;
        const line = `\`${indexLabel}\` ${playerName} — **${averageStats.toLocaleString()}**`;
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
      console.error("❌ Error en RosterStatsCommand:", error);

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
