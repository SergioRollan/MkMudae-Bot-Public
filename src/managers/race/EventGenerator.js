class EventGenerator {
  constructor() {}

  generateSectorEvents({ lap, sectorNum, sectorType, raceState, raceNumber }) {
    const events = [];

    const positionsBefore = raceState.positionsBeforeSector || [];

    if (!(lap === 1 && sectorNum === 1) && positionsBefore.length > 0) {
      const overtakeEvents = this._detectOvertakes(raceState, positionsBefore);
      events.push(...overtakeEvents);
    }

    const escapeEvent = this._detectEscape(raceState);
    if (escapeEvent) {
      events.push(escapeEvent);
    }

    if (sectorType === "Shortcuts") {
      const shortcutEvents = this._generateShortcutOvertakes(
        lap,
        raceState,
        sectorType
      );
      events.push(...shortcutEvents);
    }

    if (
      sectorType === "Technical" ||
      sectorType === "Balanced" ||
      sectorType === "Coins"
    ) {
      const shortcutEvents = this._generateShortcutOvertakes(
        lap,
        raceState,
        sectorType
      );
      events.push(...shortcutEvents);
    }

    if (sectorType === "Technical") {
      const fallEvents = this._generateTechnicalFalls(raceState);
      events.push(...fallEvents);
    }

    if (lap >= 1 && sectorNum >= 1) {
      const teamkillEvent = this._generateTeamkill(raceState);
      if (teamkillEvent) {
        events.push(teamkillEvent);
      }
    }

    if (lap >= 1 && sectorNum >= 1) {
      const killEvents = this._generateKills(raceState);
      events.push(...killEvents);
    }

    let slowForShockEvent = null;
    if (lap === 1 && sectorNum === 2) {
      console.log(`⚡ Generando slow_for_shock_v1s2 en v1s2`);
      slowForShockEvent = this._generateSlowForShockV1S2(raceState);
      if (slowForShockEvent) {
        console.log(
          `⚡ Evento slow_for_shock_v1s2 generado y añadido a events`
        );
        events.push(slowForShockEvent);
      } else {
        console.log(`⚡ Evento slow_for_shock_v1s2 NO generado (retornó null)`);
      }
    }

    if (lap === 1 && sectorNum >= 3) {
      const slowForDominanceEvent =
        this._generateSlowForTeamDominance(raceState);
      if (slowForDominanceEvent) {
        events.push(slowForDominanceEvent);
      }
    }

    if (
      (lap === 1 && sectorNum >= 3) ||
      lap === 2 ||
      (lap === 3 && sectorNum <= 1)
    ) {
      if (!raceState.shockAvailable) {
        const shockEvent = this._generateRandomShock(lap, sectorNum, raceState);
        if (shockEvent) {
          events.push(shockEvent);
        }
      }
    }

    if (lap === 3 && sectorNum === 2 && !raceState.shockAvailable) {
      events.push({
        type: "no_shock_found",
        stringKey: "race_event_no_shock_found",
        data: {},
      });
    }

    if (
      (lap === 1 && sectorNum >= 3) ||
      lap === 2 ||
      (lap === 3 && sectorNum <= 3)
    ) {
      const heldBlueShellUsedEvent = this._generateHeldBlueShellUsed(
        lap,
        sectorNum,
        raceState
      );
      if (heldBlueShellUsedEvent) {
        events.push(heldBlueShellUsedEvent);
      }
    }

    if (lap === 3 && raceState.shockAvailable && !raceState.shockUsedThisRace) {
      const shockUsedEvent = this._generateShockUsed(lap, sectorNum, raceState);
      if (shockUsedEvent) {
        events.push(shockUsedEvent);
      }
    }

    if (lap <= 2 && sectorNum <= 2) {
      const slowForItemsEvents = this._generateSlowForItems(
        lap,
        sectorNum,
        raceState,
        slowForShockEvent
      );
      events.push(...slowForItemsEvents);
    }

    return events;
  }

  _detectOvertakes(raceState, positionsBefore) {
    const events = [];
    const overtakes = [];

    const sortedBefore = [...positionsBefore].sort(
      (a, b) => a.position - b.position
    );

    raceState.racers.forEach((currentRacer) => {
      const before = positionsBefore.find((p) => p.racer === currentRacer);
      if (!before) return;

      const currentPos = currentRacer.position;
      const beforePos = before.position;

      if (currentPos < beforePos) {
        const overtakenBefore = positionsBefore.find(
          (p) => p.position === currentPos
        );
        if (overtakenBefore && overtakenBefore.racer !== currentRacer) {
          const overtaken = overtakenBefore.racer;

          if (!overtaken.hasOvertakenThisSector) {
            overtakes.push({
              overtaker: currentRacer,
              overtaken: overtaken,
            });
          }
        }
      }
    });

    const halfOvertakes = Math.ceil(overtakes.length / 2);
    const selectedOvertakes = overtakes.slice(0, halfOvertakes);

    if (selectedOvertakes.length >= 3) {
      events.push({
        type: "multiple_overtakes",
        stringKey: "race_event_multiple_overtakes",
        data: {
          count: selectedOvertakes.length,
        },
      });
    } else if (
      selectedOvertakes.length === 1 ||
      selectedOvertakes.length === 2
    ) {
      selectedOvertakes.forEach(({ overtaker, overtaken }) => {
        events.push({
          type: "overtake",
          stringKey: "race_event_overtake_by_lines",
          data: {
            overtaker,
            overtaken,
            overtakerPos: overtaker.position,
            overtakenPos: overtaken.position,
          },
        });
      });
    }

    return events;
  }

  _detectEscape(raceState) {
    if (raceState.escapeMessageShown) return null;

    const sorted = [...raceState.racers].sort((a, b) => a.timeGap - b.timeGap);
    const leader = sorted[0];
    const second = sorted[1];

    if (!leader || !second) return null;

    const gap = second.timeGap - leader.timeGap;
    if (gap > 2.0) {
      raceState.escapeMessageShown = true;
      return {
        type: "escape",
        stringKey: "race_event_escape_from_second",
        data: {
          racer: leader,
          gap: gap.toFixed(1),
        },
      };
    }

    return null;
  }

  _generateShortcutOvertakes(lap, raceState, sectorType) {
    const events = [];
    const shortcutTakers = [];

    const racersOutsideTop3 = raceState.racers.filter(
      (r) => r.position > 3 && !r.isHoldingBlue
    );

    racersOutsideTop3.forEach((racer) => {
      const effective = raceState.getEffectiveStats(racer);
      const itemUsage = effective.itemUsage || 50;

      const divisor = lap === 1 ? 3 : lap === 2 ? 2 : 1;
      let baseProbability = Math.min(100, itemUsage / divisor);

      if (sectorType === "Shortcuts") {
        baseProbability = baseProbability * 1.5 * 2;
      } else if (
        sectorType === "Technical" ||
        sectorType === "Balanced" ||
        sectorType === "Coins"
      ) {
        baseProbability = baseProbability * 0.75;
      }

      const probability = Math.min(100, baseProbability);

      if (Math.random() * 100 < probability) {
        shortcutTakers.push(racer);
      }
    });

    const shortcutData = shortcutTakers.map((racer) => {
      const numPositions = 1 + Math.floor(Math.random() * 3);

      const targetPos = racer.position - numPositions;
      const overtaken = raceState.racers.find((r) => r.position === targetPos);

      const finalPosition = Math.max(1, racer.position - numPositions);

      return {
        overtaker: racer,
        overtaken: overtaken || null,
        numPositions,
        overtakerPos: finalPosition,
        overtakenPos: overtaken ? overtaken.position : null,
      };
    });

    const halfShortcuts = Math.ceil(shortcutData.length / 2);
    const selectedShortcutData = shortcutData.slice(0, halfShortcuts);
    const hiddenShortcutData = shortcutData.slice(halfShortcuts);

    if (selectedShortcutData.length >= 3) {
      events.push({
        type: "multiple_shortcut_overtakes",
        stringKey: "race_event_multiple_shortcut_overtakes",
        data: {
          count: selectedShortcutData.length,
          shortcuts: shortcutData,
        },
      });
    } else {
      selectedShortcutData.forEach((data) => {
        events.push({
          type: "shortcut_overtake",
          stringKey: "race_event_shortcut_overtake",
          data: data,
        });
      });

      hiddenShortcutData.forEach((data) => {
        events.push({
          type: "shortcut_overtake_hidden",
          stringKey: "race_event_shortcut_overtake",
          data: data,
        });
      });
    }

    return events;
  }

  _generateTechnicalFalls(raceState) {
    const events = [];
    const allRacers = [...raceState.racers];

    const consistencyValues = allRacers.map((r) => {
      const effective = raceState.getEffectiveStats(r);
      return effective.consistency || 50;
    });

    const totalInverted = allRacers.reduce((sum, racer) => {
      const effective = raceState.getEffectiveStats(racer);
      const consistency = effective.consistency || 50;
      const inverted = 100 - consistency;
      const isTop3 = racer.position <= 3;
      return sum + (isTop3 ? inverted * 2 : inverted);
    }, 0);

    const probabilities = allRacers.map((racer) => {
      const effective = raceState.getEffectiveStats(racer);
      const consistency = effective.consistency || 50;
      const isTop3 = racer.position <= 3;

      let prob = (100 - consistency) / totalInverted;
      if (isTop3) {
        prob *= 2;
      }

      return { racer, probability: prob };
    });

    const totalProb = probabilities.reduce((sum, p) => sum + p.probability, 0);
    probabilities.forEach((p) => {
      p.probability = (p.probability / totalProb) * 150;
    });

    probabilities.sort((a, b) => b.probability - a.probability);

    const roll1 = Math.random() * 100 + 1;
    const roll2 = Math.random() * 100 + 101;

    let accumulated = 0;
    let fallen1 = null;
    let fallen2 = null;

    const roll1Mapped = ((roll1 - 1) / 100) * 150;

    for (const { racer, probability } of probabilities) {
      accumulated += probability;
      if (roll1Mapped <= accumulated && !fallen1) {
        fallen1 = racer;
        break;
      }
    }

    accumulated = 0;
    const roll2Mapped = ((roll2 - 101) / 100) * 150;

    for (const { racer, probability } of probabilities) {
      accumulated += probability;
      if (roll2Mapped <= accumulated && !fallen2) {
        fallen2 = racer;
        break;
      }
    }

    if (fallen1) {
      events.push({
        type: "technical_fall",
        stringKey: "race_event_technical_fall",
        data: { racer: fallen1, position: fallen1.position },
      });
    }

    if (fallen2 && fallen2 !== fallen1) {
      events.push({
        type: "technical_fall",
        stringKey: "race_event_technical_fall",
        data: { racer: fallen2, position: fallen2.position },
      });
    }

    return events;
  }

  _generateTeamkill(raceState) {
    if (Math.random() * 100 < 60) {
      return null;
    }

    const racersInRange = raceState.getRacersInPositionRange(2, 9);
    if (racersInRange.length === 0) return null;

    const candidates = [];
    racersInRange.forEach((attacker) => {
      raceState.racers.forEach((victim) => {
        if (
          victim.teamKey === attacker.teamKey &&
          victim !== attacker &&
          Math.abs(victim.position - attacker.position) === 2
        ) {
          candidates.push({ attacker, victim });
        }
      });
    });

    if (candidates.length === 0) return null;

    const communicationValues = candidates.map((c) => {
      const effective = raceState.getEffectiveStats(c.attacker);
      return effective.communication || 50;
    });
    const totalCommunication = communicationValues.reduce(
      (sum, c) => sum + c,
      0
    );

    const probabilities = candidates.map((candidate, index) => {
      const effective = raceState.getEffectiveStats(candidate.attacker);
      const communication = effective.communication || 50;
      const prob = (100 - communication) / totalCommunication;

      return { ...candidate, probability: prob, result: Math.random() };
    });

    probabilities.sort((a, b) => b.result - a.result);

    const topResult = probabilities[0].result;
    const topCandidates = probabilities.filter((p) => p.result === topResult);
    const selected =
      topCandidates[Math.floor(Math.random() * topCandidates.length)];

    return {
      type: "teamkill",
      stringKey: "race_event_teamkill",
      data: {
        attacker: selected.attacker,
        victim: selected.victim,
        attackerPos: selected.attacker.position,
        victimPos: selected.victim.position,
      },
    };
  }

  _generateKills(raceState) {
    const events = [];
    const racersInRange = raceState
      .getRacersInPositionRange(2, 9)
      .filter((r) => !r.isHoldingBlue);
    const attemptsByAttacker = new Map();

    racersInRange.forEach((attacker) => {
      const effective = raceState.getEffectiveStats(attacker);
      const precision = effective.precision || 50;

      const victims = raceState.racers.filter(
        (v) =>
          v.teamKey !== attacker.teamKey && v.position >= 1 && v.position <= 9
      );

      const attackerAttempts = [];

      victims.forEach((victim) => {
        const attackerPos = attacker.position || 12;
        const victimPos = victim.position || 12;
        const positionDiff = Math.abs(victimPos - attackerPos);

        if (positionDiff > 2) {
          return;
        }

        const attackerTime = attacker.timeGap || 0;
        const victimTime = victim.timeGap || 0;
        const timeDiff = Math.abs(victimTime - attackerTime);

        if (timeDiff > 3) {
          return;
        }

        const victimEffective = raceState.getEffectiveStats(victim);
        const gameSense = victimEffective.gameSense || 50;

        let precisionMultiplier = 1.0;
        if (victimPos === attackerPos - 1) {
          precisionMultiplier = 1.3;
        }
        const adjustedPrecision = precision * precisionMultiplier;

        const probability = Math.max(0, adjustedPrecision * 1.6 - gameSense);

        attackerAttempts.push({
          attacker,
          victim,
          probability,
          precisionMultiplier,
        });
      });

      attackerAttempts.sort((a, b) => b.probability - a.probability);
      attemptsByAttacker.set(attacker, attackerAttempts.slice(0, 2));
    });

    const allAttempts = [];
    attemptsByAttacker.forEach((attempts) => {
      allAttempts.push(...attempts);
    });

    allAttempts.sort((a, b) => b.probability - a.probability);

    const selectedAttempts = [];
    const attemptsByAttackerCount = new Map();
    const attemptsByVictimCount = new Map();

    for (const attempt of allAttempts) {
      const attackerCount = attemptsByAttackerCount.get(attempt.attacker) || 0;
      const victimCount = attemptsByVictimCount.get(attempt.victim) || 0;

      if (selectedAttempts.length < 4 && attackerCount < 2 && victimCount < 2) {
        selectedAttempts.push(attempt);
        attemptsByAttackerCount.set(attempt.attacker, attackerCount + 1);
        attemptsByVictimCount.set(attempt.victim, victimCount + 1);
      }
    }

    const halfAttempts = Math.ceil(selectedAttempts.length / 2);
    const attemptsToShow = selectedAttempts.slice(0, halfAttempts);
    const attemptsToHide = selectedAttempts.slice(halfAttempts);

    selectedAttempts.forEach((attempt, index) => {
      const shouldShow = index < halfAttempts;

      const roll = Math.random() * 100;
      const hit = roll < attempt.probability;

      if (hit) {
        let stringKey = "race_event_kill";
        if (attempt.precisionMultiplier === 1.3 && Math.random() < 0.3) {
          stringKey = "race_event_kill_red_shell";
        }

        if (shouldShow) {
          events.push({
            type: "kill",
            stringKey: stringKey,
            data: {
              attacker: attempt.attacker,
              victim: attempt.victim,
              attackerPos: attempt.attacker.position,
              victimPos: attempt.victim.position,
            },
          });
        } else {
          events.push({
            type: "kill_hidden",
            stringKey: stringKey,
            data: {
              attacker: attempt.attacker,
              victim: attempt.victim,
              attackerPos: attempt.attacker.position,
              victimPos: attempt.victim.position,
            },
          });
        }
      } else {
        if (shouldShow) {
          events.push({
            type: "kill_attempt",
            stringKey: "race_event_kill_attempt_failed",
            data: {
              attacker: attempt.attacker,
              victim: attempt.victim,
              attackerPos: attempt.attacker.position,
              victimPos: attempt.victim.position,
            },
          });
        }
      }
    });

    return events;
  }

  _generateSlowForShockV1S2(raceState) {
    raceState._recalculatePositions();

    const deadRacers = raceState.racers.filter((r) => r.hasDied);

    const allTeams = {};
    raceState.racers.forEach((racer) => {
      if (!allTeams[racer.teamKey]) {
        allTeams[racer.teamKey] = [];
      }
      allTeams[racer.teamKey].push(racer);
    });

    const selectedRacers = [];
    const teamKeys = Object.keys(allTeams);

    teamKeys.forEach((teamKey) => {
      const teamRacers = allTeams[teamKey];
      const teamDead = teamRacers.filter((r) => r.hasDied);

      if (teamDead.length > 0) {
        teamDead.sort((a, b) => {
          const aEffective = raceState.getEffectiveStats(a);
          const bEffective = raceState.getEffectiveStats(b);
          return (
            (bEffective.shockFinding || 0) - (aEffective.shockFinding || 0)
          );
        });
        selectedRacers.push(teamDead[0]);
      } else {
        teamRacers.sort((a, b) => {
          const posDiff = (b.position || 12) - (a.position || 12);
          if (posDiff !== 0) return posDiff;

          return (b.timeGap || 0) - (a.timeGap || 0);
        });
        selectedRacers.push(teamRacers[0]);
      }
    });

    if (selectedRacers.length === 0) {
      console.log(`⚡ _generateSlowForShockV1S2: No se seleccionaron racers`);
      return null;
    }

    const racer1 = selectedRacers[0] || null;
    const racer2 = selectedRacers[1] || null;

    console.log(
      `⚡ _generateSlowForShockV1S2: Seleccionados - racer1: ${racer1?.name} (${racer1?.position}º, equipo ${racer1?.teamKey}), racer2: ${racer2?.name} (${racer2?.position}º, equipo ${racer2?.teamKey})`
    );

    return {
      type: "slow_for_shock_v1s2",
      stringKey: "race_event_slow_for_shock_v1s2",
      data: {
        racer1,
        racer2,
      },
    };
  }

  _generateSlowForItems(lap, sectorNum, raceState, slowForShockEvent = null) {
    const events = [];

    if (lap === 2 && sectorNum > 2) return events;
    if (lap > 2) return events;

    const racersSlowingForShock = new Set();
    if (slowForShockEvent && slowForShockEvent.data) {
      if (slowForShockEvent.data.racer1) {
        racersSlowingForShock.add(slowForShockEvent.data.racer1);
      }
      if (slowForShockEvent.data.racer2) {
        racersSlowingForShock.add(slowForShockEvent.data.racer2);
      }
    }

    const deadRacers = raceState.racers.filter(
      (r) =>
        r.hasDied &&
        !r.hasSlowedForItems &&
        !r.hasSlowedForShock &&
        !racersSlowingForShock.has(r)
    );

    const racersByTeam = {};
    deadRacers.forEach((racer) => {
      if (!racersByTeam[racer.teamKey]) {
        racersByTeam[racer.teamKey] = [];
      }
      racersByTeam[racer.teamKey].push(racer);
    });

    Object.keys(racersByTeam).forEach((teamKey) => {
      const teamRacers = racersByTeam[teamKey];
      const candidates = [];

      teamRacers.forEach((racer) => {
        const effective = raceState.getEffectiveStats(racer);
        const itemUsage = effective.itemUsage || 50;
        const gameSense = effective.gameSense || 50;

        const itemFactor = (itemUsage - 10) / 80;
        const gameSenseFactor = (gameSense - 10) / 80;
        const avgFactor = (itemFactor + gameSenseFactor) / 2;
        const probability = 5 + avgFactor * 45;

        candidates.push({
          racer,
          probability,
          roll: Math.random() * 100,
        });
      });

      candidates.sort((a, b) => {
        const aPassed = a.roll < a.probability;
        const bPassed = b.roll < b.probability;
        if (aPassed !== bPassed) return bPassed - aPassed;
        return b.probability - a.probability;
      });

      let selected = 0;
      const teamEvents = [];
      candidates.forEach((candidate) => {
        if (selected < 2 && candidate.roll < candidate.probability) {
          teamEvents.push({
            type: "slow_for_items",
            stringKey: "race_event_slow_for_items",
            data: { racer: candidate.racer },
          });
          selected++;
        }
      });

      const halfSlowForItems = Math.ceil(teamEvents.length / 2);
      const selectedSlowForItems = teamEvents.slice(0, halfSlowForItems);
      const hiddenSlowForItems = teamEvents.slice(halfSlowForItems);

      events.push(...selectedSlowForItems);
      hiddenSlowForItems.forEach((event) => {
        events.push({
          ...event,
          type: "slow_for_items_hidden",
        });
      });
    });

    return events;
  }

  _generateSlowForTeamDominance(raceState) {
    const top3 = raceState.racers
      .filter((r) => r.position <= 3)
      .sort((a, b) => a.position - b.position);

    if (top3.length < 3) return null;

    const teamKeys = [...new Set(top3.map((r) => r.teamKey))];
    if (teamKeys.length > 1) return null;

    const dominantTeam = teamKeys[0];

    const otherTeamRacers = raceState.racers.filter(
      (r) =>
        r.teamKey !== dominantTeam &&
        r.position >= 4 &&
        r.position <= 9 &&
        !r.hasSlowedForItems &&
        !r.hasSlowedForShock
    );

    if (otherTeamRacers.length === 0) return null;

    const selected = otherTeamRacers.sort((a, b) => b.position - a.position)[0];

    return {
      type: "slow_for_team_dominance",
      stringKey: "race_event_slow_for_team_dominance",
      data: {
        racer: selected,
        targetPosition: 10,
      },
    };
  }

  _generateRandomShock(lap, sectorNum, raceState) {
    if (raceState.shockAvailable) return null;

    if (lap === 1 && sectorNum < 3) return null;
    if (lap === 3 && sectorNum > 1) return null;

    if (Math.random() * 100 >= 18) return null;

    const pos10 = raceState.racers.find((r) => r.position === 10);
    const pos11 = raceState.racers.find((r) => r.position === 11);
    const pos12 = raceState.racers.find((r) => r.position === 12);

    const candidates = [pos10, pos11, pos12].filter(Boolean);

    if (candidates.length === 0) return null;

    const probabilities = candidates.map((racer) => {
      const effective = raceState.getEffectiveStats(racer);
      let shockFinding = effective.shockFinding || 50;

      if (racer.position === 10) {
        if (racer.hasSlowedForShock || racer.hasSlowedForItems) {
          shockFinding *= 0.4;
        } else {
          shockFinding = 0;
        }
      }

      return { racer, shockFinding };
    });

    const total = probabilities.reduce((sum, p) => sum + p.shockFinding, 0);
    if (total === 0) return null;

    probabilities.forEach((p) => {
      p.probability = (p.shockFinding / total) * 100;
    });

    const roll = Math.random() * 100;
    let accumulated = 0;
    let selected = null;

    for (const { racer, probability } of probabilities) {
      accumulated += probability;
      if (roll <= accumulated) {
        selected = racer;
        break;
      }
    }

    if (!selected) selected = probabilities[0].racer;

    raceState.shockFoundInLap = lap;
    raceState.shockFoundInSector = sectorNum;

    return {
      type: "shock_found",
      stringKey: "race_event_shock_found_random",
      data: {
        racer: selected,
      },
    };
  }

  _generateRandomBlueShell(lap, sectorNum, raceState) {
    if (lap === 1 && sectorNum < 3) return null;
    if (lap === 3 && sectorNum > 2) return null;

    if (
      raceState.blueShellAvailable &&
      !(
        lap === 3 &&
        sectorNum === 2 &&
        raceState.blueShellFoundInSector === 1 &&
        sectorNum === 3
      )
    ) {
      return null;
    }

    if (Math.random() * 100 >= 25) return null;

    const candidates = raceState.racers.filter(
      (r) => r.position >= 6 && r.position <= 9 && !r.isHoldingBlue
    );

    if (candidates.length === 0) return null;

    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    const leader = raceState.racers.find((r) => r.position === 1);
    const sameTeam = leader && leader.teamKey === selected.teamKey;

    raceState.blueShellAvailable = true;
    raceState.blueShellFoundInSector = sectorNum;

    if (sameTeam) {
      return {
        type: "blue_shell_held",
        stringKey: "race_event_blue_shell_held",
        data: {
          racer: selected,
          leader,
          position: selected.position,
        },
      };
    } else {
      return {
        type: "blue_shell_used",
        stringKey: "race_event_blue_shell_used_instant",
        data: {
          racer: selected,
          leader,
          instantUse: true,
          position: selected.position,
        },
      };
    }
  }

  _generateHeldBlueShellUsed(lap, sectorNum, raceState) {
    if (raceState.blueShellUsed) return null;
    if (!raceState.blueShellAvailable) return null;

    const blueShellHolder = raceState.racers.find((r) => r.isHoldingBlue);
    if (!blueShellHolder) return null;

    const leader = raceState.racers.find((r) => r.position === 1);
    if (!leader) return null;

    if (leader === blueShellHolder) {
      return null;
    }

    const sameTeam = leader.teamKey === blueShellHolder.teamKey;
    if (sameTeam) {
      return null;
    }

    raceState.pendingBlueShellImpact = {
      victim: leader,
      thrower: blueShellHolder,
    };

    raceState.blueShellUsed = true;

    return {
      type: "blue_shell_used",
      stringKey: "race_event_blue_shell_used_held",
      data: {
        racer: blueShellHolder,
        leader,
        instantUse: false,
        position: blueShellHolder.position,
      },
    };
  }

  _generateShockUsed(lap, sectorNum, raceState) {
    if (lap !== 3) return null;
    if (!raceState.shockAvailable) return null;
    if (raceState.shockUsedThisRace) return null;

    if (
      raceState.shockFoundInLap === 3 &&
      raceState.shockFoundInSector === 1 &&
      sectorNum === 1
    ) {
      return null;
    }

    let useProbability = 0.5;

    if (sectorNum === 3) {
      useProbability = 1.0;
    } else if (sectorNum === 2) {
      useProbability = 0.5;
    } else {
      useProbability = 0.0;
    }

    if (Math.random() > useProbability) return null;

    const shockHolder = raceState.racers.find((r) => r.hasShock);
    if (!shockHolder) return null;

    const targets = raceState.racers.filter(
      (r) =>
        r.position >= 1 &&
        r.position <= 12 &&
        r !== shockHolder &&
        !r.isHoldingBlue
    );

    const dodgers = [];
    const victims = [];

    targets.forEach((target) => {
      if (target.position === 1) {
        victims.push(target);
        return;
      }

      const effective = raceState.getEffectiveStats(target);
      const itemUsage = effective.itemUsage || 50;
      const gameSense = effective.gameSense || 50;
      const sameTeam = target.teamKey === shockHolder.teamKey;

      let dodgeProbability;

      if (sameTeam) {
        const baseProb = 25 + ((itemUsage - 10) / 80) * 40;
        const positionBonus = (target.position - 1) * 2;
        dodgeProbability = Math.min(100, baseProb + positionBonus);
      } else {
        const itemFactor = (itemUsage - 10) / 80;
        const gameSenseFactor = (gameSense - 10) / 80;
        const avgFactor = (itemFactor + gameSenseFactor) / 2;
        const baseProb = 5 + avgFactor * 30;
        const positionBonus = (target.position - 1) * 1;
        dodgeProbability = Math.min(100, baseProb + positionBonus);
      }

      if (Math.random() * 100 < dodgeProbability) {
        dodgers.push(target);
      } else {
        victims.push(target);
      }
    });

    return {
      type: "shock_used",
      stringKey: "race_event_shock_used",
      data: {
        shockUser: shockHolder,
        dodgers,
        victims,
      },
    };
  }

  _getEffectiveStats(racer, raceState) {
    return raceState.getEffectiveStats(racer);
  }
}

module.exports = EventGenerator;
