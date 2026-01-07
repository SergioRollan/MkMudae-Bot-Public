const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarRaceOverview extends IEmbed {
  constructor({
    type,
    raceNumber,
    standings = [],
    challengerTeamName,
    opponentTeamName,
    challengerRacePoints = 0,
    opponentRacePoints = 0,
    challengerTotalPoints = 0,
    opponentTotalPoints = 0,
    showOverallLead = true,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.raceNumber = raceNumber;
    this.standings = standings;
    this.challengerTeamName = challengerTeamName;
    this.opponentTeamName = opponentTeamName;
    this.challengerRacePoints = challengerRacePoints;
    this.opponentRacePoints = opponentRacePoints;
    this.challengerTotalPoints = challengerTotalPoints;
    this.opponentTotalPoints = opponentTotalPoints;
    this.showOverallLead = showOverallLead;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const titleKey =
      this.raceNumber <= 11
        ? "war_race_provisional_title"
        : "war_race_overall_title";
    const title = lang.getString(
      this.guildId,
      titleKey,
      { race: this.raceNumber },
      this.guildLocale
    );

    let color;
    if (this.type === WarType.WAR) {
      color = 0x9b59b6;
    } else if (this.type === WarType.SCRIM) {
      color = 0x16a085;
    } else if (this.type === WarType.TOURNAMENTWAR) {
      color = 0x9b59b6;
    } else {
      color = 0x16a085;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();

    const lines =
      this.standings.length > 0
        ? this.standings
            .map((entry) =>
              lang.getString(
                this.guildId,
                "war_race_overall_line",
                {
                  position: entry.displayRank || 0,
                  name: entry.name,
                  team: entry.teamName,
                  points: (entry.totalPoints || 0).toLocaleString(),
                },
                this.guildLocale
              )
            )
            .join("\n")
        : lang.getString(
            this.guildId,
            "war_race_overall_empty",
            {},
            this.guildLocale
          );

    const raceDiff = this.challengerRacePoints - this.opponentRacePoints;
    const leadLine =
      raceDiff === 0
        ? lang.getString(
            this.guildId,
            "war_race_result_points_tie",
            {},
            this.guildLocale
          )
        : lang.getString(
            this.guildId,
            "war_race_result_points_lead",
            {
              team:
                raceDiff > 0 ? this.challengerTeamName : this.opponentTeamName,
              points: Math.abs(raceDiff).toLocaleString(),
            },
            this.guildLocale
          );

    const totalSummary = lang.getString(
      this.guildId,
      "war_race_result_points_total",
      {
        challenger: this.challengerTeamName,
        challengerTotal: this.challengerTotalPoints.toLocaleString(),
        opponentTotal: this.opponentTotalPoints.toLocaleString(),
        opponent: this.opponentTeamName,
      },
      this.guildLocale
    );

    let overallLeadLine = null;
    const overallDiff = this.challengerTotalPoints - this.opponentTotalPoints;
    if (this.showOverallLead && overallDiff !== 0) {
      overallLeadLine = lang.getString(
        this.guildId,
        "war_race_result_overall_lead",
        {
          team:
            overallDiff > 0 ? this.challengerTeamName : this.opponentTeamName,
          points: Math.abs(overallDiff).toLocaleString(),
        },
        this.guildLocale
      );
    }

    const summaryLines = [leadLine, totalSummary];
    if (overallLeadLine) {
      summaryLines.push(overallLeadLine);
    }

    const fieldName =
      this.raceNumber <= 11
        ? "\u200b"
        : lang.getString(
            this.guildId,
            "war_race_overall_field",
            {},
            this.guildLocale
          );

    embed.addFields(
      {
        name: fieldName,
        value: lines,
        inline: false,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_race_result_points_field",
          {},
          this.guildLocale
        ),
        value: summaryLines.join("\n"),
        inline: false,
      }
    );

    return embed;
  }
}

module.exports = EmbedWarRaceOverview;
