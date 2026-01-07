const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const Utils = require("../../extras/Utils");
const { EmbedBuilder } = require("discord.js");
const AcceptCommand = require("./AcceptCommand");
const WarType = require("../../enums/WarType");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const metadataGuildId = guildId || "DM";
      let isThread = message.channel.isThread();
      const mentionedUser = message.mentions?.users?.first() || null;

      function parseMMR(args) {
        for (const arg of args) {
          const normalized = arg.replace(/[,.\s]/g, "");
          if (/^\d+$/.test(normalized)) {
            return Number(normalized);
          }
        }
        return 0;
      }

      let challengerId = null;
      let opponentId = null;
      let challengerUsernameHint = null;
      let opponentUsernameHint = null;
      let isCpuOpponent = false;
      let cpuMMR = 0;
      let cpuElo = 0;

      const argsString = args.join(" ").toLowerCase().trim();
      if (argsString.startsWith("cpu")) {
        isCpuOpponent = true;
        cpuMMR = parseMMR(args);
        if (!cpuMMR || cpuMMR < 3000) {
          const errorMessage = langManager.getString(
            guildId,
            "cpuwar_error_invalid_mmr",
            { min: 3000 },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }
        cpuElo = (cpuMMR - 1000) * 0.47;
        challengerId = message.author.id;
        challengerUsernameHint = message.author.username;
      } else if (isThread) {
        const threadId = message.channel.id;
        const threadName = message.channel.name || "";

        if (threadName.includes("scrim")) {
          const errorMessage = langManager.getString(
            guildId,
            "calc_error_scrim",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        if (threadName.includes("war-vs-cpu")) {
          isCpuOpponent = true;

          const activeWar = model.warManager.getActiveWar(threadId);
          if (activeWar) {
            challengerId = activeWar.challengerId;
            challengerUsernameHint = null;
          } else {
            try {
              const thread = message.channel;

              if (thread.ownerId) {
                challengerId = thread.ownerId;
              } else {
                const messages = await message.channel.messages.fetch({
                  limit: 50,
                  cache: false,
                });

                for (const msg of messages.values()) {
                  if (!msg.author.bot) {
                    challengerId = msg.author.id;
                    challengerUsernameHint = msg.author.username;
                    break;
                  }
                }

                if (!challengerId) {
                  challengerId = message.author.id;
                  challengerUsernameHint = message.author.username;
                }
              }
            } catch (err) {
              console.error("❌ Error obteniendo información del hilo:", err);
              challengerId = message.author.id;
              challengerUsernameHint = message.author.username;
            }
          }

          try {
            const messages = await message.channel.messages.fetch({
              limit: 50,
            });

            for (const msg of messages.values()) {
              const content = msg.content || "";

              const match =
                content.match(
                  /CPU\s+(?:de\s+)?(?:nivel|level|niveau)\s+([\d,.\s]+)/i
                ) ||
                content.match(
                  /vs\s+CPU\s+(?:de\s+)?(?:nivel|level|niveau)\s+([\d,.\s]+)/i
                ) ||
                content.match(/CPU\s+level\s+([\d,.\s]+)/i) ||
                content.match(/vs\s+CPU\s+level\s+([\d,.\s]+)/i);
              if (match) {
                const mmrString = match[1].replace(/[,.\s]/g, "");
                cpuMMR = parseInt(mmrString, 10);
                if (cpuMMR && cpuMMR >= 3000) {
                  cpuElo = (cpuMMR - 1000) * 0.5;
                  break;
                }
              }
            }

            if (!cpuMMR || cpuMMR < 3000) {
              const errorMessage = langManager.getString(
                guildId,
                "calc_no_active_war",
                {},
                guildLocale
              );
              const errorEmbed = new EmbedError(
                errorMessage,
                guildId,
                guildLocale
              );
              await message.reply({ embeds: [errorEmbed.build()] });
              return;
            }
          } catch (err) {
            console.error("❌ Error obteniendo mensajes del thread:", err);
            const errorMessage = langManager.getString(
              guildId,
              "calc_no_active_war",
              {},
              guildLocale
            );
            const errorEmbed = new EmbedError(
              errorMessage,
              guildId,
              guildLocale
            );
            await message.reply({ embeds: [errorEmbed.build()] });
            return;
          }
        } else {
          const activeWar = model.warManager.getActiveWar(threadId);
          if (!activeWar) {
            isThread = false;
          } else {
            challengerId = activeWar.challengerId;
            opponentId = activeWar.opponentId;
          }
        }
      }

      if (!isThread) {
        if (!mentionedUser) {
          const userId = message.author.id;
          const userName = message.author.username;

          const userRecord = await model.getUser(
            userId,
            metadataGuildId,
            userName,
            guildLocale
          );

          if (!userRecord) {
            const errorMessage = langManager.getString(
              guildId,
              "calc_error_users",
              {},
              guildLocale
            );
            const errorEmbed = new EmbedError(
              errorMessage,
              guildId,
              guildLocale
            );
            await message.reply({ embeds: [errorEmbed.build()] });
            return;
          }

          try {
            const participantData = await AcceptCommand.prepareParticipant(
              model,
              userRecord,
              message.author,
              "A"
            );

            const calculateTeamAverageStats = (racers) => {
              let totalSum = 0;
              let count = 0;

              racers.forEach((racer) => {
                const lines = Number(racer.lines) || 0;
                const consistency = Number(racer.consistency) || 0;
                const itemUsage = Number(racer.itemUsage) || 0;
                const precision = Number(racer.precision) || 0;
                const communication = Number(racer.communication) || 0;
                const mental = Number(racer.mental) || 0;
                const gameSense = Number(racer.gameSense) || 0;
                const shockFinding = Number(racer.shockFinding) || 0;

                totalSum +=
                  lines +
                  consistency +
                  itemUsage +
                  precision +
                  communication +
                  mental +
                  gameSense +
                  shockFinding;
                count += 8;
              });

              return count > 0 ? totalSum / count : 0;
            };

            const averageStats = calculateTeamAverageStats(
              participantData.racers
            );
            const teamName = userRecord.TeamName || userRecord.Name || userName;

            const embed = new EmbedBuilder()
              .setTitle(
                langManager.getString(
                  guildId,
                  "calc_stats_title",
                  {},
                  guildLocale
                )
              )
              .setDescription(
                langManager.getString(
                  guildId,
                  "calc_stats_description",
                  {
                    user: teamName,
                    average: Math.round(averageStats * 100) / 100,
                  },
                  guildLocale
                )
              )
              .setColor(0x3498db)
              .setTimestamp();

            await message.reply({ embeds: [embed] });
            return;
          } catch (error) {
            if (error.code === "WAR_LINEUP_INSUFFICIENT") {
              const errorMessage = langManager.getString(
                guildId,
                "calc_insufficient_roster",
                {},
                guildLocale
              );
              const errorEmbed = new EmbedError(
                errorMessage,
                guildId,
                guildLocale
              );
              await message.reply({ embeds: [errorEmbed.build()] });
              return;
            }
            throw error;
          }
        }
        challengerId = message.author.id;
        opponentId = mentionedUser.id;
        challengerUsernameHint = message.author.username;
        opponentUsernameHint = mentionedUser.username;
      }

      const challengerRecord = await model.getUser(
        challengerId,
        metadataGuildId,
        challengerUsernameHint,
        guildLocale
      );

      if (!challengerRecord) {
        const errorMessage = langManager.getString(
          guildId,
          "calc_error_users",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let opponentRecord = null;
      if (!isCpuOpponent) {
        opponentRecord = await model.getUser(
          opponentId,
          metadataGuildId,
          opponentUsernameHint,
          guildLocale
        );

        if (!opponentRecord) {
          const errorMessage = langManager.getString(
            guildId,
            "calc_error_users",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }
      }

      const challengerElo = challengerRecord.Elo || 0;
      const opponentElo = isCpuOpponent ? cpuElo : opponentRecord.Elo || 0;
      const challengerName = challengerRecord.Name || `<@${challengerId}>`;
      const opponentName = isCpuOpponent
        ? `CPU (${cpuMMR.toLocaleString()} MMR)`
        : opponentRecord.Name || `<@${opponentId}>`;

      const challengerRank = await Utils.getRankForElo(challengerElo);
      const opponentRank = isCpuOpponent
        ? null
        : await Utils.getRankForElo(opponentElo);

      const challengerWinChange = Utils.calculateEloChange(
        challengerElo,
        opponentElo
      );

      const maxOpponentCanLose = opponentElo;
      const opponentLoseChangeActual = -Math.min(
        challengerWinChange,
        maxOpponentCanLose
      );
      const opponentLoseNewElo = Math.max(
        0,
        opponentElo + opponentLoseChangeActual
      );

      const challengerWinChangeActual = -opponentLoseChangeActual;
      const challengerWinNewElo = challengerElo + challengerWinChangeActual;

      const opponentWinChange = Utils.calculateEloChange(
        opponentElo,
        challengerElo
      );

      const maxChallengerCanLose = challengerElo;
      const challengerLoseChangeActual = -Math.min(
        opponentWinChange,
        maxChallengerCanLose
      );
      const challengerLoseNewElo = Math.max(
        0,
        challengerElo + challengerLoseChangeActual
      );

      const opponentWinChangeActual = -challengerLoseChangeActual;
      const opponentWinNewElo = opponentElo + opponentWinChangeActual;

      let challengerTieNewElo = 0;
      let challengerTieChangeActual = 0;
      let opponentTieNewElo = 0;
      let opponentTieChangeActual = 0;

      if (!isCpuOpponent) {
        const tieChanges = Utils.calculateEloChangeTie(
          challengerElo,
          opponentElo
        );
        challengerTieNewElo = Math.max(
          0,
          challengerElo + tieChanges.playerAChange
        );
        challengerTieChangeActual = challengerTieNewElo - challengerElo;
        opponentTieNewElo = Math.max(0, opponentElo + tieChanges.playerBChange);
        opponentTieChangeActual = opponentTieNewElo - opponentElo;
      }

      const rankPromises = [
        Utils.getRankForElo(challengerWinNewElo),
        Utils.getRankForElo(challengerLoseNewElo),
      ];

      if (!isCpuOpponent) {
        rankPromises.push(
          Utils.getRankForElo(opponentLoseNewElo),
          Utils.getRankForElo(opponentWinNewElo),
          Utils.getRankForElo(challengerTieNewElo),
          Utils.getRankForElo(opponentTieNewElo)
        );
      }

      const ranks = await Promise.all(rankPromises);
      const challengerWinRank = ranks[0];
      const challengerLoseRank = ranks[1];
      const opponentLoseRank = !isCpuOpponent ? ranks[2] : null;
      const opponentWinRank = !isCpuOpponent ? ranks[3] : null;
      const challengerTieRank = !isCpuOpponent ? ranks[4] : null;
      const opponentTieRank = !isCpuOpponent ? ranks[5] : null;

      let challengerAverageMMR = null;
      let opponentAverageMMR = null;
      if (!isCpuOpponent && !isThread && mentionedUser) {
        try {
          const challengerOwnedPlayers = await model.getUserOwnedPlayers(
            challengerRecord.UserID
          );
          const opponentOwnedPlayers = await model.getUserOwnedPlayers(
            opponentRecord.UserID
          );

          if (
            challengerOwnedPlayers.length >= 6 &&
            opponentOwnedPlayers.length >= 6
          ) {
            const challengerLineupDetails =
              await model.getLineupDetailsFromRecord(
                challengerRecord,
                challengerOwnedPlayers
              );
            const opponentLineupDetails =
              await model.getLineupDetailsFromRecord(
                opponentRecord,
                opponentOwnedPlayers
              );

            const challengerEntries = challengerOwnedPlayers
              .map((player) => {
                const id = Number(player.IDPlayer);
                if (!Number.isInteger(id)) return null;
                const display = model.getPlayerDisplayName(player, id);
                const mmr = Number(player.MMR || player.mmr || 0);
                return {
                  id,
                  displayName: display,
                  mmr: Number.isFinite(mmr) ? mmr : 0,
                };
              })
              .filter(Boolean);

            const opponentEntries = opponentOwnedPlayers
              .map((player) => {
                const id = Number(player.IDPlayer);
                if (!Number.isInteger(id)) return null;
                const display = model.getPlayerDisplayName(player, id);
                const mmr = Number(player.MMR || player.mmr || 0);
                return {
                  id,
                  displayName: display,
                  mmr: Number.isFinite(mmr) ? mmr : 0,
                };
              })
              .filter(Boolean);

            const challengerFinalEntries = [];
            const challengerSeenIds = new Set();

            challengerLineupDetails.forEach((entry) => {
              const entryId = Number(entry.id);
              if (!challengerSeenIds.has(entryId)) {
                const ownedEntry = challengerEntries.find(
                  (e) => e.id === entryId
                );
                if (ownedEntry) {
                  challengerFinalEntries.push(ownedEntry);
                  challengerSeenIds.add(entryId);
                }
              }
            });

            const availableChallengerEntries = challengerEntries
              .filter((entry) => !challengerSeenIds.has(entry.id))
              .sort((a, b) => b.mmr - a.mmr);

            for (const entry of availableChallengerEntries) {
              if (challengerFinalEntries.length >= 6) break;
              challengerFinalEntries.push(entry);
              challengerSeenIds.add(entry.id);
            }

            const opponentFinalEntries = [];
            const opponentSeenIds = new Set();

            opponentLineupDetails.forEach((entry) => {
              const entryId = Number(entry.id);
              if (!opponentSeenIds.has(entryId)) {
                const ownedEntry = opponentEntries.find(
                  (e) => e.id === entryId
                );
                if (ownedEntry) {
                  opponentFinalEntries.push(ownedEntry);
                  opponentSeenIds.add(entryId);
                }
              }
            });

            const availableOpponentEntries = opponentEntries
              .filter((entry) => !opponentSeenIds.has(entry.id))
              .sort((a, b) => b.mmr - a.mmr);

            for (const entry of availableOpponentEntries) {
              if (opponentFinalEntries.length >= 6) break;
              opponentFinalEntries.push(entry);
              opponentSeenIds.add(entry.id);
            }

            if (challengerFinalEntries.length >= 6) {
              try {
                const challengerParticipant =
                  await AcceptCommand.prepareParticipant(
                    model,
                    challengerRecord,
                    { id: challengerId, username: challengerUsernameHint },
                    "A"
                  );

                const calculateTeamAverageStats = (racers) => {
                  let totalSum = 0;
                  let count = 0;

                  racers.forEach((racer) => {
                    const mmr = Number(racer.mmr) || 0;
                    const baseLines = Number(racer.lines) || 0;
                    const baseConsistency = Number(racer.consistency) || 0;
                    const baseItemUsage = Number(racer.itemUsage) || 0;
                    const basePrecision = Number(racer.precision) || 0;
                    const baseCommunication = Number(racer.communication) || 0;
                    const baseMental = Number(racer.mental) || 0;
                    const baseGameSense = Number(racer.gameSense) || 0;
                    const baseShockFinding = Number(racer.shockFinding) || 0;

                    const stats = {
                      lines: baseLines + mmr,
                      consistency: baseConsistency + mmr,
                      itemUsage: baseItemUsage + mmr,
                      precision: basePrecision + mmr,
                      communication: baseCommunication + mmr,
                      mental: baseMental + mmr,
                      gameSense: baseGameSense + mmr,
                      shockFinding: baseShockFinding + mmr,
                    };

                    totalSum +=
                      stats.lines +
                      stats.consistency +
                      stats.itemUsage +
                      stats.precision +
                      stats.communication +
                      stats.mental +
                      stats.gameSense +
                      stats.shockFinding;
                    count += 8;
                  });

                  return count > 0 ? totalSum / count : 0;
                };

                challengerAverageMMR = calculateTeamAverageStats(
                  challengerParticipant.racers
                );
              } catch (error) {
                console.error(
                  "❌ Error calculando stats de challenger:",
                  error
                );
              }
            }

            if (opponentFinalEntries.length >= 6) {
              try {
                const opponentParticipant =
                  await AcceptCommand.prepareParticipant(
                    model,
                    opponentRecord,
                    { id: opponentId, username: opponentUsernameHint },
                    "B"
                  );

                const calculateTeamAverageStats = (racers) => {
                  let totalSum = 0;
                  let count = 0;

                  racers.forEach((racer) => {
                    const mmr = Number(racer.mmr) || 0;
                    const baseLines = Number(racer.lines) || 0;
                    const baseConsistency = Number(racer.consistency) || 0;
                    const baseItemUsage = Number(racer.itemUsage) || 0;
                    const basePrecision = Number(racer.precision) || 0;
                    const baseCommunication = Number(racer.communication) || 0;
                    const baseMental = Number(racer.mental) || 0;
                    const baseGameSense = Number(racer.gameSense) || 0;
                    const baseShockFinding = Number(racer.shockFinding) || 0;

                    const stats = {
                      lines: baseLines + mmr,
                      consistency: baseConsistency + mmr,
                      itemUsage: baseItemUsage + mmr,
                      precision: basePrecision + mmr,
                      communication: baseCommunication + mmr,
                      mental: baseMental + mmr,
                      gameSense: baseGameSense + mmr,
                      shockFinding: baseShockFinding + mmr,
                    };

                    totalSum +=
                      stats.lines +
                      stats.consistency +
                      stats.itemUsage +
                      stats.precision +
                      stats.communication +
                      stats.mental +
                      stats.gameSense +
                      stats.shockFinding;
                    count += 8;
                  });

                  return count > 0 ? totalSum / count : 0;
                };

                opponentAverageMMR = calculateTeamAverageStats(
                  opponentParticipant.racers
                );
              } catch (error) {
                console.error("❌ Error calculando stats de opponent:", error);
              }
            }
          }
        } catch (error) {
          console.error("❌ Error calculando media de MMR de lineups:", error);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(langManager.getString(guildId, "calc_title", {}, guildLocale))
        .setColor(0x3498db);

      if (isCpuOpponent) {
        embed.setDescription(
          `**Estado actual:**\n${challengerName}: ${challengerElo.toLocaleString()} Elo (${
            challengerRank.emote
          } ${
            challengerRank.name
          })\n${opponentName}: ${opponentElo.toLocaleString()} Elo`
        );
      } else {
        embed.setDescription(
          langManager.getString(
            guildId,
            "calc_description",
            {
              challenger: challengerName,
              challengerElo: challengerElo.toLocaleString(),
              challengerRank: `${challengerRank.emote} ${challengerRank.name}`,
              opponent: opponentName,
              opponentElo: opponentElo.toLocaleString(),
              opponentRank: `${opponentRank.emote} ${opponentRank.name}`,
            },
            guildLocale
          )
        );
      }

      const fields = [];

      if (
        !isCpuOpponent &&
        !isThread &&
        mentionedUser &&
        challengerAverageMMR !== null &&
        opponentAverageMMR !== null
      ) {
        const challengerTeamName = challengerRecord.TeamName || challengerName;
        const opponentTeamName = opponentRecord.TeamName || opponentName;

        const getEmojiByMMR = (mmr) => {
          if (mmr >= 13500) {
            return "<:emoji:1441958268195962952>";
          } else if (mmr >= 12500) {
            return "<:emoji:1441958336567312404>";
          } else if (mmr >= 11000) {
            return "<:emoji:1441958204937601064>";
          } else if (mmr >= 9500) {
            return "<:emoji:1441958385619828810>";
          } else if (mmr >= 8000) {
            return "<:emoji:1441958418297655367>";
          } else if (mmr >= 6500) {
            return "<:emoji:1441958362958008332>";
          } else if (mmr >= 5000) {
            return "<:emoji:1441958237296660531>";
          } else if (mmr >= 3500) {
            return "<:emoji:1441958450354716692>";
          } else if (mmr >= 2000) {
            return "<:emoji:1441958154010234973>";
          } else {
            return "<:emoji:1441958305466552340>";
          }
        };

        const challengerStatsFormatted = (
          Math.round(challengerAverageMMR * 100) / 100
        ).toLocaleString();
        const opponentStatsFormatted = (
          Math.round(opponentAverageMMR * 100) / 100
        ).toLocaleString();
        const challengerEmoji = getEmojiByMMR(challengerAverageMMR);
        const opponentEmoji = getEmojiByMMR(opponentAverageMMR);

        fields.push({
          name: langManager.getString(
            guildId,
            "war_start_stats_field",
            {},
            guildLocale
          ),
          value: `${challengerTeamName}: ${challengerEmoji} ${challengerStatsFormatted} MMR\n${opponentTeamName}: ${opponentEmoji} ${opponentStatsFormatted} MMR`,
          inline: false,
        });
      }

      if (isCpuOpponent) {
        fields.push({
          name: langManager.getString(
            guildId,
            "calc_scenario_challenger_wins",
            { challenger: challengerName },
            guildLocale
          ),
          value: `• ${
            challengerWinChangeActual >= 0
              ? `+${challengerWinChangeActual}`
              : challengerWinChangeActual
          } Elo → ${challengerWinNewElo.toLocaleString()} (${
            challengerWinRank.emote
          } ${challengerWinRank.name})`,
          inline: false,
        });
      } else {
        fields.push({
          name: langManager.getString(
            guildId,
            "calc_scenario_challenger_wins",
            { challenger: challengerName },
            guildLocale
          ),
          value: langManager.getString(
            guildId,
            "calc_scenario_details",
            {
              challengerChange:
                challengerWinChangeActual >= 0
                  ? `+${challengerWinChangeActual}`
                  : challengerWinChangeActual,
              challengerNewElo: challengerWinNewElo.toLocaleString(),
              challengerNewRank: `${challengerWinRank.emote} ${challengerWinRank.name}`,
              opponentChange:
                opponentLoseChangeActual >= 0
                  ? `+${opponentLoseChangeActual}`
                  : opponentLoseChangeActual,
              opponentNewElo: opponentLoseNewElo.toLocaleString(),
              opponentNewRank: `${opponentLoseRank.emote} ${opponentLoseRank.name}`,
            },
            guildLocale
          ),
          inline: false,
        });
      }

      if (isCpuOpponent) {
        fields.push({
          name: langManager.getString(
            guildId,
            "calc_scenario_opponent_wins",
            { opponent: opponentName },
            guildLocale
          ),
          value: `• ${
            challengerLoseChangeActual >= 0
              ? `+${challengerLoseChangeActual}`
              : challengerLoseChangeActual
          } Elo → ${challengerLoseNewElo.toLocaleString()} (${
            challengerLoseRank.emote
          } ${challengerLoseRank.name})`,
          inline: false,
        });
      } else {
        fields.push({
          name: langManager.getString(
            guildId,
            "calc_scenario_opponent_wins",
            { opponent: opponentName },
            guildLocale
          ),
          value: langManager.getString(
            guildId,
            "calc_scenario_details",
            {
              challengerChange:
                challengerLoseChangeActual >= 0
                  ? `+${challengerLoseChangeActual}`
                  : challengerLoseChangeActual,
              challengerNewElo: challengerLoseNewElo.toLocaleString(),
              challengerNewRank: `${challengerLoseRank.emote} ${challengerLoseRank.name}`,
              opponentChange:
                opponentWinChangeActual >= 0
                  ? `+${opponentWinChangeActual}`
                  : opponentWinChangeActual,
              opponentNewElo: opponentWinNewElo.toLocaleString(),
              opponentNewRank: `${opponentWinRank.emote} ${opponentWinRank.name}`,
            },
            guildLocale
          ),
          inline: false,
        });
      }

      if (!isCpuOpponent && challengerTieRank) {
        fields.push({
          name: langManager.getString(
            guildId,
            "calc_scenario_tie",
            {},
            guildLocale
          ),
          value: langManager.getString(
            guildId,
            "calc_scenario_details",
            {
              challengerChange:
                challengerTieChangeActual >= 0
                  ? `+${challengerTieChangeActual}`
                  : challengerTieChangeActual,
              challengerNewElo: challengerTieNewElo.toLocaleString(),
              challengerNewRank: `${challengerTieRank.emote} ${challengerTieRank.name}`,
              opponentChange:
                opponentTieChangeActual >= 0
                  ? `+${opponentTieChangeActual}`
                  : opponentTieChangeActual,
              opponentNewElo: opponentTieNewElo.toLocaleString(),
              opponentNewRank: `${opponentTieRank.emote} ${opponentTieRank.name}`,
            },
            guildLocale
          ),
          inline: false,
        });
      }

      embed.addFields(fields).setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en CalcCommand:", error);
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
