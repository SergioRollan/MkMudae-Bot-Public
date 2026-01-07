const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarRaceStart extends IEmbed {
  constructor({
    type,
    raceNumber,
    challengerTeamName,
    opponentTeamName,
    challengerPositions = [],
    opponentPositions = [],
    challengerDisplayName,
    opponentDisplayName,
    challengerPoints = 0,
    opponentPoints = 0,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.raceNumber = raceNumber;
    this.challengerTeamName = challengerTeamName;
    this.opponentTeamName = opponentTeamName;
    this.challengerPositions = challengerPositions;
    this.opponentPositions = opponentPositions;
    this.challengerDisplayName = challengerDisplayName || challengerTeamName;
    this.opponentDisplayName = opponentDisplayName || opponentTeamName;
    this.challengerPoints = challengerPoints;
    this.opponentPoints = opponentPoints;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const title = lang.getString(
      this.guildId,
      "war_race_start_title",
      { race: this.raceNumber },
      this.guildLocale
    );

    let color;
    if (this.type === WarType.WAR) {
      color = 0xf1c40f;
    } else if (this.type === WarType.SCRIM) {
      color = 0x27ae60;
    } else if (this.type === WarType.TOURNAMENTWAR) {
      color = 0x9b59b6;
    } else {
      color = 0x27ae60;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();

    embed.addFields(
      {
        name: lang.getString(
          this.guildId,
          "war_race_start_score_field",
          {},
          this.guildLocale
        ),
        value: lang.getString(
          this.guildId,
          "war_race_start_score_value",
          {
            challenger: this.challengerDisplayName,
            challengerPoints: this.challengerPoints,
            opponentPoints: this.opponentPoints,
            opponent: this.opponentDisplayName,
          },
          this.guildLocale
        ),
        inline: false,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_race_start_field_team",
          { team: this.challengerTeamName },
          this.guildLocale
        ),
        value: this.challengerPositions.join(", "),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_race_start_field_team",
          { team: this.opponentTeamName },
          this.guildLocale
        ),
        value: this.opponentPositions.join(", "),
        inline: true,
      }
    );

    return embed;
  }
}

module.exports = EmbedWarRaceStart;
