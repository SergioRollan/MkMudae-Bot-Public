const EventGenerator = require("./EventGenerator");
const RaceState = require("./RaceState");

class RaceSimulator {
  constructor(
    track,
    teamARacers,
    teamBRacers,
    raceNumber,
    startingGrid = null
  ) {
    this.track = track;
    this.teamARacers = teamARacers;
    this.teamBRacers = teamBRacers;
    this.raceNumber = raceNumber;

    if (startingGrid) {
      this.allRacers = this._orderRacersByGrid(
        teamARacers,
        teamBRacers,
        startingGrid
      );
    } else {
      this.allRacers = [...teamARacers, ...teamBRacers];
    }

    this.eventGenerator = new EventGenerator();
    this.state = new RaceState(this.allRacers, startingGrid);
  }

  _orderRacersByGrid(teamARacers, teamBRacers, grid) {
    const shuffledTeamA = [...teamARacers].sort(() => Math.random() - 0.5);
    const shuffledTeamB = [...teamBRacers].sort(() => Math.random() - 0.5);

    const allRacers = new Array(12);

    grid.teamA.forEach((gridPosition, index) => {
      if (index < shuffledTeamA.length) {
        allRacers[gridPosition - 1] = shuffledTeamA[index];
      }
    });

    grid.teamB.forEach((gridPosition, index) => {
      if (index < shuffledTeamB.length) {
        allRacers[gridPosition - 1] = shuffledTeamB[index];
      }
    });

    const orderedRacers = allRacers.filter((r) => r !== undefined);

    return orderedRacers;
  }

  simulateRace() {
    const sectorMessages = [];

    for (let lap = 1; lap <= 3; lap++) {
      const lapEvents = [];
      let lapFinalPositions = null;

      for (let sectorNum = 1; sectorNum <= 3; sectorNum++) {
        const sectorType = this._getSectorType(sectorNum);
        const sectorData = this._simulateSector(lap, sectorNum, sectorType);

        const eventsWithSector = sectorData.events.map((event) => ({
          ...event,
          _sectorNum: lap === 3 ? sectorNum : null,
        }));

        lapEvents.push(...eventsWithSector);

        if (sectorNum === 3) {
          lapFinalPositions = sectorData.positions;
        }
      }

      sectorMessages.push({
        lap,
        sectorNum: null,
        sectorType: null,
        type: "lap",
        events: lapEvents,
        positions: lapFinalPositions,
      });
    }

    const topPosEvents = this.state.damageTopPositions();
    if (topPosEvents && topPosEvents.length > 0) {
      if (sectorMessages.length > 0) {
        const lastMessage = sectorMessages[sectorMessages.length - 1];

        topPosEvents.forEach((event) => {
          const randomIndex = Math.floor(
            Math.random() * (lastMessage.events.length + 1)
          );
          lastMessage.events.splice(randomIndex, 0, event);
        });
      }
    }

    const finalResults = this.state.getFinalResults();

    return {
      sectorMessages,
      finalResults,
    };
  }

  _simulateSector(lap, sectorNum, sectorType) {
    if (lap === 3 && sectorNum === 1) {
      this.state.racers.forEach((racer) => {
        if (racer.hasSlowedForShock) {
          racer.permanentSlowdown = Math.max(0, racer.permanentSlowdown - 2);
        }
      });
    }

    this.state.currentLap = lap;

    this.state.racers.forEach((racer) => {
      racer.hasOvertakenThisSector = false;
      racer.slowdownThisSector = 0;
    });

    const positionsBefore = this.state.racers.map((r) => ({
      racer: r,
      position: r.position,
      timeGap: r.timeGap,
    }));

    let blueShellImpactEvent = null;
    if (this.state.pendingBlueShellImpact) {
      const impactData = this.state.pendingBlueShellImpact;
      const currentLeader = this.state.racers.find((r) => r.position === 1);

      const originalVictim = impactData.victim;
      const blueShellThrower = impactData.thrower;
      let finalVictim = currentLeader;
      let doubleDamage = false;

      finalVictim = currentLeader;
      if (
        currentLeader &&
        blueShellThrower &&
        currentLeader.teamKey === blueShellThrower.teamKey
      ) {
        doubleDamage = true;
      }

      blueShellImpactEvent = {
        type: "blue_shell_impact",
        stringKey: doubleDamage
          ? "race_event_blue_shell_impact_teammate"
          : "race_event_blue_shell_impact",
        data: {
          victim: finalVictim,
          thrower: blueShellThrower,
          doubleDamage,
          numPositions: Math.floor(Math.random() * 3) + 1,
        },
      };

      this.state.pendingBlueShellImpact = null;
    }

    const useRandomLines =
      this.raceNumber === 1 && lap === 1 && sectorNum === 1;

    this.state.simulateSectorAdvance(sectorType, useRandomLines);

    this.state.positionsBeforeSector = positionsBefore;

    let blueShellUsedEventAtStart = null;
    const blueShellHolder = this.state.racers.find((r) => r.isHoldingBlue);
    if (
      blueShellHolder &&
      !this.state.blueShellUsed &&
      this.state.blueShellAvailable &&
      this.state.leaderAtEndOfPreviousSector
    ) {
      const currentLeader = this.state.racers.find((r) => r.position === 1);

      if (
        currentLeader &&
        currentLeader !== blueShellHolder &&
        currentLeader.teamKey !== blueShellHolder.teamKey &&
        this.state.leaderAtEndOfPreviousSector &&
        this.state.leaderAtEndOfPreviousSector.teamKey ===
          blueShellHolder.teamKey
      ) {
        this.state.pendingBlueShellImpact = {
          victim: currentLeader,
          thrower: blueShellHolder,
        };
        this.state.blueShellUsed = true;

        blueShellUsedEventAtStart = {
          type: "blue_shell_used",
          stringKey: "race_event_blue_shell_used_held",
          data: {
            racer: blueShellHolder,
            leader: currentLeader,
            instantUse: false,
            position: blueShellHolder.position,
          },
        };
      }
    }

    const events = this.eventGenerator.generateSectorEvents({
      lap,
      sectorNum,
      sectorType,
      raceState: this.state,
      raceNumber: this.raceNumber,
    });

    this.state.positionsBeforeSector = null;

    if (blueShellImpactEvent) {
      events.unshift(blueShellImpactEvent);
    }

    const teamShockEvent = events.find((e) => e.type === "team_shock");
    const blueShellImpact = events.find((e) => e.type === "blue_shell_impact");
    const blueShellUsed = events.find((e) => e.type === "blue_shell_used");
    const otherEvents = events.filter(
      (e) =>
        e.type !== "team_shock" &&
        e.type !== "blue_shell_impact" &&
        e.type !== "blue_shell_used"
    );

    const allEvents = [];
    if (blueShellUsedEventAtStart) {
      allEvents.push(blueShellUsedEventAtStart);
    } else if (blueShellUsed) {
      allEvents.push(blueShellUsed);
    }

    if (blueShellImpact) {
      allEvents.push(blueShellImpact);
    }

    otherEvents.forEach((event) => {
      const mentalEvents = this.state.applyEvent(event);

      allEvents.push(event);
      if (mentalEvents && mentalEvents.length > 0) {
        allEvents.push(...mentalEvents);
      }
    });

    let blueShellEventAfterOtherEvents = null;
    if (
      (lap === 1 && sectorNum >= 3) ||
      lap === 2 ||
      (lap === 3 && sectorNum <= 2)
    ) {
      blueShellEventAfterOtherEvents =
        this.eventGenerator._generateRandomBlueShell(
          lap,
          sectorNum,
          this.state
        );
      if (blueShellEventAfterOtherEvents) {
        const mentalEvents = this.state.applyEvent(
          blueShellEventAfterOtherEvents
        );
        if (mentalEvents && mentalEvents.length > 0) {
          allEvents.push(...mentalEvents);
        }
        allEvents.push(blueShellEventAfterOtherEvents);

        if (blueShellEventAfterOtherEvents.data?.instantUse) {
          this.state.pendingBlueShellImpact = {
            victim: blueShellEventAfterOtherEvents.data.leader,
            thrower: blueShellEventAfterOtherEvents.data.racer,
          };
          this.state.blueShellUsed = true;
        }
      }
    }

    if (sectorType === "Coins") {
      this.state.distributeCoinsForCoinsSection();
    } else {
      this.state.distributeCoinsForPositions();
    }

    if (teamShockEvent) {
      const mentalEvents = this.state.applyEvent(teamShockEvent);
      if (mentalEvents && mentalEvents.length > 0) {
        allEvents.push(...mentalEvents);
      }

      allEvents.push(teamShockEvent);
    }

    if (!this.state.shockUsedThisRace && !(lap === 3 && sectorNum >= 1)) {
      this.state._maintainShockSlowdownPositions();
    }

    const currentPositions = this.state.getCurrentPositions();

    const leaderAtEnd = this.state.racers.find((r) => r.position === 1);
    this.state.leaderAtEndOfPreviousSector = leaderAtEnd;

    return {
      lap,
      sectorNum,
      sectorType,
      events: allEvents,
      positions: currentPositions,
    };
  }

  _getSectorType(sectorNum) {
    const choice = Math.random() < 0.5 ? "A" : "B";
    const key = `sector${sectorNum}${choice}`;
    const sectorType =
      this.track[key] || this.track[`Sector${sectorNum}${choice}`] || "normal";
    return sectorType;
  }
}

module.exports = RaceSimulator;
