const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const LanguageManager = require("../../managers/LanguageManager");
const Model = require("../../model/Model");
const PlayerDAO = require("../../dao/PlayerDAO");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const playerName = args.join(" ").trim();

      if (!playerName) {
        const errorMessage = langManager.getString(
          guildId,
          "playerstats_no_name",
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

      let loungePlayer = null;
      try {
        const user = await model.getUser(
          discordId,
          discordServerId,
          userName,
          guildLocale
        );

        if (user) {
          const ownedPlayers = await model.getUserOwnedPlayers(user.UserID);
          const index = model.buildOwnedPlayerIndex(
            ownedPlayers,
            (playerData, playerId) =>
              model.getPlayerDisplayName(playerData, playerId)
          );

          const token = model.createPlayerToken(playerName);
          const match = model.resolveOwnedPlayerToken(token, index);

          if (match && match.data?.LoungeID) {
            loungePlayer = await model.loungeDAO.getPlayerByLoungeIdOrName(
              match.data.LoungeID,
              null
            );
          }
        }
      } catch (error) {
        console.error("❌ Error buscando por alias en roster:", error);
      }

      if (!loungePlayer) {
        loungePlayer = await model.getLoungePlayerByName(playerName);
      }

      if (!loungePlayer) {
        const errorMessage = langManager.getString(
          guildId,
          "playerstats_not_found",
          { name: playerName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let roles = null;
      const playerRecord = await model.getPlayerByLoungeIdInServer(
        loungePlayer.lounge_id,
        discordServerId
      );

      if (playerRecord) {
        roles = {
          Lines: playerRecord.Lines || 0,
          Consistency: playerRecord.Consistency || 0,
          ItemUsage: playerRecord.ItemUsage || 0,
          Precision: playerRecord.Precision || 0,
          Communication: playerRecord.Communication || 0,
          Mental: playerRecord.Mental || 0,
          GameSense: playerRecord.GameSense || 0,
          Shockfinding: playerRecord.Shockfinding || 0,
        };

        const allZero = Object.values(roles).every((val) => val === 0);
        if (allZero) {
          const playerDAO = new PlayerDAO();
          const initialStats = await playerDAO.getInitialStatsByLoungeId(
            loungePlayer.lounge_id
          );
          if (initialStats) {
            roles = initialStats;
          }
        }
      } else {
        const playerDAO = new PlayerDAO();
        const initialStats = await playerDAO.getInitialStatsByLoungeId(
          loungePlayer.lounge_id
        );
        if (initialStats) {
          roles = initialStats;
        }
      }

      if (!roles) {
        roles = {
          Lines: 0,
          Consistency: 0,
          ItemUsage: 0,
          Precision: 0,
          Communication: 0,
          Mental: 0,
          GameSense: 0,
          Shockfinding: 0,
        };
      }

      let energy = 100;
      if (playerRecord) {
        energy = playerRecord.energy ?? playerRecord.Energy ?? 100;
      }

      const baseMmr = loungePlayer.mmr || 0;
      const energyMultiplier = energy / 100;

      const statsWithMMR = {
        Lines: Math.max(
          0,
          Math.floor(((roles.Lines || 0) + baseMmr) * energyMultiplier)
        ),
        Consistency: Math.max(
          0,
          Math.floor(((roles.Consistency || 0) + baseMmr) * energyMultiplier)
        ),
        ItemUsage: Math.max(
          0,
          Math.floor(((roles.ItemUsage || 0) + baseMmr) * energyMultiplier)
        ),
        Precision: Math.max(
          0,
          Math.floor(((roles.Precision || 0) + baseMmr) * energyMultiplier)
        ),
        Communication: Math.max(
          0,
          Math.floor(((roles.Communication || 0) + baseMmr) * energyMultiplier)
        ),
        Mental: Math.max(
          0,
          Math.floor(((roles.Mental || 0) + baseMmr) * energyMultiplier)
        ),
        GameSense: Math.max(
          0,
          Math.floor(((roles.GameSense || 0) + baseMmr) * energyMultiplier)
        ),
        Shockfinding: Math.max(
          0,
          Math.floor(((roles.Shockfinding || 0) + baseMmr) * energyMultiplier)
        ),
      };

      const totalStats = Object.values(roles).reduce(
        (sum, val) => sum + val,
        0
      );

      let progressPercent = 0;
      if (totalStats <= 330) {
        progressPercent = 0;
      } else if (totalStats >= 8000) {
        progressPercent = 100;
      } else {
        progressPercent = ((totalStats - 330) / (8000 - 330)) * 100;
      }

      const totalBlocks = 33;
      const activeBlocks = Math.round(progressPercent / (100 / totalBlocks));
      const emptyBlocks = Math.max(0, totalBlocks - activeBlocks);
      const progressBar =
        "```" +
        "|".repeat(Math.max(0, activeBlocks)) +
        " ".repeat(emptyBlocks) +
        "```";

      const attributeKeys = [
        { key: "Lines", stringKey: "playerinfo_role_lines" },
        { key: "Consistency", stringKey: "playerinfo_role_consistency" },
        { key: "ItemUsage", stringKey: "playerinfo_role_item_usage" },
        { key: "Precision", stringKey: "playerinfo_role_precision" },
        { key: "Communication", stringKey: "playerinfo_role_communication" },
        { key: "Mental", stringKey: "playerinfo_role_mental" },
        { key: "GameSense", stringKey: "playerinfo_role_game_sense" },
        { key: "Shockfinding", stringKey: "playerinfo_role_shockfinding" },
      ];

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
          langManager.getString(
            guildId,
            "playerstats_title",
            { name: loungePlayer.name },
            guildLocale
          )
        )
        .addFields([
          {
            name: langManager.getString(
              guildId,
              "playerstats_attributes_title",
              {},
              guildLocale
            ),
            value: attributeKeys
              .map((attr) => {
                const attrName = langManager.getString(
                  guildId,
                  attr.stringKey,
                  {},
                  guildLocale
                );
                return `**${attrName}:** ${statsWithMMR[
                  attr.key
                ].toLocaleString()}`;
              })
              .join("\n"),
            inline: false,
          },
          {
            name: langManager.getString(
              guildId,
              "playerstats_progress_title",
              {},
              guildLocale
            ),
            value: `${progressBar}**${progressPercent.toFixed(1)}%**`,
            inline: false,
          },
        ])
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en PlayerStatsCommand:", error);
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
