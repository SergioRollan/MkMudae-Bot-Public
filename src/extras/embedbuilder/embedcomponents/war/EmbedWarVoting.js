const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarVoting extends IEmbed {
  constructor({
    type,
    raceNumber,
    challengerTeamName,
    opponentTeamName,
    challengerTrack,
    opponentTrack,
    selectedTrack,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.raceNumber = raceNumber;
    this.challengerTeamName = challengerTeamName;
    this.opponentTeamName = opponentTeamName;
    this.challengerTrack = challengerTrack;
    this.opponentTrack = opponentTrack;
    this.selectedTrack = selectedTrack;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const title = lang.getString(
      this.guildId,
      "war_voting_title",
      { race: this.raceNumber },
      this.guildLocale
    );

    let color;
    if (this.type === WarType.WAR) {
      color = 0xe67e22;
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

    embed.addFields(
      {
        name: lang.getString(
          this.guildId,
          "war_voting_field_team",
          { team: this.challengerTeamName },
          this.guildLocale
        ),
        value: this.challengerTrack,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_voting_field_team",
          { team: this.opponentTeamName },
          this.guildLocale
        ),
        value: this.opponentTrack,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_voting_selected_field",
          {},
          this.guildLocale
        ),
        value: this.selectedTrack,
        inline: false,
      }
    );

    return embed;
  }
}

module.exports = EmbedWarVoting;
