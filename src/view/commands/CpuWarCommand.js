const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const WarType = require("../../enums/WarType");
const AcceptCommand = require("./AcceptCommand");
const Utils = require("../../extras/Utils");

const prepareParticipant = AcceptCommand.prepareParticipant;
const runWarSimulation = AcceptCommand.runWarSimulation;
const determineRankChange = AcceptCommand.determineRankChange;
const formatRankName = AcceptCommand.formatRankName;

function generateDefaultTag(discordName) {
  if (!discordName || typeof discordName !== "string") {
    return "USR";
  }

  const lettersOnly = discordName.replace(/[^a-zA-Z]/g, "");

  if (lettersOnly.length === 0) {
    return "USR";
  }

  const tag = lettersOnly.substring(0, 3).toUpperCase();

  return tag || "USR";
}

function parseMMR(args) {
  for (const arg of args) {
    const normalized = arg.replace(/[,.\s]/g, "");
    if (/^\d+$/.test(normalized)) {
      return Number(normalized);
    }
  }
  return 0;
}

function createCpuTeam(mmr) {
  const cpuPlayers = [];
  const finalStatValue = mmr;

  for (let i = 1; i <= 6; i++) {
    cpuPlayers.push({
      playerId: `cpu_${i}`,
      name: `cpu${i}`,
      teamKey: "B",
      teamName: "CPU",
      totalPoints: 0,
      mmr: 0,

      lines: finalStatValue,
      consistency: finalStatValue,
      itemUsage: finalStatValue,
      precision: finalStatValue,
      communication: finalStatValue,
      mental: finalStatValue,
      gameSense: finalStatValue,
      shockFinding: finalStatValue,
    });
  }
  return cpuPlayers;
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    const challenger = message.author;
    const mmr = parseMMR(args);

    if (!mmr || mmr < 3000 || mmr > 99999) {
      const errorMessage = langManager.getString(
        guildId,
        "cpuwar_error_invalid_mmr",
        { min: 3000, max: 99999 },
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    const metadataGuildId = guildId || "DM";

    try {
      const challengerRecord = await model.getUser(
        challenger.id,
        metadataGuildId,
        challenger.username,
        guildLocale
      );

      if (!challengerRecord) {
        const errorMessage = langManager.getString(
          guildId,
          "cpuwar_error_user_not_found",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      if (!challengerRecord.canwarcpu) {
        const errorMessage = langManager.getString(
          guildId,
          "cpuwar_error_cannot_war",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let challengerData;
      try {
        challengerData = await prepareParticipant(
          model,
          challengerRecord,
          challenger,
          "A"
        );
      } catch (prepError) {
        console.error("❌ Error preparando participante:", prepError);
        let errorKey = "cpuwar_error_unknown";
        const params = {};
        if (prepError.code === "WAR_LINEUP_INSUFFICIENT") {
          errorKey = "war_error_lineup_incomplete";
          params.user =
            prepError.userDisplayName ||
            challengerRecord?.TeamName ||
            challengerRecord?.Name ||
            challenger.username;
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

      const challengerTag =
        challengerData.teamTag || generateDefaultTag(challengerData.userName);
      challengerData.racers.forEach((racer) => {
        racer.teamTag = challengerTag;
      });

      const cpuRacers = createCpuTeam(mmr);
      const opponentData = {
        id: "cpu",
        tag: "CPU",
        displayName: "CPU",
        userName: "CPU",
        teamName: "CPU",
        teamTag: "CPU",
        lineup: cpuRacers.map((r) => r.name),
        racers: cpuRacers,
        elo: (mmr - 1000) / 2,
        record: null,
        cpuMMR: mmr,
      };

      let thread = null;
      if ("threads" in message.channel && message.channel.threads) {
        try {
          const threadName = `war-vs-cpu-${Date.now()}`;
          thread = await message.channel.threads.create({
            name: threadName,
            autoArchiveDuration: 60,
            reason: `Simulación de CPU War`,
          });
        } catch (err) {
          console.error("❌ Error creando hilo para cpuwar:", err);
        }
      }

      if (!thread) {
        const fallbackMessage = langManager.getString(
          guildId,
          "war_error_thread_failed",
          {},
          guildLocale
        );
        await message.reply({ content: fallbackMessage });
        return;
      }

      try {
        await model.updateUserCanWarCPU(challengerRecord.UserID, false);
      } catch (err) {
        console.error("❌ Error actualizando canWarCPU:", err);
        const errorMessage = langManager.getString(
          guildId,
          "cpuwar_error_unknown",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await thread.send({ embeds: [errorEmbed.build()] });
        return;
      }

      model.warManager.registerActiveWar(thread.id, challenger.id, "cpu");

      const shouldStop = async () => false;

      const simulationResult = await runWarSimulation({
        thread,
        type: WarType.CPUWAR,
        guildId,
        guildLocale,
        challenger: challengerData,
        opponent: opponentData,
        betAmount: 0,
        shouldStop,
      });

      const challengerTotalPoints = simulationResult.challengerTotalPoints;
      const opponentTotalPoints = simulationResult.opponentTotalPoints;

      const isTie = challengerTotalPoints === opponentTotalPoints;

      let winnerData = challengerData;
      let loserData = opponentData;
      let winnerPoints = challengerTotalPoints;
      let loserPoints = opponentTotalPoints;
      const userWon = challengerTotalPoints > opponentTotalPoints;

      if (!userWon && !isTie) {
        winnerData = opponentData;
        loserData = challengerData;
        winnerPoints = opponentTotalPoints;
        loserPoints = challengerTotalPoints;
      }

      let currentUserElo = challengerRecord.Elo || 0;
      try {
        const currentUserRecord = await model.getUser(
          challenger.id,
          metadataGuildId,
          challenger.username,
          guildLocale
        );
        if (currentUserRecord) {
          currentUserElo = currentUserRecord.Elo || 0;
        }
      } catch (err) {
        console.error("❌ Error obteniendo ELO actual del usuario:", err);
      }

      const cpuElo = (mmr - 1000) / 2;
      const userElo = currentUserElo;

      let userEloChange, cpuEloChange;
      if (isTie) {
        const tieChanges = Utils.calculateEloChangeTie(userElo, cpuElo);
        userEloChange = tieChanges.playerAChange;
        cpuEloChange = tieChanges.playerBChange;
      } else if (userWon) {
        userEloChange = Utils.calculateEloChange(userElo, cpuElo);
        cpuEloChange = -userEloChange;
      } else {
        cpuEloChange = Utils.calculateEloChange(cpuElo, userElo);
        userEloChange = -cpuEloChange;

        const maxUserCanLose = userElo;
        if (Math.abs(userEloChange) > maxUserCanLose) {
          userEloChange = -maxUserCanLose;
          cpuEloChange = maxUserCanLose;
        }
      }

      const userNewElo = Math.max(0, userElo + userEloChange);

      const [userOldRank, userNewRank] = await Promise.all([
        Utils.getRankForElo(userElo),
        Utils.getRankForElo(userNewElo),
      ]);

      const userRankChange = determineRankChange(userOldRank, userNewRank);

      try {
        await model.updateUserElo(challengerRecord.UserID, userNewElo);
      } catch (err) {
        console.error("❌ Error actualizando Elo del usuario:", err);
      }

      const EmbedWarFinish = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarFinish");
      const DecoratorWarEloSummary = require("../../extras/embedbuilder/decorators/DecoratorWarEloSummary");
      const DecoratorWarRankSummary = require("../../extras/embedbuilder/decorators/DecoratorWarRankSummary");

      let finishEmbed = new EmbedWarFinish({
        type: WarType.CPUWAR,
        winnerDisplayName: isTie
          ? challengerData.displayName
          : winnerData.displayName,
        loserDisplayName: isTie
          ? challengerData.displayName
          : loserData.displayName,
        winnerTeamName: isTie
          ? challengerData.teamTag || challengerData.teamName
          : winnerData.teamTag || winnerData.teamName,
        loserTeamName: isTie
          ? challengerData.teamTag || challengerData.teamName
          : loserData.teamTag || loserData.teamName,
        winnerPoints: isTie ? challengerTotalPoints : winnerPoints,
        loserPoints: isTie ? opponentTotalPoints : loserPoints,
        pointsDiff: isTie ? 0 : Math.abs(winnerPoints - loserPoints) || 1,
        betAmount: 0,
        winnerEloChange: isTie
          ? userEloChange
          : userWon
          ? userEloChange
          : cpuEloChange,
        loserEloChange: isTie
          ? userEloChange
          : userWon
          ? cpuEloChange
          : userEloChange,
        winnerNewElo: isTie ? userNewElo : userWon ? userNewElo : cpuElo,
        loserNewElo: isTie ? userNewElo : userWon ? cpuElo : userNewElo,
        winnerRankName: isTie
          ? formatRankName(userNewRank)
          : userWon
          ? formatRankName(userNewRank)
          : "CPU",
        loserRankName: isTie
          ? formatRankName(userNewRank)
          : userWon
          ? "CPU"
          : formatRankName(userNewRank),
        winnerRankChange: isTie
          ? userRankChange
          : userWon
          ? userRankChange
          : "same",
        loserRankChange: isTie
          ? userRankChange
          : userWon
          ? "same"
          : userRankChange,
        guildId,
        guildLocale,
        isTie: isTie,
      });

      finishEmbed = new DecoratorWarEloSummary(finishEmbed, {
        winnerDisplayName: isTie
          ? challengerData.displayName
          : userWon
          ? challengerData.displayName
          : null,
        loserDisplayName: isTie
          ? challengerData.displayName
          : userWon
          ? null
          : challengerData.displayName,
        winnerName: isTie
          ? challengerData.userName
          : userWon
          ? challengerData.userName
          : null,
        loserName: isTie
          ? challengerData.userName
          : userWon
          ? null
          : challengerData.userName,
        winnerEloChange: isTie ? userEloChange : userWon ? userEloChange : 0,
        loserEloChange: isTie ? userEloChange : userWon ? 0 : userEloChange,
        winnerNewElo: isTie ? userNewElo : userWon ? userNewElo : 0,
        loserNewElo: isTie ? userNewElo : userWon ? 0 : userNewElo,
        winnerRankName: isTie
          ? formatRankName(userNewRank)
          : userWon
          ? formatRankName(userNewRank)
          : null,
        loserRankName: isTie
          ? formatRankName(userNewRank)
          : userWon
          ? null
          : formatRankName(userNewRank),
        guildId,
        guildLocale,
      });

      finishEmbed = new DecoratorWarRankSummary(finishEmbed, {
        winnerDisplayName: isTie
          ? challengerData.displayName
          : userWon
          ? challengerData.displayName
          : null,
        loserDisplayName: isTie
          ? challengerData.displayName
          : userWon
          ? null
          : challengerData.displayName,
        winnerName: isTie
          ? challengerData.userName
          : userWon
          ? challengerData.userName
          : null,
        loserName: isTie
          ? challengerData.userName
          : userWon
          ? null
          : challengerData.userName,
        winnerRankName: isTie
          ? formatRankName(userNewRank)
          : userWon
          ? formatRankName(userNewRank)
          : null,
        loserRankName: isTie
          ? formatRankName(userNewRank)
          : userWon
          ? null
          : formatRankName(userNewRank),
        winnerRankChange: isTie
          ? userRankChange
          : userWon
          ? userRankChange
          : "same",
        loserRankChange: isTie
          ? userRankChange
          : userWon
          ? "same"
          : userRankChange,
        guildId,
        guildLocale,
      });

      await thread.send({ embeds: [finishEmbed.build()] });

      try {
        const allPlayerIds = challengerData.racers
          .map((r) => r.playerId)
          .filter((id) => id && typeof id === "number");

        if (allPlayerIds.length > 0) {
          await model.reduceEnergyAfterWar(allPlayerIds);
        }
      } catch (err) {
        console.error("❌ Error reduciendo energía después de cpuwar:", err);
      }
    } catch (error) {
      console.error("❌ Error en CpuWarCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "cpuwar_error_unknown",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
