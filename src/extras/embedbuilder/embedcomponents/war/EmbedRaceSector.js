const { EmbedBuilder } = require("discord.js");
const LanguageManager = require("../../../../managers/LanguageManager");
const IEmbed = require("../../IEmbed");

class EmbedRaceSector extends IEmbed {
  constructor({ lap, sectorNum, events, positions, guildId, guildLocale }) {
    super();
    this.lap = lap;
    this.sectorNum = sectorNum;
    this.events = events || [];
    this.positions = positions || [];
    this.guildId = guildId;
    this.guildLocale = guildLocale;
    this.langManager = LanguageManager.getInstance();
  }

  build() {
    const title =
      this.sectorNum === null
        ? this.langManager.getString(
            this.guildId,
            "race_lap_title",
            {
              lap: this.lap,
            },
            this.guildLocale
          ) || `🏁 Vuelta ${this.lap}`
        : this.langManager.getString(
            this.guildId,
            "race_sector_title",
            {
              lap: this.lap,
              sector: this.sectorNum,
            },
            this.guildLocale
          );

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(0x3498db)
      .setTimestamp();

    if (this.events.length > 0) {
      const eventsText = this.events
        .map((event) => this._formatEvent(event))
        .filter(Boolean)
        .join("\n");

      if (eventsText) {
        embed.setDescription(eventsText);
      }
    }

    if (this.positions.length > 0) {
      const positionsTitle = this.langManager.getString(
        this.guildId,
        "race_sector_positions_title",
        {},
        this.guildLocale
      );

      const positionsText = this.positions
        .slice(0, 12)
        .map((pos) => this._formatPosition(pos))
        .filter(Boolean)
        .join("\n");

      if (positionsText) {
        embed.addFields({
          name: positionsTitle,
          value: positionsText || "—",
          inline: false,
        });
      }
    }

    return embed;
  }

  _formatEvent(event) {
    if (!event || !event.stringKey) {
      console.log("⚠️ EmbedRaceSector: Evento sin stringKey");
      return null;
    }

    const params = this._getEventParams(event);

    let eventText = this.langManager.getString(
      this.guildId,
      event.stringKey,
      params,
      this.guildLocale
    );

    if (event.type === "shock_used") {
      if (params.dodgersList && params.dodgersList.length > 0) {
        const dodgersText = this.langManager.getString(
          this.guildId,
          "race_event_shock_used_dodgers",
          { dodgersList: params.dodgersList },
          this.guildLocale
        );
        eventText += ` ${dodgersText}`;
      } else {
        const noDodgersText = this.langManager.getString(
          this.guildId,
          "race_event_shock_used_no_dodgers",
          {},
          this.guildLocale
        );
        eventText += ` ${noDodgersText}`;
      }
    }

    return eventText;
  }

  _getEventParams(event) {
    const data = event.data || {};
    const params = {};
    params.overtaken_text_text = "";

    if (data.racer) {
      params.racer = data.racer.name || "Unknown";
    }

    if (data.overtaker) {
      params.overtaker = data.overtaker.name || "Unknown";
    }

    if (data.overtaken) {
      params.overtaken = data.overtaken.name || "Unknown";
    }

    if (data.attacker) {
      params.attacker = data.attacker.name || "Unknown";
    }

    if (data.victim) {
      params.victim = data.victim.name || "Unknown";
    }

    if (data.shockUser) {
      params.shockUser = data.shockUser.name || "Unknown";
      params.team =
        data.shockUser.teamTag || data.shockUser.teamName || "Unknown";
    }

    if (data.thrower) {
      params.thrower = data.thrower.name || "Unknown";
    }

    if (data.numPositions !== undefined) {
      params.numPositions = data.numPositions;
    }

    if (data.count !== undefined) {
      params.count = data.count;
    }

    if (data.gap !== undefined) {
      params.gap = data.gap;
    }

    if (data.position !== undefined) {
      params.position = data.position;
    }

    if (data.overtakerPos !== undefined) {
      params.overtakerPos = data.overtakerPos;
    }
    if (data.overtakenPos !== undefined) {
      params.overtakenPos = data.overtakenPos;
    }
    if (data.attackerPos !== undefined) {
      params.attackerPos = data.attackerPos;
    }
    if (data.victimPos !== undefined) {
      params.victimPos = data.victimPos;
    }

    if (data.racer1) {
      params.racer1 = data.racer1.name || "Unknown";
    }

    if (data.racer2) {
      params.racer2 = data.racer2.name || "Unknown";
    }

    if (event.type === "slow_for_shock_v1s2") {
      if (data.racer1 && params.racer1) {
        if (data.racer2 && params.racer2 && params.racer2 !== "Unknown") {
          const conjunction =
            this.guildLocale === "en"
              ? "and"
              : this.guildLocale === "fr"
              ? "et"
              : "y";
          params.racers_text = `${params.racer1} ${conjunction} ${params.racer2}`;
        } else {
          params.racers_text = params.racer1;
        }
      } else {
        params.racers_text = "";
      }
    }

    if (data.leader) {
      params.leader = data.leader.name || "Unknown";
    }

    if (data.doubleDamage !== undefined) {
      params.doubleDamage = data.doubleDamage;
    }

    if (data.dodgers && Array.isArray(data.dodgers)) {
      params.dodgersList = data.dodgers
        .map((r) => r.name || "Unknown")
        .join(", ");
      params.dodgersCount = data.dodgers.length;
    }

    if (data.victims && Array.isArray(data.victims)) {
      params.victimsList = data.victims
        .map((r) => r.name || "Unknown")
        .join(", ");
      params.victimsCount = data.victims.length;
    }

    if (
      data.protectedRacers &&
      Array.isArray(data.protectedRacers) &&
      data.protectedRacers.length > 0
    ) {
      params.protectedList = data.protectedRacers
        .map((r) => r.name || "Unknown")
        .join(", ");
      params.protectedCount = data.protectedRacers.length;
    }

    return params;
  }

  _formatPosition(pos) {
    if (!pos) {
      return null;
    }

    const position = pos.position || 0;
    const name = pos.name || "Unknown";
    const teamName = pos.teamTag || pos.teamName || "";
    const gap = pos.timeGap || 0;

    if (position === 1) {
      return this.langManager.getString(
        this.guildId,
        "race_sector_position_leader",
        {
          position,
          teamName,
          name,
        },
        this.guildLocale
      );
    }

    return this.langManager.getString(
      this.guildId,
      "race_sector_position_line",
      {
        position,
        teamName,
        name,
        gap: gap.toFixed(1),
      },
      this.guildLocale
    );
  }
}

module.exports = EmbedRaceSector;
