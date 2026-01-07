class RaceState {
  constructor(racers, startingGrid = null) {
    this.initialStats = this._calculateInitialStats(racers);

    this.normalizedStats = this._normalizeStats(this.initialStats, racers);

    this.racers = racers.map((racer, index) => {
      const normalized = this.normalizedStats.get(racer.playerId || racer.name);
      const position = index + 1;

      let initialCoins = 0;
      if (position >= 3 && position <= 5) {
        initialCoins = 1;
      } else if (position >= 6 && position <= 8) {
        initialCoins = 2;
      } else if (position >= 9 && position <= 10) {
        initialCoins = 3;
      } else if (position >= 11 && position <= 12) {
        initialCoins = 4;
      }

      const currentHp =
        typeof racer.hp === "number" && racer.hp >= 0 && racer.hp <= 100
          ? racer.hp
          : 100;

      const currentNonTopPositionHPLoss =
        typeof racer.nonTopPositionHPLoss === "number" &&
        racer.nonTopPositionHPLoss >= 0
          ? racer.nonTopPositionHPLoss
          : 0;

      return {
        ...racer,
        position: position,
        timeGap: index * 0.1,

        normalizedLines: normalized?.lines || 100,
        normalizedConsistency: normalized?.consistency || 50,
        normalizedItemUsage: normalized?.itemUsage || 50,
        normalizedPrecision: normalized?.precision || 50,
        normalizedCommunication: normalized?.communication || 50,
        normalizedMental: normalized?.mental || 50,
        normalizedGameSense: normalized?.gameSense || 50,
        normalizedShockFinding: normalized?.shockFinding || 50,

        hasDied: false,
        hasShock: false,
        hasShockDodge: false,
        hasBlueShell: false,
        isHoldingBlue: false,
        shockUsedThisRace: false,
        hasSlowedForShock: false,
        hasSlowedForItems: false,
        coins: initialCoins,
        hp: currentHp,
        nonTopPositionHPLoss: currentNonTopPositionHPLoss,
        fatigue: 0,
        mentalWarningShown: false,
        mentalCriticalShown: false,
        overtakenPenalty: 0,
        permanentSlowdown: 0,
        slowdownThisSector: 0,
        hasOvertakenThisSector: false,
      };
    });

    this.shockAvailable = false;
    this.shockUsedThisRace = false;
    this.blueShellAvailable = false;
    this.blueShellUsed = false;
    this.shockFoundInLap = null;
    this.shockFoundInSector = null;
    this.blueShellFoundInSector = null;
    this.positionsBeforeSector = null;
    this.pendingBlueShellImpact = null;
    this.blueShellHolderLeader = null;
    this.leaderAtEndOfPreviousSector = null;
    this.currentLap = 1;
    this.escapeMessageShown = false;

    this._logPlayerStatsSummary(racers);

    console.log(
      `📊 RaceState: Posiciones iniciales ordenadas: ${this.racers
        .map(
          (r, i) =>
            `${i + 1}.${r.name} (+${r.timeGap.toFixed(1)}s, ${r.coins} monedas)`
        )
        .join(", ")}`
    );
  }

  _logPlayerStatsSummary(racers) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 RESUMEN DE STATS DE TODOS LOS JUGADORES (ANTES DE LA WAR)`);
    console.log(`${"=".repeat(80)}\n`);

    racers.forEach((racer) => {
      const key = racer.playerId || racer.name;
      const initialStats = this.initialStats.get(key);
      const normalizedStats = this.normalizedStats.get(key);

      if (!initialStats || !normalizedStats) {
        console.log(`❌ Error: No se encontraron stats para ${racer.name}`);
        return;
      }

      const mmr = racer.mmr || 0;
      console.log(`\n👤 ${racer.name} (MMR: ${mmr.toFixed(0)})`);
      console.log(`   ${"-".repeat(76)}`);

      const statsList = [
        { key: "lines", name: "Trazada", baseKey: "lines" },
        { key: "consistency", name: "Consistencia", baseKey: "consistency" },
        { key: "itemUsage", name: "Uso Items", baseKey: "itemUsage" },
        { key: "precision", name: "Precisión", baseKey: "precision" },
        {
          key: "communication",
          name: "Comunicación",
          baseKey: "communication",
        },
        { key: "mental", name: "Mental", baseKey: "mental" },
        { key: "gameSense", name: "Game Sense", baseKey: "gameSense" },
        { key: "shockFinding", name: "Shock Finding", baseKey: "shockFinding" },
      ];

      statsList.forEach(({ key, name, baseKey }) => {
        const baseValue = racer[baseKey] || 0;
        const initialValue = initialStats[key] || 0;
        const normalizedValue = normalizedStats[key] || 0;

        console.log(
          `   ${name.padEnd(18)} | Base: ${String(
            baseValue.toFixed(1)
          ).padStart(8)} | ` +
            `Inicial (base+MMR): ${String(initialValue.toFixed(1)).padStart(
              10
            )} | ` +
            `Normalizado: ${String(normalizedValue.toFixed(3)).padStart(7)}`
        );
      });
    });

    console.log(`\n${"=".repeat(80)}\n`);
  }

  _calculateInitialStats(racers) {
    const statsMap = new Map();

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

      const calculatedStats = {
        lines: baseLines + mmr,
        consistency: baseConsistency + mmr,
        itemUsage: baseItemUsage + mmr,
        precision: basePrecision + mmr,
        communication: baseCommunication + mmr,
        mental: baseMental + mmr,
        gameSense: baseGameSense + mmr,
        shockFinding: baseShockFinding + mmr,
      };

      if (
        mmr > 10000 ||
        (racer.name && racer.name.toLowerCase().includes("eternicle"))
      ) {
        console.log(
          `📊 RaceState: ${racer.name} - MMR: ${mmr}, Lines base: ${baseLines}, Lines total: ${calculatedStats.lines}`
        );
        console.log(
          `📊 RaceState: ${racer.name} - Todos los stats calculados:`,
          calculatedStats
        );
      }

      statsMap.set(racer.playerId || racer.name, calculatedStats);
    });

    return statsMap;
  }

  _normalizeStats(initialStatsMap, racers) {
    const statsArray = Array.from(initialStatsMap.entries());
    const normalizedMap = new Map();

    const calculateTeamAverageValue = (teamKey) => {
      let totalSum = 0;
      let count = 0;

      statsArray.forEach(([key, stats]) => {
        const racer = racers.find((r) => (r.playerId || r.name) === key);
        if (racer && racer.teamKey === teamKey) {
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
        }
      });

      return count > 0 ? totalSum / count : 0;
    };

    const teamAAverage = calculateTeamAverageValue("A");
    const teamBAverage = calculateTeamAverageValue("B");
    const difference = Math.abs(teamAAverage - teamBAverage);

    let minNormalizedValue;
    if (difference < 500) {
      minNormalizedValue = 66;
    } else if (difference < 1000) {
      minNormalizedValue = 60;
    } else if (difference < 1500) {
      minNormalizedValue = 50;
    } else if (difference < 2000) {
      minNormalizedValue = 45;
    } else if (difference < 3000) {
      minNormalizedValue = 40;
    } else if (difference < 4000) {
      minNormalizedValue = 30;
    } else if (difference < 5000) {
      minNormalizedValue = 20;
    } else {
      minNormalizedValue = 10;
    }

    const rangeSize = 90 - minNormalizedValue;

    const attributes = [
      "consistency",
      "itemUsage",
      "precision",
      "communication",
      "gameSense",
      "shockFinding",
    ];

    const minNormalizedMentalValue = 10;
    const mentalRangeSize = 90 - minNormalizedMentalValue;

    let minNormalizedLinesValue = 70;

    const linesRangeSize = 100 - minNormalizedLinesValue;

    statsArray.forEach(([key, stats]) => {
      const normalized = {};

      const linesValues = statsArray.map(([k, s]) => s.lines || 0);
      const maxLines = Math.max(...linesValues);
      const minLines = Math.min(...linesValues);
      const linesRange = maxLines - minLines;

      if (linesRange === 0) {
        normalized.lines = (100 + minNormalizedLinesValue) / 2;
      } else {
        const linesValue = stats.lines || 0;
        const normalizedValue =
          minNormalizedLinesValue +
          ((linesValue - minLines) / linesRange) * linesRangeSize;
        normalized.lines = Math.round(normalizedValue * 1000) / 1000;
      }

      const mentalValues = statsArray.map(([k, s]) => s.mental || 0);
      const maxMental = Math.max(...mentalValues);
      const minMental = Math.min(...mentalValues);
      const mentalRange = maxMental - minMental;

      if (mentalRange === 0) {
        normalized.mental = (90 + minNormalizedMentalValue) / 2;
      } else {
        const mentalValue = stats.mental || 0;
        const normalizedValue =
          minNormalizedMentalValue +
          ((mentalValue - minMental) / mentalRange) * mentalRangeSize;
        normalized.mental = Math.round(normalizedValue * 1000) / 1000;
      }

      attributes.forEach((attr) => {
        const values = statsArray.map(([k, s]) => s[attr]);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const range = maxValue - minValue;

        if (range === 0) {
          normalized[attr] = (90 + minNormalizedValue) / 2;
        } else {
          const normalizedValue =
            minNormalizedValue + ((stats[attr] - minValue) / range) * rangeSize;
          normalized[attr] = Math.round(normalizedValue * 1000) / 1000;
        }
      });

      normalizedMap.set(key, normalized);
    });

    return normalizedMap;
  }

  simulateSectorAdvance(sectorType) {
    const sortedBefore = [...this.racers].sort(
      (a, b) => (a.timeGap || 0) - (b.timeGap || 0)
    );
    const positionMap = new Map();
    sortedBefore.forEach((racer, index) => {
      positionMap.set(racer, index + 1);
    });

    this.racers.forEach((racer) => {
      let lines = racer.normalizedLines || 100;

      const currentPosition = positionMap.get(racer) || racer.position || 12;
      let positionMultiplier = 1.0;
      if (currentPosition === 1) {
        positionMultiplier = 0.83;
      } else if (currentPosition === 2) {
        positionMultiplier = 0.86;
      } else if (currentPosition === 3) {
        positionMultiplier = 0.9;
      } else if (currentPosition === 4) {
        positionMultiplier = 0.95;
      }
      lines *= positionMultiplier;

      const hpMultiplier = 0.8 + (racer.hp / 100) * 0.2;
      lines *= hpMultiplier;

      let sectorMultiplier = 1.0;
      if (sectorType === "Straight") {
        sectorMultiplier = 0.75;
      } else if (sectorType === "Technical") {
        sectorMultiplier = 1.31;
      }
      lines *= sectorMultiplier;

      lines += racer.coins || 0;

      const timeAdded = (100 - lines) / 38;

      const totalPenalty = racer.permanentSlowdown + racer.slowdownThisSector;

      const sectorTime = Math.max(0, timeAdded + totalPenalty);

      racer.timeGap = (racer.timeGap || 0) + sectorTime;

      racer.slowdownThisSector = 0;
    });

    this._recalculatePositions();
  }

  _maintainShockSlowdownPositions() {
    const slowRacers = this.racers.filter((r) => r.hasSlowedForShock);

    if (slowRacers.length === 0) return;

    this._recalculatePositions();

    const sortedAll = [...this.racers].sort(
      (a, b) => (a.timeGap || 0) - (b.timeGap || 0)
    );

    let racerAt10 = null;
    let timeGap10 = 0;

    let countOthers = 0;
    for (const racer of sortedAll) {
      if (!racer.hasSlowedForShock) {
        countOthers++;
        if (countOthers === 10) {
          racerAt10 = racer;
          timeGap10 = racer.timeGap || 0;
          break;
        }
      }
    }

    if (!racerAt10 && countOthers < 10) {
      const lastOther = sortedAll
        .filter((r) => !r.hasSlowedForShock)
        .slice(-1)[0];
      if (lastOther) {
        timeGap10 = lastOther.timeGap || 0;
      }
    }

    const sortedSlowRacers = [...slowRacers].sort(
      (a, b) => (a.timeGap || 0) - (b.timeGap || 0)
    );

    if (sortedSlowRacers.length >= 1) {
      sortedSlowRacers[0].timeGap = timeGap10 + 0.5;
    }

    if (sortedSlowRacers.length >= 2) {
      const timeGap11 = sortedSlowRacers[0].timeGap || 0;
      sortedSlowRacers[1].timeGap = timeGap11 + 0.2;
    }

    this._recalculatePositions();
  }

  getEffectiveStats(racer) {
    const hpMultiplier = 0.8 + (racer.hp / 100) * 0.2;

    const lastPlaceBoostLevel = racer.lastPlaceBoostLevel || 0;
    const lastPlaceMultiplier =
      lastPlaceBoostLevel > 0 ? 1.0 + lastPlaceBoostLevel * 0.1 : 1.0;

    let gameSense =
      (racer.normalizedGameSense || 50) * hpMultiplier * lastPlaceMultiplier;

    if (this.currentLap === 1 && racer.hadLowPositionLastRace) {
      gameSense *= 2;
    }

    return {
      lines:
        (racer.normalizedLines || 100) * hpMultiplier * lastPlaceMultiplier,
      consistency:
        (racer.normalizedConsistency || 50) *
        hpMultiplier *
        lastPlaceMultiplier,
      itemUsage:
        (racer.normalizedItemUsage || 50) * hpMultiplier * lastPlaceMultiplier,
      precision:
        (racer.normalizedPrecision || 50) * hpMultiplier * lastPlaceMultiplier,
      communication:
        (racer.normalizedCommunication || 50) *
        hpMultiplier *
        lastPlaceMultiplier,
      mental:
        (racer.normalizedMental || 50) * hpMultiplier * lastPlaceMultiplier,
      gameSense: gameSense,
      shockFinding:
        (racer.normalizedShockFinding || 50) *
        hpMultiplier *
        lastPlaceMultiplier,
    };
  }

  addCoins(racer, amount) {
    racer.coins = Math.min(20, racer.coins + amount);
  }

  removeCoins(racer, amount) {
    const oldCoins = racer.coins;
    racer.coins = Math.max(0, racer.coins - amount);
  }

  _calculateHPLoss(racer, baseLoss) {
    const effective = this.getEffectiveStats(racer);
    const mental = effective.mental || 50;

    const mentalFactor = 1 - ((mental - 10) / 80) * 0.7;
    let loss = baseLoss * Math.max(0.3, mentalFactor);

    loss *= 0.7;

    return Math.round(loss * 10) / 10;
  }

  damageRacer(racer, baseLoss, reason = "generic") {
    const loss =
      reason === "top_position"
        ? baseLoss
        : this._calculateHPLoss(racer, baseLoss);
    const oldHP = racer.hp;
    racer.hp = Math.max(0, racer.hp - loss);

    if (reason !== "top_position") {
      racer.nonTopPositionHPLoss = (racer.nonTopPositionHPLoss || 0) + loss;
    }

    console.log(
      `📊 RaceState: ${racer.name} pierde ${loss} HP (${oldHP.toFixed(
        1
      )} -> ${racer.hp.toFixed(1)}) por ${reason}`
    );

    const events = [];

    const currentNonTopPositionHPLoss = racer.nonTopPositionHPLoss || 0;
    const previousNonTopPositionHPLoss =
      currentNonTopPositionHPLoss - (reason !== "top_position" ? loss : 0);

    if (
      previousNonTopPositionHPLoss < 33 &&
      currentNonTopPositionHPLoss >= 33 &&
      !racer.mentalWarningShown
    ) {
      racer.mentalWarningShown = true;
      events.push({
        type: "mental_warning",
        stringKey: "race_event_mental_warning",
        data: { racer },
      });
    }

    if (
      previousNonTopPositionHPLoss < 66 &&
      currentNonTopPositionHPLoss >= 66 &&
      !racer.mentalCriticalShown
    ) {
      racer.mentalCriticalShown = true;
      events.push({
        type: "mental_critical",
        stringKey: "race_event_mental_critical",
        data: { racer },
      });
    }

    return events;
  }

  distributeCoinsForPositions() {
    this.racers.forEach((racer) => {
      let coinsGained = 0;

      if (racer.position === 1) {
        coinsGained = 2 + Math.floor(Math.random() * 3);
      } else if (racer.position >= 2 && racer.position <= 3) {
        coinsGained = 1 + Math.floor(Math.random() * 3);
      } else if (racer.position >= 4 && racer.position <= 7) {
        coinsGained = 2 + Math.floor(Math.random() * 3);
      } else if (racer.position >= 8 && racer.position <= 12) {
        coinsGained = 3 + Math.floor(Math.random() * 3);
      }

      if (coinsGained > 0) {
        this.addCoins(racer, coinsGained);
      }
    });
  }

  distributeCoinsForCoinsSection() {
    this.racers.forEach((racer) => {
      let coinsGained = 0;

      if (racer.position === 1) {
        coinsGained = 2 + Math.floor(Math.random() * 3);
      } else if (racer.position >= 2 && racer.position <= 3) {
        coinsGained = 1 + Math.floor(Math.random() * 3);
      } else if (racer.position >= 4 && racer.position <= 7) {
        coinsGained = 2 + Math.floor(Math.random() * 3);
      } else if (racer.position >= 8 && racer.position <= 12) {
        coinsGained = 3 + Math.floor(Math.random() * 3);
      }

      if (racer.position >= 7) {
        coinsGained = Math.floor(coinsGained * 1.5);
      }

      if (coinsGained > 0) {
        this.addCoins(racer, coinsGained);
      }
    });
  }

  getRacerAtPosition(position) {
    return this.racers.find((r) => r.position === position);
  }

  getRacersInPositionRange(minPos, maxPos) {
    return this.racers.filter(
      (r) => r.position >= minPos && r.position <= maxPos
    );
  }

  swapPositions(racer1, racer2) {
    const pos1 = racer1.position;
    const pos2 = racer2.position;
    racer1.position = pos2;
    racer2.position = pos1;
  }

  _dropPositions(racer, numPositions) {
    racer.timeGap += numPositions * 0.5;
  }

  applyEvent(event) {
    let additionalEvents = [];

    switch (event.type) {
      case "overtake":
        additionalEvents = this._applyOvertake(event);
        break;
      case "multiple_overtakes":
        break;
      case "escape":
        additionalEvents = this._applyEscape(event);
        break;
      case "shortcut_overtake":
        additionalEvents = this._applyShortcutOvertake(event);
        break;
      case "shortcut_overtake_hidden":
        additionalEvents = this._applyShortcutOvertake(event);
        break;
      case "multiple_shortcut_overtakes":
        additionalEvents = this._applyMultipleShortcutOvertakes(event);
        break;
      case "technical_fall":
        additionalEvents = this._applyTechnicalFall(event);
        break;
      case "teamkill":
        additionalEvents = this._applyTeamkill(event);
        break;
      case "kill":
        additionalEvents = this._applyKill(event);
        break;
      case "kill_hidden":
        additionalEvents = this._applyKill(event);
        break;
      case "kill_attempt":
        break;
      case "slow_for_shock_v1s2":
        additionalEvents = this._applySlowForShockV1S2(event);
        break;
      case "slow_for_items":
        additionalEvents = this._applySlowForItems(event);
        break;
      case "slow_for_team_dominance":
        additionalEvents = this._applySlowForTeamDominance(event);
        break;
      case "shock_found":
        additionalEvents = this._applyShockFound(event);
        break;
      case "blue_shell_found":
        additionalEvents = this._applyBlueShellFound(event);
        break;
      case "blue_shell_held":
        additionalEvents = this._applyBlueShellHeld(event);
        break;
      case "blue_shell_used":
        additionalEvents = this._applyBlueShellUsed(event);
        break;
      case "blue_shell_impact":
        additionalEvents = this._applyBlueShellImpact(event);
        break;
      case "shock_used":
        additionalEvents = this._applyShockUsed(event);
        break;
      case "mental_warning":
      case "mental_critical":
        break;
      default:
        break;
    }

    return additionalEvents || [];
  }

  _applyOvertake(event) {
    const { overtaker, overtaken } = event.data;
    if (overtaker && overtaken) {
      this.swapPositions(overtaker, overtaken);

      if (!overtaken.hasOvertakenThisSector) {
        overtaken.overtakenPenalty += 0.25;
        overtaken.slowdownThisSector += 0.25;
        overtaken.hasOvertakenThisSector = true;

        const effective = this.getEffectiveStats(overtaken);
        const mental = effective.mental || 50;
        const maxLoss = 0.75;
        const minLoss = 0.25;
        const hpLoss =
          minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);
        this.damageRacer(overtaken, hpLoss, "overtaken");
      }
    }
    return [];
  }

  _applyEscape(event) {
    return [];
  }

  _applyShortcutOvertake(event) {
    const { overtaker, numPositions } = event.data;
    if (overtaker) {
      overtaker.timeGap = Math.max(0, overtaker.timeGap - 3);

      for (let i = 0; i < numPositions; i++) {
        const targetPos = overtaker.position - 1;
        if (targetPos >= 1) {
          const overtaken = this.getRacerAtPosition(targetPos);
          if (overtaken) {
            this.swapPositions(overtaker, overtaken);
          }
        }
      }
    }
    return [];
  }

  _applyMultipleShortcutOvertakes(event) {
    const { shortcuts } = event.data;
    if (!shortcuts || !Array.isArray(shortcuts)) return [];

    shortcuts.forEach((shortcutData) => {
      const { overtaker, numPositions } = shortcutData;
      if (overtaker) {
        overtaker.timeGap = Math.max(0, overtaker.timeGap - 3);

        for (let i = 0; i < numPositions; i++) {
          const targetPos = overtaker.position - 1;
          if (targetPos >= 1) {
            const overtaken = this.getRacerAtPosition(targetPos);
            if (overtaken) {
              this.swapPositions(overtaker, overtaken);
            }
          }
        }
      }
    });

    return [];
  }

  _applyTechnicalFall(event) {
    const { racer } = event.data;
    racer.timeGap += 3;
    this.removeCoins(racer, 3);

    const effective = this.getEffectiveStats(racer);
    const mental = effective.mental || 50;

    const maxLoss = 2;
    const minLoss = 0.75;
    const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);
    return this.damageRacer(racer, hpLoss, "technical_fall");
  }

  _applyTeamkill(event) {
    const { victim } = event.data;
    victim.timeGap += 2;
    victim.hasDied = true;
    this.removeCoins(victim, 3);

    const effective = this.getEffectiveStats(victim);
    const mental = effective.mental || 50;

    const maxLoss = 2.5;
    const minLoss = 1;
    const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);
    return this.damageRacer(victim, hpLoss, "teamkill");
  }

  _applyKill(event) {
    const { victim } = event.data;
    victim.timeGap += 2;
    victim.hasDied = true;
    this.removeCoins(victim, 3);

    const effective = this.getEffectiveStats(victim);
    const mental = effective.mental || 50;

    const maxLoss = 1.75;
    const minLoss = 0.75;
    const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);
    return this.damageRacer(victim, hpLoss, "kill");
  }

  _applySlowForShockV1S2(event) {
    const { racer1, racer2 } = event.data;
    const racers = [racer1, racer2].filter(Boolean);

    if (racers.length === 0) return [];

    console.log(
      `⚡ Aplicando slow_for_shock_v1s2 a: ${racers
        .map((r) => r.name)
        .join(", ")}`
    );

    racers.forEach((racer) => {
      racer.hasSlowedForShock = true;
      racer.permanentSlowdown += 2;
      console.log(
        `⚡ ${racer.name} ahora tiene hasSlowedForShock=true y permanentSlowdown=${racer.permanentSlowdown}`
      );
    });

    this._recalculatePositions();

    this._maintainShockSlowdownPositions();

    this._recalculatePositions();

    console.log(
      `⚡ Posiciones después de aplicar slow_for_shock: ${racers
        .map(
          (r) => `${r.name} (${r.position}º, timeGap: ${r.timeGap?.toFixed(2)})`
        )
        .join(", ")}`
    );

    return [];
  }

  _applySlowForItems(event) {
    const { racer } = event.data;
    racer.hasSlowedForItems = true;

    this._recalculatePositions();
    const sorted = [...this.racers].sort(
      (a, b) => (a.timeGap || 0) - (b.timeGap || 0)
    );
    const racerIn5thPosition = sorted[4];

    if (racerIn5thPosition) {
      const racerIn5thTimeGap = racerIn5thPosition.timeGap || 0;
      const currentRacerTimeGap = racer.timeGap || 0;
      const penaltyNeeded = Math.max(
        2,
        racerIn5thTimeGap - currentRacerTimeGap + 0.2
      );
      racer.timeGap += penaltyNeeded;
    } else {
      racer.timeGap += 2;
    }

    this._recalculatePositions();

    return [];
  }

  _applySlowForTeamDominance(event) {
    const { racer } = event.data;

    return [];
  }

  _applyShockFound(event) {
    const { racer } = event.data;
    racer.hasShock = true;
    this.shockAvailable = true;
    return [];
  }

  _applyBlueShellFound(event) {
    const { racer } = event.data;
    racer.hasBlueShell = true;
    this.blueShellAvailable = true;
    return [];
  }

  _applyBlueShellHeld(event) {
    const { racer } = event.data;
    racer.isHoldingBlue = true;
    racer.hasBlueShell = false;

    const currentLeader = this.racers.find((r) => r.position === 1);
    this.blueShellHolderLeader = currentLeader;

    return [];
  }

  _applyBlueShellUsed(event) {
    this.blueShellUsed = true;

    const { racer } = event.data || {};
    if (racer && racer.isHoldingBlue) {
      racer.isHoldingBlue = false;
      racer.hasBlueShell = false;
    }

    return [];
  }

  _applyBlueShellImpact(event) {
    const { victim, doubleDamage } = event.data;
    if (!victim) return [];

    victim.timeGap += 6;
    this.removeCoins(victim, 0);

    const baseHPLoss = 1.25;
    const effective = this.getEffectiveStats(victim);
    const mental = effective.mental || 50;

    const maxLoss = baseHPLoss * 2;
    const minLoss = baseHPLoss;
    let hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);

    if (doubleDamage) {
      hpLoss *= 2;
    }

    const numPositions = event.data?.numPositions || 2;
    this._dropPositions(victim, numPositions);

    return this.damageRacer(victim, hpLoss, "blue_shell");
  }

  _applyShockUsed(event) {
    const { shockUser, dodgers, victims } = event.data;

    if (shockUser) {
      shockUser.timeGap += 5;
    }

    this.racers.forEach((racer) => {
      if (racer.isHoldingBlue) {
        racer.isHoldingBlue = false;
      }
    });

    if (shockUser && shockUser.teamKey) {
      this.racers.forEach((racer) => {
        if (racer.teamKey !== shockUser.teamKey) {
          racer.timeGap += 0.5;
        }
      });
    }

    victims.forEach((victim) => {
      victim.timeGap += 10;

      const effective = this.getEffectiveStats(victim);
      const mental = effective.mental || 50;

      const maxLoss = 1.5;
      const minLoss = 0.5;
      let hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);

      if ([1, 10, 11, 12].includes(victim.position)) {
        const extraMaxLoss = 0.5;
        const extraMinLoss = 0.25;
        const extraHPLoss =
          extraMinLoss +
          ((100 - mental - 10) / 80) * (extraMaxLoss - extraMinLoss);
        hpLoss += extraHPLoss;
      }

      this.damageRacer(victim, hpLoss, "shock_used");
    });

    this.shockUsedThisRace = true;
    return [];
  }

  damageLowPositions() {
    this._recalculatePositions();

    const events = [];
    const lastRacer = this.racers.find((r) => r.position === 12);

    if (lastRacer) {
      const effective = this.getEffectiveStats(lastRacer);
      const mental = effective.mental || 50;

      const maxLoss = 0.75;
      const minLoss = 0.025;
      const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);

      const mentalEvents = this.damageRacer(lastRacer, hpLoss, "low_position");
      if (mentalEvents && mentalEvents.length > 0) {
        events.push(...mentalEvents);
      }
    }

    return events;
  }

  damageTopPositions() {
    this._recalculatePositions();

    const events = [];
    const firstRacer = this.racers.find((r) => r.position === 1);
    const secondRacer = this.racers.find((r) => r.position === 2);
    const thirdRacer = this.racers.find((r) => r.position === 3);

    if (firstRacer) {
      const effective = this.getEffectiveStats(firstRacer);
      const mental = effective.mental || 50;

      const maxLoss = 8;
      const minLoss = 4;

      const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);

      const finalLoss = Math.round(hpLoss * 10) / 10;

      const mentalEvents = this.damageRacer(
        firstRacer,
        finalLoss,
        "top_position"
      );
      if (mentalEvents && mentalEvents.length > 0) {
        events.push(...mentalEvents);
      }
    }

    if (secondRacer) {
      const effective = this.getEffectiveStats(secondRacer);
      const mental = effective.mental || 50;

      const maxLoss = 5;
      const minLoss = 2.5;

      const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);

      const finalLoss = Math.round(hpLoss * 10) / 10;

      const mentalEvents = this.damageRacer(
        secondRacer,
        finalLoss,
        "top_position"
      );
      if (mentalEvents && mentalEvents.length > 0) {
        events.push(...mentalEvents);
      }
    }

    if (thirdRacer) {
      const effective = this.getEffectiveStats(thirdRacer);
      const mental = effective.mental || 50;

      const maxLoss = 3;
      const minLoss = 1.5;

      const hpLoss = minLoss + ((100 - mental - 10) / 80) * (maxLoss - minLoss);

      const finalLoss = Math.round(hpLoss * 10) / 10;

      const mentalEvents = this.damageRacer(
        thirdRacer,
        finalLoss,
        "top_position"
      );
      if (mentalEvents && mentalEvents.length > 0) {
        events.push(...mentalEvents);
      }
    }

    return events;
  }

  _recalculatePositions() {
    const sorted = [...this.racers].sort(
      (a, b) => (a.timeGap || 0) - (b.timeGap || 0)
    );

    sorted.forEach((racer, index) => {
      racer.position = index + 1;
    });
  }

  getCurrentPositions() {
    this._recalculatePositions();

    const sorted = [...this.racers].sort((a, b) => a.position - b.position);

    const leader = sorted.find((r) => r.position === 1) || sorted[0];
    const leaderTime = leader ? leader.timeGap || 0 : 0;

    const result = sorted.map((racer) => {
      const timeGap =
        racer.position === 1
          ? 0
          : Math.max(0.1, (racer.timeGap || 0) - leaderTime);

      return {
        position: racer.position,
        name: racer.name,
        teamName: racer.teamName,
        teamTag: racer.teamTag,
        teamKey: racer.teamKey,
        timeGap: timeGap,
      };
    });

    return result;
  }

  getFinalResults() {
    this.racers.forEach((racer) => {
      const effective = this.getEffectiveStats(racer);
      const lines = effective.lines || 100;
      const consistency = effective.consistency || 50;
      const itemUsage = effective.itemUsage || 50;
      const gameSense = effective.gameSense || 50;

      const finalBonus =
        lines * 0.3 + consistency * 0.3 + itemUsage * 0.25 + gameSense * 0.25;

      const timeBonus = (-(finalBonus - 50) / 50) * 2;
      racer.timeGap = Math.max(0, racer.timeGap + timeBonus);
    });

    return this.getCurrentPositions();
  }
}

module.exports = RaceState;
