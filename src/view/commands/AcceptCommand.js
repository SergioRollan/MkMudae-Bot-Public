const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const TrackDAO = require("../../dao/TrackDAO");

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
const EmbedWarResponse = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarResponse");
const EmbedWarStart = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarStart");
const EmbedWarVoting = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarVoting");
const EmbedWarRaceStart = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarRaceStart");
const EmbedWarRaceResult = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarRaceResult");
const EmbedWarRaceOverview = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarRaceOverview");
const EmbedWarFinish = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarFinish");
const EmbedRaceSector = require("../../extras/embedbuilder/embedcomponents/war/EmbedRaceSector");
const DecoratorWarBetField = require("../../extras/embedbuilder/decorators/DecoratorWarBetField");
const DecoratorWarBetDescription = require("../../extras/embedbuilder/decorators/DecoratorWarBetDescription");
const DecoratorWarEloSummary = require("../../extras/embedbuilder/decorators/DecoratorWarEloSummary");
const DecoratorWarRankSummary = require("../../extras/embedbuilder/decorators/DecoratorWarRankSummary");
const Utils = require("../../extras/Utils");
const WarType = require("../../enums/WarType");
const RaceSimulator = require("../../managers/race/RaceSimulator");

const GRID_POSITIONS_FIRST = {
  teamA: [1, 4, 5, 8, 9, 12],
  teamB: [2, 3, 6, 7, 10, 11],
};

const POINTS_TABLE = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeSend(thread, content, options = {}, maxRetries = 3) {
  const isNetworkError = (error) => {
    return (
      error.code === "UND_ERR_SOCKET" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.message?.includes("other side closed") ||
      error.message?.includes("socket") ||
      error.name === "SocketError"
    );
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (content) {
        return await thread.send({ content, ...options });
      } else {
        return await thread.send(options);
      }
    } catch (error) {
      const isNetwork = isNetworkError(error);

      if (isNetwork && attempt < maxRetries) {
        const waitTime = attempt * 1000;
        console.warn(
          `⚠️ Error de red al enviar mensaje (intento ${attempt}/${maxRetries}), reintentando en ${waitTime}ms...`,
          error.message
        );
        await delay(waitTime);
        continue;
      }

      if (isNetwork) {
        console.error(
          `❌ Error de red al enviar mensaje después de ${maxRetries} intentos:`,
          error.message
        );
      } else {
        console.error("❌ Error al enviar mensaje:", error.message);
      }

      return null;
    }
  }
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getTrackVote(
  raceResults,
  challengerRecord,
  opponentRecord,
  playedTracks,
  trackPool,
  guildId,
  guildLocale
) {
  const Model = require("../../model/Model");
  const TrackDAO = require("../../dao/TrackDAO");
  const model = Model.getInstance();
  const trackDAO = new TrackDAO();

  const allTracks = await trackDAO.getAllTracks();
  const tracksById = new Map();
  allTracks.forEach((t) => tracksById.set(t.IDTrack, t));

  const LanguageManager = require("../../managers/LanguageManager");
  const langManager = LanguageManager.getInstance();
  let lang = langManager.getGuildLanguage(guildId, guildLocale);
  if (!["es", "en", "fr"].includes(lang)) {
    lang = "es";
  }

  const getTrackName = (track) => {
    if (!track) return null;
    const nameES = track.nameES || track.NameES;
    const nameEN = track.nameEN || track.NameEN;
    const nameFR = track.nameFR || track.NameFR;

    const langMap = {
      es: nameES,
      en: nameEN,
      fr: nameFR,
    };

    const preferredName = langMap[lang];
    if (preferredName && preferredName.trim() !== "") {
      return preferredName;
    }

    if (lang === "en") {
      return nameEN || nameES || nameFR;
    } else if (lang === "fr") {
      return nameFR || nameEN || nameES;
    } else {
      return nameES || nameEN || nameFR;
    }
  };

  const getUserTracksByType = (record, type) => {
    if (!record) {
      return [];
    }
    const trackIds = [];
    if (type === "top") {
      if (record.TrackTopA) trackIds.push(record.TrackTopA);
      if (record.TrackTopB) trackIds.push(record.TrackTopB);
    } else if (type === "antitop") {
      if (record.TrackRemoveTopA) trackIds.push(record.TrackRemoveTopA);
      if (record.TrackRemoveTopB) trackIds.push(record.TrackRemoveTopB);
    } else if (type === "bottom") {
      if (record.TrackBottomA) trackIds.push(record.TrackBottomA);
      if (record.TrackBottomB) trackIds.push(record.TrackBottomB);
    } else if (type === "balanced") {
      if (record.TrackBalancedA) trackIds.push(record.TrackBalancedA);
      if (record.TrackBalancedB) trackIds.push(record.TrackBalancedB);
    }
    return trackIds.map((id) => tracksById.get(id)).filter(Boolean);
  };

  const teamAPositions = [];
  const teamBPositions = [];

  raceResults.forEach((result, index) => {
    const position = index + 1;
    if (result.teamKey === "A") {
      teamAPositions.push(position);
    } else if (result.teamKey === "B") {
      teamBPositions.push(position);
    }
  });

  const teamAPoints = raceResults
    .filter((r) => r.teamKey === "A")
    .reduce((sum, r) => sum + (r.points || 0), 0);
  const teamBPoints = raceResults
    .filter((r) => r.teamKey === "B")
    .reduce((sum, r) => sum + (r.points || 0), 0);

  let votingTeam = null;
  let trackType = null;

  const pointsDifferenceA = teamAPoints - teamBPoints;
  const pointsDifferenceB = teamBPoints - teamAPoints;

  if (pointsDifferenceA <= -10) {
    votingTeam = challengerRecord;
    trackType = "bottom";
  } else if (pointsDifferenceB <= -10) {
    votingTeam = opponentRecord;
    trackType = "bottom";
  } else if (teamAPositions.includes(1) && teamAPositions.includes(2)) {
    votingTeam = challengerRecord;
    trackType = "top";
  } else if (teamBPositions.includes(1) && teamBPositions.includes(2)) {
    votingTeam = opponentRecord;
    trackType = "top";
  } else if (
    teamAPositions.includes(2) &&
    (teamAPositions.includes(3) || teamAPositions.includes(4))
  ) {
    votingTeam = challengerRecord;
    trackType = "antitop";
  } else if (
    teamBPositions.includes(2) &&
    (teamBPositions.includes(3) || teamBPositions.includes(4))
  ) {
    votingTeam = opponentRecord;
    trackType = "antitop";
  } else if (
    !teamAPositions.includes(1) &&
    !teamAPositions.includes(2) &&
    teamAPositions.includes(12)
  ) {
    votingTeam = challengerRecord;
    trackType = "bottom";
  } else if (
    !teamBPositions.includes(1) &&
    !teamBPositions.includes(2) &&
    teamBPositions.includes(12)
  ) {
    votingTeam = opponentRecord;
    trackType = "bottom";
  } else {
    votingTeam = teamAPoints >= teamBPoints ? challengerRecord : opponentRecord;
    trackType = "balanced";
  }

  let availableTracks = getUserTracksByType(votingTeam, trackType);

  const playedTrackNames = new Set(playedTracks.map((t) => t.toLowerCase()));
  availableTracks = availableTracks.filter((t) => {
    const trackName = getTrackName(t);
    return trackName && !playedTrackNames.has(trackName.toLowerCase());
  });

  if (availableTracks.length === 0) {
    const allAvailableTracks = allTracks.filter((t) => {
      const trackName = getTrackName(t);
      return trackName && !playedTrackNames.has(trackName.toLowerCase());
    });
    availableTracks = allAvailableTracks;
  }

  let selectedTrack = null;
  if (availableTracks.length > 0) {
    selectedTrack = shuffle(availableTracks)[0];
  } else {
    selectedTrack = shuffle(trackPool)[0];
  }

  const selectedTrackName = getTrackName(selectedTrack);

  const otherTeam =
    votingTeam === challengerRecord ? opponentRecord : challengerRecord;
  let otherTeamTracks = [];

  ["top", "antitop", "bottom", "balanced"].forEach((type) => {
    otherTeamTracks.push(...getUserTracksByType(otherTeam, type));
  });

  otherTeamTracks = otherTeamTracks.filter((t) => {
    const trackName = getTrackName(t);
    return trackName && !playedTrackNames.has(trackName.toLowerCase());
  });

  if (otherTeamTracks.length === 0) {
    const allAvailableTracks = allTracks.filter((t) => {
      const trackName = getTrackName(t);
      return trackName && !playedTrackNames.has(trackName.toLowerCase());
    });
    otherTeamTracks = allAvailableTracks;
  }

  let otherTrack = null;
  if (otherTeamTracks.length > 0) {
    otherTrack = shuffle(otherTeamTracks)[0];
  } else {
    otherTrack = shuffle(trackPool)[0];
  }

  const otherTrackName = getTrackName(otherTrack);

  const challengerTrack =
    votingTeam === challengerRecord ? selectedTrackName : otherTrackName;
  const opponentTrack =
    votingTeam === challengerRecord ? otherTrackName : selectedTrackName;

  const finalSelectedTrack =
    Math.random() < 0.5 ? challengerTrack : opponentTrack;

  return {
    challengerTrack,
    opponentTrack,
    selectedTrack: finalSelectedTrack,
  };
}

async function prepareParticipant(model, record, user, teamKey) {
  const userName = record?.Name || user.username;
  const teamName = record?.TeamName || userName;
  const tag = record?.Tag || null;
  const displayName = teamName;

  const ownedPlayers = await model.getUserOwnedPlayers(record?.UserID);

  if (!Array.isArray(ownedPlayers) || ownedPlayers.length < 6) {
    const error = new Error("Insufficient roster");
    error.code = "WAR_LINEUP_INSUFFICIENT";
    error.userDisplayName = teamName;
    throw error;
  }

  const ownedEntries = ownedPlayers
    .map((player) => {
      const id = Number(player.IDPlayer);
      if (!Number.isInteger(id)) {
        return null;
      }
      const display = model.getPlayerDisplayName(player, id);
      const mmr = Number(player.MMR || player.mmr || 0);
      return {
        id,
        displayName: display,
        mmr: Number.isFinite(mmr) ? mmr : 0,
      };
    })
    .filter(Boolean);

  if (ownedEntries.length < 6) {
    const error = new Error("Insufficient roster");
    error.code = "WAR_LINEUP_INSUFFICIENT";
    error.userDisplayName = teamName;
    throw error;
  }

  const ownedMap = new Map();
  ownedEntries.forEach((entry) => {
    if (!ownedMap.has(entry.id)) {
      ownedMap.set(entry.id, entry);
    }
  });

  const existingLineupEntries = await model.getLineupDetailsFromRecord(
    record,
    ownedPlayers
  );
  const finalEntries = [];
  const seenIds = new Set();

  existingLineupEntries.forEach((entry) => {
    if (!seenIds.has(entry.id) && ownedMap.has(entry.id)) {
      seenIds.add(entry.id);
      finalEntries.push(entry);
    }
  });

  const availableEntries = ownedEntries
    .filter((entry) => !seenIds.has(entry.id))
    .sort((a, b) => b.mmr - a.mmr);

  for (const entry of availableEntries) {
    if (finalEntries.length >= 6) {
      break;
    }
    finalEntries.push(entry);
    seenIds.add(entry.id);
  }

  if (finalEntries.length < 6) {
    const error = new Error("Insufficient roster for lineup");
    error.code = "WAR_LINEUP_INSUFFICIENT";
    error.userDisplayName = teamName;
    throw error;
  }

  const finalLineup = finalEntries.map((entry) => entry.displayName);

  const PlayerDAO = require("../../dao/PlayerDAO");
  const playerDAO = new PlayerDAO();
  const discordServerId = record?.DiscordServerID || "DM";

  const racerObjects = await Promise.all(
    finalEntries.map(async (entry) => {
      const playerData = await playerDAO.getPlayerByIdInServer(
        entry.id,
        discordServerId
      );

      const baseMmr =
        Number(
          playerData?.MMR ?? playerData?.mmr ?? playerData?.MarketValue ?? 0
        ) || 0;

      const energy =
        Number(playerData?.energy ?? playerData?.Energy ?? 100) || 100;
      const energyMultiplier = energy / 100;

      const baseLines =
        Number(playerData?.Lines ?? playerData?.lines ?? 0) || 0;
      const baseConsistency =
        Number(playerData?.Consistency ?? playerData?.consistency ?? 0) || 0;
      const baseItemUsage =
        Number(playerData?.ItemUsage ?? playerData?.itemUsage ?? 0) || 0;
      const basePrecision =
        Number(playerData?.Precision ?? playerData?.precision ?? 0) || 0;
      const baseCommunication =
        Number(playerData?.Communication ?? playerData?.communication ?? 0) ||
        0;
      const baseMental =
        Number(playerData?.Mental ?? playerData?.mental ?? 0) || 0;
      const baseGameSense =
        Number(playerData?.GameSense ?? playerData?.gameSense ?? 0) || 0;
      const baseShockFinding =
        Number(playerData?.ShockFinding ?? playerData?.shockFinding ?? 0) || 0;

      const lines = Math.floor((baseLines + baseMmr) * energyMultiplier);
      const consistency = Math.floor(
        (baseConsistency + baseMmr) * energyMultiplier
      );
      const itemUsage = Math.floor(
        (baseItemUsage + baseMmr) * energyMultiplier
      );
      const precision = Math.floor(
        (basePrecision + baseMmr) * energyMultiplier
      );
      const communication = Math.floor(
        (baseCommunication + baseMmr) * energyMultiplier
      );
      const mental = Math.floor((baseMental + baseMmr) * energyMultiplier);
      const gameSense = Math.floor(
        (baseGameSense + baseMmr) * energyMultiplier
      );
      const shockFinding = Math.floor(
        (baseShockFinding + baseMmr) * energyMultiplier
      );

      return {
        playerId: entry.id,
        name: entry.displayName,
        teamKey,
        teamName,
        totalPoints: 0,

        mmr: 0,

        lines: lines,
        consistency: consistency,
        itemUsage: itemUsage,
        precision: precision,
        communication: communication,
        mental: mental,
        gameSense: gameSense,
        shockFinding: shockFinding,
      };
    })
  );

  return {
    id: user.id,
    tag: `<@${user.id}>`,
    displayName,
    userName,
    teamName,
    teamTag: tag,
    lineup: finalLineup,
    racers: racerObjects,
    elo: record?.Elo || 0,
    record,
  };
}

async function generateRaceResultsWithSimulation(
  teamA,
  teamB,
  track,
  raceNumber,
  thread,
  guildId,
  guildLocale,
  startingGrid,
  raceResultParams = null
) {
  console.log(
    `🏁 Generando resultados de carrera ${raceNumber} con simulación`
  );

  const trackDAO = new TrackDAO();
  const resolvedTrack = { ...track };

  const sectorKeys = [
    "Sector1A",
    "Sector1B",
    "Sector2A",
    "Sector2B",
    "Sector3A",
    "Sector3B",
  ];
  const sectorKeysLower = [
    "sector1A",
    "sector1B",
    "sector2A",
    "sector2B",
    "sector3A",
    "sector3B",
  ];

  for (let i = 0; i < sectorKeys.length; i++) {
    const key = sectorKeys[i];
    const keyLower = sectorKeysLower[i];
    const sectorId = track[key] || track[keyLower];

    if (sectorId) {
      try {
        const sectorName = await trackDAO.getSectorTypeById(sectorId);
        if (sectorName) {
          let sectorType = "normal";
          const normalizedName = sectorName.toLowerCase().trim();

          if (
            normalizedName.includes("shortcut") ||
            normalizedName.includes("atajo") ||
            normalizedName.includes("raccourci")
          ) {
            sectorType = "Shortcuts";
          } else if (
            normalizedName.includes("technical") ||
            normalizedName.includes("técnico") ||
            normalizedName.includes("technique")
          ) {
            sectorType = "Technical";
          } else if (
            normalizedName.includes("straight") ||
            normalizedName.includes("recto") ||
            normalizedName.includes("droit")
          ) {
            sectorType = "Straight";
          } else if (
            normalizedName.includes("coin") ||
            normalizedName.includes("moneda") ||
            normalizedName.includes("pièce")
          ) {
            sectorType = "Coins";
          } else if (
            normalizedName.includes("balanced") ||
            normalizedName.includes("equilibrado") ||
            normalizedName.includes("équilibré")
          ) {
            sectorType = "Balanced";
          }

          resolvedTrack[keyLower] = sectorType;
        } else {
          resolvedTrack[keyLower] = "normal";
        }
      } catch (err) {
        console.error(
          `❌ Error resolviendo sector ${keyLower} (ID: ${sectorId}):`,
          err
        );
        resolvedTrack[keyLower] = "normal";
      }
    } else {
      resolvedTrack[keyLower] = "normal";
    }
  }

  const simulator = new RaceSimulator(
    resolvedTrack,
    teamA,
    teamB,
    raceNumber,
    startingGrid
  );

  const { sectorMessages, finalResults } = simulator.simulateRace();

  console.log(
    `🏁 Simulación completada: ${sectorMessages.length} mensajes (2 por sector), ${finalResults.length} resultados`
  );

  simulator.state.racers.forEach((stateRacer) => {
    const originalRacer =
      stateRacer.teamKey === "A"
        ? teamA.find((r) => r.name === stateRacer.name)
        : teamB.find((r) => r.name === stateRacer.name);

    if (originalRacer) {
      if (typeof stateRacer.hp === "number") {
        originalRacer.hp = Math.max(0, Math.min(100, stateRacer.hp));
      }

      if (typeof stateRacer.nonTopPositionHPLoss === "number") {
        originalRacer.nonTopPositionHPLoss = Math.max(
          0,
          stateRacer.nonTopPositionHPLoss
        );
      }
    }
  });

  let pointsA = 0;
  let pointsB = 0;

  const results = finalResults
    .map((result, index) => {
      const points = POINTS_TABLE[index] || 0;
      const finalPosition = index + 1;

      const racer =
        result.teamKey === "A"
          ? teamA.find((r) => r.name === result.name)
          : teamB.find((r) => r.name === result.name);

      if (racer) {
        const previousTotal = racer.totalPoints || 0;
        racer.totalPoints = previousTotal + points;

        if (finalPosition >= 10 && finalPosition <= 12) {
          racer.hadLowPositionLastRace = true;
        } else {
          racer.hadLowPositionLastRace = false;
        }

        if (racer.teamKey === "A") {
          pointsA += points;
        } else {
          pointsB += points;
        }

        return {
          name: result.name,
          teamName: result.teamTag || result.teamName,
          teamKey: result.teamKey,
          points,
          totalPoints: racer.totalPoints,
        };
      }

      return null;
    })
    .filter(Boolean);

  for (const lapMsg of sectorMessages) {
    await delay(10000);

    let visibleEvents = lapMsg.events || [];
    if (lapMsg.lap === 3) {
      visibleEvents = visibleEvents.filter((e) => {
        if (e._sectorNum === 3) return true;
        if (e._sectorNum === 1 || e._sectorNum === 2) {
          return (
            e.type !== "kill_hidden" &&
            e.type !== "shortcut_overtake_hidden" &&
            e.type !== "slow_for_items_hidden"
          );
        }
        return true;
      });
    } else {
      visibleEvents = visibleEvents.filter(
        (e) =>
          e.type !== "kill_hidden" &&
          e.type !== "shortcut_overtake_hidden" &&
          e.type !== "slow_for_items_hidden"
      );
    }

    visibleEvents = visibleEvents.map(({ _sectorNum, ...event }) => event);

    if (lapMsg.lap === 3 && raceResultParams) {
      const eventsEmbed = new EmbedRaceSector({
        lap: lapMsg.lap,
        sectorNum: null,
        events: visibleEvents,
        positions: null,
        guildId,
        guildLocale,
      });

      await safeSend(thread, null, { embeds: [eventsEmbed.build()] });

      await delay(10000);

      const raceResultEmbed = new EmbedWarRaceResult({
        type: raceResultParams.type,
        raceNumber: raceNumber,
        results: results,
        challengerTeamName:
          raceResultParams.challenger.teamTag ||
          raceResultParams.challenger.teamName,
        opponentTeamName:
          raceResultParams.opponent.teamTag ||
          raceResultParams.opponent.teamName,
        challengerRacePoints: pointsA,
        opponentRacePoints: pointsB,
        challengerTotalPoints: raceResultParams.challengerTotalPoints,
        opponentTotalPoints: raceResultParams.opponentTotalPoints,
        challengerDisplayName: raceResultParams.challenger.displayName,
        opponentDisplayName: raceResultParams.opponent.displayName,
        guildId,
        guildLocale,
      });

      await safeSend(thread, null, { embeds: [raceResultEmbed.build()] });
    } else {
      const sectorEmbed = new EmbedRaceSector({
        lap: lapMsg.lap,
        sectorNum: null,
        events: visibleEvents,
        positions: lapMsg.positions || [],
        guildId,
        guildLocale,
      });

      await safeSend(thread, null, { embeds: [sectorEmbed.build()] });
    }
  }

  return {
    results,
    pointsA,
    pointsB,
    finalResultSent:
      raceResultParams !== null && raceResultParams.challenger !== undefined,
  };
}

function generateRaceResults(teamA, teamB) {
  const combined = shuffle([...teamA, ...teamB]);

  let pointsA = 0;
  let pointsB = 0;

  const results = combined.map((racer, index) => {
    const points = POINTS_TABLE[index] || 0;
    if (racer.teamKey === "A") {
      pointsA += points;
    } else {
      pointsB += points;
    }
    const previousTotal = racer.totalPoints || 0;
    const totalPoints = previousTotal + points;
    racer.totalPoints = totalPoints;
    return {
      name: racer.name,
      teamName: racer.teamTag || racer.teamName,
      teamKey: racer.teamKey,
      points,
      totalPoints,
    };
  });

  return {
    results,
    pointsA,
    pointsB,
  };
}

function formatRankName(rank) {
  if (!rank?.name) return "Unknown";
  const lower = rank.name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function determineRankChange(oldRank, newRank) {
  if (!oldRank || !newRank) return "same";
  if (newRank.id > oldRank.id) return "up";
  if (newRank.id < oldRank.id) return "down";
  return "same";
}

async function runWarSimulation({
  thread,
  type,
  guildId,
  guildLocale,
  challenger,
  opponent,
  betAmount,
  shouldStop,
}) {
  const langManager = LanguageManager.getInstance();

  if (type === WarType.CPUWAR) {
    const cpuMMR =
      opponent.cpuMMR ||
      (opponent.racers && opponent.racers.length > 0
        ? opponent.racers[0].lines || 0
        : 0);
    const initialMessage = langManager.getString(
      guildId,
      "cpuwar_initial_message",
      {
        challenger: challenger.tag,
        cpuMMR: cpuMMR.toLocaleString(),
      },
      guildLocale
    );
    await safeSend(thread, initialMessage);
  } else {
    await safeSend(thread, `${challenger.tag} ${opponent.tag}`);
  }

  await delay(10000);

  let lang = langManager.getGuildLanguage(guildId, guildLocale);
  if (!["es", "en", "fr"].includes(lang)) {
    lang = "es";
  }

  const trackPool = await Utils.getTrackPool(lang);

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

  const challengerAverageStats = calculateTeamAverageStats(challenger.racers);
  const opponentAverageStats = calculateTeamAverageStats(opponent.racers);

  const startEmbed = new EmbedWarStart({
    type,
    challengerTag: challenger.tag,
    opponentTag: opponent.tag,
    challengerTeamName: challenger.teamName,
    opponentTeamName: opponent.teamName,
    challengerLineup: challenger.lineup,
    opponentLineup: opponent.lineup,
    challengerAverageStats,
    opponentAverageStats,
    guildId,
    guildLocale,
  });

  await safeSend(thread, null, { embeds: [startEmbed.build()] });

  await delay(10000);

  const challengerTrack1 = shuffle(trackPool)[0];
  const opponentTrack1 = shuffle(trackPool)[0];
  const initialVote = {
    challengerTrack: challengerTrack1,
    opponentTrack: opponentTrack1,
    selectedTrack: Math.random() < 0.5 ? challengerTrack1 : opponentTrack1,
  };

  const playedTracks = [initialVote.selectedTrack];
  const initialVotingEmbed = new EmbedWarVoting({
    type,
    raceNumber: 1,
    challengerTeamName: challenger.teamTag || challenger.teamName,
    opponentTeamName: opponent.teamTag || opponent.teamName,
    challengerTrack: initialVote.challengerTrack,
    opponentTrack: initialVote.opponentTrack,
    selectedTrack: initialVote.selectedTrack,
    guildId,
    guildLocale,
  });

  await safeSend(thread, null, { embeds: [initialVotingEmbed.build()] });

  let challengerTotalPoints = 0;
  let opponentTotalPoints = 0;

  let currentGrid = {
    teamA: [...GRID_POSITIONS_FIRST.teamA],
    teamB: [...GRID_POSITIONS_FIRST.teamB],
  };

  let currentTrackName = initialVote.selectedTrack;

  async function runRace(race, isTiebreaker = false) {
    if (shouldStop && (await shouldStop())) {
      return {
        challengerTotalPoints,
        opponentTotalPoints,
        stopped: true,
        race,
      };
    }

    await delay(3000);

    const raceStartEmbed = new EmbedWarRaceStart({
      type,
      raceNumber: race,
      challengerTeamName: challenger.teamTag || challenger.teamName,
      opponentTeamName: opponent.teamTag || opponent.teamName,
      challengerPositions: currentGrid.teamA,
      opponentPositions: currentGrid.teamB,
      challengerDisplayName: challenger.displayName,
      opponentDisplayName: opponent.displayName,
      challengerPoints: challengerTotalPoints,
      opponentPoints: opponentTotalPoints,
      guildId,
      guildLocale,
    });
    await safeSend(thread, null, { embeds: [raceStartEmbed.build()] });

    if (shouldStop && (await shouldStop())) {
      return {
        challengerTotalPoints,
        opponentTotalPoints,
        stopped: true,
        race,
      };
    }

    const trackDAO = new TrackDAO();
    let selectedTrack = await trackDAO.getTrackByName(currentTrackName);

    if (!selectedTrack) {
      const allTracks = await trackDAO.getAllTracks();

      selectedTrack = allTracks.find(
        (t) =>
          (t.nameES &&
            t.nameES.toLowerCase() === currentTrackName.toLowerCase()) ||
          (t.NameES &&
            t.NameES.toLowerCase() === currentTrackName.toLowerCase()) ||
          (t.nameEN &&
            t.nameEN.toLowerCase() === currentTrackName.toLowerCase()) ||
          (t.NameEN &&
            t.NameEN.toLowerCase() === currentTrackName.toLowerCase()) ||
          (t.nameFR &&
            t.nameFR.toLowerCase() === currentTrackName.toLowerCase()) ||
          (t.NameFR &&
            t.NameFR.toLowerCase() === currentTrackName.toLowerCase())
      );

      if (!selectedTrack) {
        console.log(
          `❌ AcceptCommand: Pista "${currentTrackName}" no encontrada en ninguna columna`
        );
      }
    } else {
      console.log(
        `✅ AcceptCommand: Pista encontrada: ${
          selectedTrack.nameES ||
          selectedTrack.NameES ||
          selectedTrack.nameEN ||
          selectedTrack.NameEN
        }`
      );
    }

    const raceResult = await generateRaceResultsWithSimulation(
      challenger.racers,
      opponent.racers,
      selectedTrack || {},
      race,
      thread,
      guildId,
      guildLocale,
      currentGrid,
      {
        type,
        challenger,
        opponent,
        challengerTotalPoints,
        opponentTotalPoints,
      }
    );

    challengerTotalPoints += raceResult.pointsA;
    opponentTotalPoints += raceResult.pointsB;

    if (currentTrackName && !playedTracks.includes(currentTrackName)) {
      playedTracks.push(currentTrackName);
    }

    if (!raceResult.finalResultSent) {
      await delay(8000);

      const raceResultEmbed = new EmbedWarRaceResult({
        type,
        raceNumber: race,
        results: raceResult.results,
        challengerTeamName: challenger.teamTag || challenger.teamName,
        opponentTeamName: opponent.teamTag || opponent.teamName,
        challengerRacePoints: raceResult.pointsA,
        opponentRacePoints: raceResult.pointsB,
        challengerTotalPoints,
        opponentTotalPoints,
        challengerDisplayName: challenger.displayName,
        opponentDisplayName: opponent.displayName,
        guildId,
        guildLocale,
      });

      await safeSend(thread, null, { embeds: [raceResultEmbed.build()] });
    } else {
      await delay(8000);
    }

    if (shouldStop && (await shouldStop())) {
      return {
        challengerTotalPoints,
        opponentTotalPoints,
        stopped: true,
        race,
      };
    }

    await delay(3000);

    const overallStandings = [...challenger.racers, ...opponent.racers]
      .map((racer) => ({
        name: racer.name,
        teamName: racer.teamTag || racer.teamName,
        teamKey: racer.teamKey,
        totalPoints: racer.totalPoints || 0,
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        if (a.teamKey !== b.teamKey) {
          return a.teamKey.localeCompare(b.teamKey);
        }
        return a.name.localeCompare(b.name);
      });

    let lastPoints = null;
    let lastRank = 0;
    overallStandings.forEach((entry, index) => {
      if (entry.totalPoints !== lastPoints) {
        lastRank = index + 1;
        lastPoints = entry.totalPoints;
      }
      entry.displayRank = lastRank;
    });

    const overviewEmbed = new EmbedWarRaceOverview({
      type,
      raceNumber: race,
      standings: overallStandings,
      challengerTeamName: challenger.teamTag || challenger.teamName,
      opponentTeamName: opponent.teamTag || opponent.teamName,
      challengerRacePoints: raceResult.pointsA,
      opponentRacePoints: raceResult.pointsB,
      challengerTotalPoints,
      opponentTotalPoints,
      showOverallLead: !isTiebreaker,
      guildId,
      guildLocale,
    });

    await safeSend(thread, null, { embeds: [overviewEmbed.build()] });

    const lastPlaceRacer = overallStandings[overallStandings.length - 1];
    if (lastPlaceRacer) {
      const allRacers = [...challenger.racers, ...opponent.racers];
      const racerToBoost = allRacers.find(
        (r) =>
          r.name === lastPlaceRacer.name && r.teamKey === lastPlaceRacer.teamKey
      );

      [...challenger.racers, ...opponent.racers].forEach((racer) => {
        if (
          racer.name !== lastPlaceRacer.name ||
          racer.teamKey !== lastPlaceRacer.teamKey
        ) {
          racer.lastPlaceBoostLevel = 0;
        }
      });

      if (racerToBoost) {
        if (
          racerToBoost.lastPlaceBoostLevel &&
          racerToBoost.lastPlaceBoostLevel > 0
        ) {
          racerToBoost.lastPlaceBoostLevel += 1;
        } else {
          racerToBoost.lastPlaceBoostLevel = 1;
        }

        const multiplier = 1.0 + racerToBoost.lastPlaceBoostLevel * 0.1;
      }
    } else {
      [...challenger.racers, ...opponent.racers].forEach((racer) => {
        racer.lastPlaceBoostLevel = 0;
      });
    }

    const nextGrid = { teamA: [], teamB: [] };
    raceResult.results.forEach((result, index) => {
      const position = index + 1;
      if (result.teamKey === "A") {
        nextGrid.teamA.push(position);
      } else {
        nextGrid.teamB.push(position);
      }
    });

    currentGrid = nextGrid;

    return { raceResult };
  }

  let lastRaceResult = null;

  for (let race = 1; race <= 12; race += 1) {
    const raceResult = await runRace(race, false);
    if (raceResult && raceResult.stopped) {
      return raceResult;
    }

    lastRaceResult = raceResult?.raceResult || null;

    if (race < 12) {
      if (shouldStop && (await shouldStop())) {
        return {
          challengerTotalPoints,
          opponentTotalPoints,
          stopped: true,
          race,
        };
      }

      await delay(3000);
      const nextVote = await getTrackVote(
        lastRaceResult?.results || [],
        challenger.record,
        opponent.record,
        playedTracks,
        trackPool,
        guildId,
        guildLocale
      );
      currentTrackName = nextVote.selectedTrack;

      if (currentTrackName && !playedTracks.includes(currentTrackName)) {
        playedTracks.push(currentTrackName);
      }
      const votingEmbed = new EmbedWarVoting({
        type,
        raceNumber: race + 1,
        challengerTeamName: challenger.teamTag || challenger.teamName,
        opponentTeamName: opponent.teamTag || opponent.teamName,
        challengerTrack: nextVote.challengerTrack,
        opponentTrack: nextVote.opponentTrack,
        selectedTrack: nextVote.selectedTrack,
        guildId,
        guildLocale,
      });
      await safeSend(thread, null, { embeds: [votingEmbed.build()] });
    }
  }

  if (
    type === WarType.TOURNAMENTWAR &&
    challengerTotalPoints === opponentTotalPoints
  ) {
    let tiebreakerRaceNumber = 13;
    let additionalRaces = 4;
    let isFirstTiebreaker = true;

    while (challengerTotalPoints === opponentTotalPoints) {
      if (shouldStop && (await shouldStop())) {
        return {
          challengerTotalPoints,
          opponentTotalPoints,
          stopped: true,
          race: tiebreakerRaceNumber - 1,
        };
      }

      if (!isFirstTiebreaker) {
        additionalRaces = 1;
      }

      const tiebreakerMessage = langManager.getString(
        guildId,
        "tournamentwar_tiebreaker",
        {
          raceStart: tiebreakerRaceNumber,
          raceEnd: tiebreakerRaceNumber + additionalRaces - 1,
        },
        guildLocale
      );
      await safeSend(thread, tiebreakerMessage);
      await delay(5000);

      for (let i = 0; i < additionalRaces; i++) {
        const raceResult = await runRace(tiebreakerRaceNumber + i, true);
        if (raceResult && raceResult.stopped) {
          return raceResult;
        }

        lastRaceResult = raceResult?.raceResult || null;

        if (challengerTotalPoints !== opponentTotalPoints) {
          break;
        }

        if (i < additionalRaces - 1) {
          if (shouldStop && (await shouldStop())) {
            return {
              challengerTotalPoints,
              opponentTotalPoints,
              stopped: true,
              race: tiebreakerRaceNumber + i,
            };
          }

          await delay(3000);
          const nextVote = await getTrackVote(
            lastRaceResult?.results || [],
            challenger.record,
            opponent.record,
            playedTracks,
            trackPool,
            guildId,
            guildLocale
          );
          currentTrackName = nextVote.selectedTrack;

          if (currentTrackName && !playedTracks.includes(currentTrackName)) {
            playedTracks.push(currentTrackName);
          }
          const votingEmbed = new EmbedWarVoting({
            type,
            raceNumber: tiebreakerRaceNumber + i + 1,
            challengerTeamName: challenger.teamTag || challenger.teamName,
            opponentTeamName: opponent.teamTag || opponent.teamName,
            challengerTrack: nextVote.challengerTrack,
            opponentTrack: nextVote.opponentTrack,
            selectedTrack: nextVote.selectedTrack,
            guildId,
            guildLocale,
          });
          await safeSend(thread, null, { embeds: [votingEmbed.build()] });
        }
      }

      tiebreakerRaceNumber += additionalRaces;
      isFirstTiebreaker = false;
    }
  }

  return {
    challengerTotalPoints,
    opponentTotalPoints,
  };
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      let responderId = message.author.id;
      let challengerId = null;

      const isAdmin =
        message.guild &&
        (await Utils.hasAdminPermissions(message.member, message.guild.id));

      if (
        message.mentions &&
        message.mentions.users &&
        message.mentions.users.size > 0
      ) {
        challengerId = message.mentions.users.first().id;
      }

      if (isAdmin && challengerId) {
        const pendingCount =
          model.countPendingRequestsForChallenger(challengerId);
        if (pendingCount > 1) {
          const errorMessage = langManager.getString(
            guildId,
            "war_error_multiple_challenger_requests",
            { count: pendingCount, challenger: `<@${challengerId}>` },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        const requestEntry = model.findWarRequestByChallenger(challengerId);
        if (requestEntry && requestEntry.request) {
          responderId = requestEntry.request.opponentId;
        }
      }

      const result = await model.respondToWarRequest(
        responderId,
        "accept",
        challengerId
      );

      if (!result.success) {
        if (result.error === "not_opponent") {
          return;
        }

        if (result.error === "multiple_pending") {
          const errorMessage = langManager.getString(
            guildId,
            "war_error_multiple_pending",
            { count: result.count },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        const errorMessage = langManager.getString(
          guildId,
          "war_error_no_pending_request",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const { request } = result;

      const challengerUser = await message.client.users.fetch(
        request.challengerId
      );
      const opponentUser = await message.client.users.fetch(request.opponentId);

      const metadataGuildId = request.metadata?.guildId || guildId || "DM";

      const challengerRecord = await model.getUser(
        request.challengerId,
        metadataGuildId,
        challengerUser.username,
        guildLocale
      );

      const opponentRecord = await model.getUser(
        request.opponentId,
        metadataGuildId,
        opponentUser.username,
        guildLocale
      );

      if (request.type === WarType.TOURNAMENTWAR) {
        request.amount = 0;
      }

      if (
        request.amount &&
        request.amount > 0 &&
        (!challengerRecord || !opponentRecord)
      ) {
        const errorMessage = langManager.getString(
          guildId,
          "war_error_unknown",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const challengerCoins = challengerRecord?.Coins || 0;
      const opponentCoins = opponentRecord?.Coins || 0;
      if (
        request.amount &&
        request.amount > 0 &&
        (challengerCoins < request.amount || opponentCoins < request.amount)
      ) {
        const insufficientUser =
          challengerCoins < request.amount
            ? challengerRecord?.TeamName ||
              challengerRecord?.Name ||
              challengerUser.username
            : opponentRecord?.TeamName ||
              opponentRecord?.Name ||
              opponentUser.username;
        const errorMessage = langManager.getString(
          guildId,
          "war_error_insufficient_bet",
          { user: insufficientUser, amount: request.amount.toLocaleString() },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let challengerData;
      let opponentData;
      try {
        challengerData = await prepareParticipant(
          model,
          challengerRecord,
          challengerUser,
          "A"
        );
        opponentData = await prepareParticipant(
          model,
          opponentRecord,
          opponentUser,
          "B"
        );
      } catch (prepError) {
        console.error("❌ Error preparando participantes para war:", prepError);
        let errorKey = "war_error_unknown";
        const params = {};
        if (prepError.code === "WAR_LINEUP_INSUFFICIENT") {
          errorKey = "war_error_lineup_incomplete";
          params.user =
            prepError.userDisplayName ||
            challengerRecord?.TeamName ||
            opponentRecord?.TeamName ||
            challengerRecord?.Name ||
            opponentRecord?.Name ||
            message.author.username;
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

      let challengerTag =
        challengerData.teamTag || generateDefaultTag(challengerData.userName);
      let opponentTag =
        opponentData.teamTag || generateDefaultTag(opponentData.userName);

      if (challengerTag === opponentTag) {
        challengerTag = challengerTag + "1";
        opponentTag = opponentTag + "2";
      }

      challengerData.racers.forEach((racer) => {
        racer.teamTag = challengerTag;
      });
      opponentData.racers.forEach((racer) => {
        racer.teamTag = opponentTag;
      });

      const responderTag = message.author.toString();
      let responseEmbed = new EmbedWarResponse({
        type: request.type,
        accepted: true,
        challengerTag: challengerData.tag,
        opponentTag: opponentData.tag,
        responderTag,
        amount: request.amount,
        guildId,
        guildLocale,
      });

      responseEmbed = new DecoratorWarBetField(
        responseEmbed,
        request.amount || 0,
        guildId,
        guildLocale
      );

      await message.reply({ embeds: [responseEmbed.build()] });

      let warRecord = null;
      if (challengerRecord?.UserID && opponentRecord?.UserID) {
        try {
          warRecord = await model.createWarInDatabase(
            challengerRecord.UserID,
            opponentRecord.UserID,
            request.type,
            request.amount || 0
          );
        } catch (err) {
          console.error("❌ Error guardando war en base de datos:", err);
        }
      }

      let thread = null;

      if ("threads" in message.channel && message.channel.threads) {
        try {
          const threadName = `${request.type}-${Date.now()}`;
          thread = await message.channel.threads.create({
            name: threadName,
            autoArchiveDuration: 60,
            reason: `Simulación de ${request.type}`,
          });
        } catch (err) {
          console.error("❌ Error creando hilo para war:", err);
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

      model.warManager.registerActiveWar(
        thread.id,
        request.challengerId,
        request.opponentId
      );

      const shouldStop = async () => {
        const activeWar = model.warManager.getActiveWar(thread.id);
        if (!activeWar) return false;
        return (
          activeWar.stopRequests.has(request.challengerId) &&
          activeWar.stopRequests.has(request.opponentId)
        );
      };

      let simulationResult = null;
      try {
        simulationResult = await runWarSimulation({
          thread,
          type: request.type,
          guildId,
          guildLocale,
          challenger: challengerData,
          opponent: opponentData,
          betAmount: request.amount || 0,
          shouldStop,
        });
      } catch (simError) {
        const isNetworkError =
          simError.code === "UND_ERR_SOCKET" ||
          simError.code === "ECONNRESET" ||
          simError.code === "ETIMEDOUT" ||
          simError.message?.includes("other side closed") ||
          simError.message?.includes("socket") ||
          simError.name === "SocketError";

        if (isNetworkError) {
          console.error(
            "❌ Error de red durante la simulación de war (continuando):",
            simError.message
          );
          await safeSend(
            thread,
            "⚠️ Se produjo un error de conexión durante la war, pero la simulación continuará."
          );
          simulationResult = {
            challengerTotalPoints: 0,
            opponentTotalPoints: 0,
            stopped: false,
            race: 12,
          };
        } else {
          throw simError;
        }
      }

      await delay(10000);

      model.warManager.clearActiveWar(thread.id);

      if (!simulationResult) {
        console.error("❌ La simulación no devolvió un resultado válido");
        await safeSend(
          thread,
          "❌ Error: La simulación de la war no pudo completarse correctamente."
        );
        return;
      }

      if (simulationResult.stopped) {
        const stopMessage = langManager.getString(
          guildId,
          "war_stopped",
          {
            race: simulationResult.race || 12,
            challengerPoints: simulationResult.challengerTotalPoints || 0,
            opponentPoints: simulationResult.opponentTotalPoints || 0,
          },
          guildLocale
        );
        await safeSend(thread, stopMessage);

        if (warRecord?.IDWar) {
          try {
            const resultText = `War detenida en la carrera ${
              simulationResult.race || 12
            }. Puntos: ${challengerData.displayName} ${
              simulationResult.challengerTotalPoints || 0
            } - ${opponentData.displayName} ${
              simulationResult.opponentTotalPoints || 0
            }`;
            await model.updateWarResult(warRecord.IDWar, resultText);
          } catch (err) {
            console.error(
              "❌ Error actualizando resultado de war detenida:",
              err
            );
          }
        }
        return;
      }

      const challengerTotalPoints = simulationResult.challengerTotalPoints || 0;
      const opponentTotalPoints = simulationResult.opponentTotalPoints || 0;

      const isTie =
        challengerTotalPoints === opponentTotalPoints &&
        request.type !== WarType.TOURNAMENTWAR;

      let winnerData = challengerData;
      let loserData = opponentData;
      let winnerPoints = challengerTotalPoints;
      let loserPoints = opponentTotalPoints;

      if (opponentTotalPoints > challengerTotalPoints && !isTie) {
        winnerData = opponentData;
        loserData = challengerData;
        winnerPoints = opponentTotalPoints;
        loserPoints = challengerTotalPoints;
      }

      const rawDiff = winnerPoints - loserPoints;
      const pointsDiff = isTie ? 0 : rawDiff === 0 ? 1 : Math.abs(rawDiff);

      let currentChallengerElo = challengerData.elo;
      let currentOpponentElo = opponentData.elo;
      let currentChallengerCoins = challengerData.record?.Coins || 0;
      let currentOpponentCoins = opponentData.record?.Coins || 0;

      if (challengerData.record?.UserID && opponentData.record?.UserID) {
        try {
          const challengerDiscordId = challengerData.id;
          const opponentDiscordId = opponentData.id;

          const [currentChallengerRecord, currentOpponentRecord] =
            await Promise.all([
              model.getUser(
                challengerDiscordId,
                metadataGuildId,
                challengerData.userName,
                guildLocale
              ),
              model.getUser(
                opponentDiscordId,
                metadataGuildId,
                opponentData.userName,
                guildLocale
              ),
            ]);

          if (currentChallengerRecord) {
            currentChallengerElo = currentChallengerRecord.Elo || 0;
            currentChallengerCoins = currentChallengerRecord.Coins || 0;
          }
          if (currentOpponentRecord) {
            currentOpponentElo = currentOpponentRecord.Elo || 0;
            currentOpponentCoins = currentOpponentRecord.Coins || 0;
          }
        } catch (err) {
          console.error(
            "❌ Error obteniendo valores actuales de usuarios:",
            err
          );
        }
      }

      let currentWinnerElo = isTie
        ? currentChallengerElo
        : winnerData.id === challengerData.id
        ? currentChallengerElo
        : currentOpponentElo;
      let currentLoserElo = isTie
        ? currentOpponentElo
        : loserData.id === challengerData.id
        ? currentChallengerElo
        : currentOpponentElo;
      let currentWinnerCoins = isTie
        ? currentChallengerCoins
        : winnerData.id === challengerData.id
        ? currentChallengerCoins
        : currentOpponentCoins;
      let currentLoserCoins = isTie
        ? currentOpponentCoins
        : loserData.id === challengerData.id
        ? currentChallengerCoins
        : currentOpponentCoins;

      const betAmount =
        request.type === WarType.TOURNAMENTWAR ? 0 : request.amount || 0;
      let transferredCoins = betAmount;

      if (betAmount > 0 && !isTie) {
        transferredCoins = Math.min(betAmount, currentLoserCoins);
        const newWinnerCoins = currentWinnerCoins + transferredCoins;
        const newLoserCoins = Math.max(0, currentLoserCoins - transferredCoins);

        try {
          await model.updateUserCoins(winnerData.record.UserID, newWinnerCoins);
          await model.updateUserCoins(loserData.record.UserID, newLoserCoins);
        } catch (err) {
          console.error("❌ Error transfiriendo coins de war:", err);
        }
      }

      let challengerEloChange, opponentEloChange;
      let challengerNewElo, opponentNewElo;

      if (isTie) {
        const tieChanges = Utils.calculateEloChangeTie(
          currentChallengerElo,
          currentOpponentElo
        );
        challengerEloChange = tieChanges.playerAChange;
        opponentEloChange = tieChanges.playerBChange;
        challengerNewElo = Math.max(
          0,
          currentChallengerElo + challengerEloChange
        );
        opponentNewElo = Math.max(0, currentOpponentElo + opponentEloChange);

        winnerEloChange = challengerEloChange;
        loserEloChange = opponentEloChange;
        winnerNewElo = challengerNewElo;
        loserNewElo = opponentNewElo;
        currentWinnerElo = currentChallengerElo;
        currentLoserElo = currentOpponentElo;
      } else {
        winnerEloChange = Utils.calculateEloChange(
          currentWinnerElo,
          currentLoserElo
        );
        loserEloChange = -winnerEloChange;

        const maxLoserCanLose = currentLoserElo;
        if (Math.abs(loserEloChange) > maxLoserCanLose) {
          loserEloChange = -maxLoserCanLose;
          winnerEloChange = maxLoserCanLose;
        }

        winnerNewElo = Math.max(0, currentWinnerElo + winnerEloChange);
        loserNewElo = Math.max(0, currentLoserElo + loserEloChange);

        if (winnerData.id === challengerData.id) {
          challengerEloChange = winnerEloChange;
          opponentEloChange = loserEloChange;
          challengerNewElo = winnerNewElo;
          opponentNewElo = loserNewElo;
        } else {
          challengerEloChange = loserEloChange;
          opponentEloChange = winnerEloChange;
          challengerNewElo = loserNewElo;
          opponentNewElo = winnerNewElo;
        }
      }

      const [
        challengerOldRank,
        opponentOldRank,
        challengerNewRank,
        opponentNewRank,
      ] = await Promise.all([
        Utils.getRankForElo(currentChallengerElo),
        Utils.getRankForElo(currentOpponentElo),
        Utils.getRankForElo(challengerNewElo),
        Utils.getRankForElo(opponentNewElo),
      ]);

      const challengerRankChange = determineRankChange(
        challengerOldRank,
        challengerNewRank
      );
      const opponentRankChange = determineRankChange(
        opponentOldRank,
        opponentNewRank
      );

      const winnerOldRank = isTie
        ? challengerOldRank
        : winnerData.id === challengerData.id
        ? challengerOldRank
        : opponentOldRank;
      const loserOldRank = isTie
        ? opponentOldRank
        : loserData.id === challengerData.id
        ? challengerOldRank
        : opponentOldRank;
      const winnerNewRank = isTie
        ? challengerNewRank
        : winnerData.id === challengerData.id
        ? challengerNewRank
        : opponentNewRank;
      const loserNewRank = isTie
        ? opponentNewRank
        : loserData.id === challengerData.id
        ? challengerNewRank
        : opponentNewRank;
      const winnerRankChange = isTie
        ? challengerRankChange
        : winnerData.id === challengerData.id
        ? challengerRankChange
        : opponentRankChange;
      const loserRankChange = isTie
        ? opponentRankChange
        : loserData.id === challengerData.id
        ? challengerRankChange
        : opponentRankChange;

      if (
        request.type === WarType.WAR &&
        challengerData.record?.UserID &&
        opponentData.record?.UserID
      ) {
        try {
          if (isTie) {
            await Promise.all([
              model.updateUserElo(
                challengerData.record.UserID,
                challengerNewElo
              ),
              model.updateUserElo(opponentData.record.UserID, opponentNewElo),
            ]);
          } else {
            await Promise.all([
              model.updateUserElo(winnerData.record.UserID, winnerNewElo),
              model.updateUserElo(loserData.record.UserID, loserNewElo),
            ]);
          }
        } catch (err) {
          console.error("❌ Error actualizando Elos en base de datos:", err);
        }
      }

      let finishEmbed = new EmbedWarFinish({
        type: request.type,
        winnerDisplayName: isTie
          ? challengerData.displayName
          : winnerData.displayName,
        loserDisplayName: isTie
          ? opponentData.displayName
          : loserData.displayName,
        winnerTeamName: isTie
          ? challengerData.teamTag || challengerData.teamName
          : winnerData.teamTag || winnerData.teamName,
        loserTeamName: isTie
          ? opponentData.teamTag || opponentData.teamName
          : loserData.teamTag || loserData.teamName,
        winnerPoints: isTie ? challengerTotalPoints : winnerPoints,
        loserPoints: isTie ? opponentTotalPoints : loserPoints,
        pointsDiff,
        betAmount: transferredCoins,
        winnerEloChange: isTie ? challengerEloChange : winnerEloChange,
        loserEloChange: isTie ? opponentEloChange : loserEloChange,
        winnerNewElo: isTie ? challengerNewElo : winnerNewElo,
        loserNewElo: isTie ? opponentNewElo : loserNewElo,
        winnerRankName: isTie
          ? formatRankName(challengerNewRank)
          : formatRankName(winnerNewRank),
        loserRankName: isTie
          ? formatRankName(opponentNewRank)
          : formatRankName(loserNewRank),
        winnerRankChange: isTie ? challengerRankChange : winnerRankChange,
        loserRankChange: isTie ? opponentRankChange : loserRankChange,
        guildId,
        guildLocale,
        isTie: isTie,
      });

      if (transferredCoins > 0) {
        finishEmbed = new DecoratorWarBetDescription(
          finishEmbed,
          winnerData.displayName,
          transferredCoins,
          guildId,
          guildLocale
        );
      }

      if (request.type === WarType.WAR) {
        finishEmbed = new DecoratorWarEloSummary(finishEmbed, {
          winnerDisplayName: isTie
            ? challengerData.displayName
            : winnerData.displayName,
          loserDisplayName: isTie
            ? opponentData.displayName
            : loserData.displayName,
          winnerName: isTie ? challengerData.userName : winnerData.userName,
          loserName: isTie ? opponentData.userName : loserData.userName,
          winnerEloChange: isTie ? challengerEloChange : winnerEloChange,
          loserEloChange: isTie ? opponentEloChange : loserEloChange,
          winnerNewElo: isTie ? challengerNewElo : winnerNewElo,
          loserNewElo: isTie ? opponentNewElo : loserNewElo,
          winnerRankName: isTie
            ? formatRankName(challengerNewRank)
            : formatRankName(winnerNewRank),
          loserRankName: isTie
            ? formatRankName(opponentNewRank)
            : formatRankName(loserNewRank),
          guildId,
          guildLocale,
        });

        finishEmbed = new DecoratorWarRankSummary(finishEmbed, {
          winnerDisplayName: isTie
            ? challengerData.displayName
            : winnerData.displayName,
          loserDisplayName: isTie
            ? opponentData.displayName
            : loserData.displayName,
          winnerName: isTie ? challengerData.userName : winnerData.userName,
          loserName: isTie ? opponentData.userName : loserData.userName,
          winnerRankName: isTie
            ? formatRankName(challengerNewRank)
            : formatRankName(winnerNewRank),
          loserRankName: isTie
            ? formatRankName(opponentNewRank)
            : formatRankName(loserNewRank),
          winnerRankChange: isTie ? challengerRankChange : winnerRankChange,
          loserRankChange: isTie ? opponentRankChange : loserRankChange,
          guildId,
          guildLocale,
        });
      }

      await safeSend(thread, null, { embeds: [finishEmbed.build()] });

      if (warRecord?.IDWar) {
        try {
          let resultText;
          if (isTie) {
            resultText = `${challengerData.displayName} y ${opponentData.displayName} empataron con ${challengerTotalPoints} puntos cada uno`;
          } else {
            resultText = `${winnerData.displayName} ganó con ${winnerPoints} puntos vs ${loserData.displayName} con ${loserPoints} puntos`;
          }
          await model.updateWarResult(warRecord.IDWar, resultText);
        } catch (err) {
          console.error(
            "❌ Error actualizando resultado de war en base de datos:",
            err
          );
        }
      }

      if (request.type !== WarType.SCRIM) {
        try {
          const allPlayerIds = [
            ...challengerData.racers.map((r) => r.playerId),
            ...opponentData.racers.map((r) => r.playerId),
          ].filter((id) => id && typeof id === "number");

          if (allPlayerIds.length > 0) {
            await model.reduceEnergyAfterWar(allPlayerIds);
          }
        } catch (err) {
          console.error("❌ Error reduciendo energía después de war:", err);
        }
      }
    } catch (error) {
      const isNetworkError =
        error.code === "UND_ERR_SOCKET" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.message?.includes("other side closed") ||
        error.message?.includes("socket") ||
        error.name === "SocketError";

      if (isNetworkError) {
        console.error(
          "❌ Error de red en AcceptCommand (no crítico):",
          error.message
        );
      } else {
        console.error("❌ Error en AcceptCommand:", error);
        try {
          const errorMessage = langManager.getString(
            guildId,
            "war_error_unknown",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
        } catch (replyError) {
          console.error(
            "❌ Error al responder con mensaje de error:",
            replyError
          );
        }
      }
    }
  },
  prepareParticipant,
  runWarSimulation,
  determineRankChange,
  formatRankName,
};
