const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarRaceResult extends IEmbed {
  constructor({
    type,
    raceNumber,
    results = [],
    challengerTeamName,
    opponentTeamName,
    challengerRacePoints = 0,
    opponentRacePoints = 0,
    challengerTotalPoints = 0,
    opponentTotalPoints = 0,
    challengerDisplayName,
    opponentDisplayName,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.raceNumber = raceNumber;
    this.results = results;
    this.challengerTeamName = challengerTeamName;
    this.opponentTeamName = opponentTeamName;
    this.challengerRacePoints = challengerRacePoints;
    this.opponentRacePoints = opponentRacePoints;
    this.challengerTotalPoints = challengerTotalPoints;
    this.opponentTotalPoints = opponentTotalPoints;
    this.challengerDisplayName =
      challengerDisplayName || this.challengerTeamName;
    this.opponentDisplayName = opponentDisplayName || this.opponentTeamName;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const title = lang.getString(
      this.guildId,
      "war_race_result_title",
      { race: this.raceNumber },
      this.guildLocale
    );

    let color;
    if (this.type === WarType.WAR) {
      color = 0x2980b9;
    } else if (this.type === WarType.SCRIM) {
      color = 0x8e44ad;
    } else if (this.type === WarType.TOURNAMENTWAR) {
      color = 0x9b59b6;
    } else {
      color = 0x2980b9;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();

    const lines =
      this.results.length > 0
        ? this.results
            .map((result, index) =>
              lang.getString(
                this.guildId,
                "war_race_result_line",
                {
                  position: index + 1,
                  name: result.name,
                  team: result.teamName,
                  points: result.points,
                  totalPoints: result.totalPoints || result.points,
                },
                this.guildLocale
              )
            )
            .join("\n")
        : lang.getString(
            this.guildId,
            "war_race_result_field_empty",
            {},
            this.guildLocale
          );

    embed.addFields({
      name: lang.getString(
        this.guildId,
        "war_race_result_field",
        {},
        this.guildLocale
      ),
      value: lines,
      inline: false,
    });

    return embed;
  }
}

module.exports = EmbedWarRaceResult;
