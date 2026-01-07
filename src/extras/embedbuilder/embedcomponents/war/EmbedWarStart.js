const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarStart extends IEmbed {
  constructor({
    type,
    challengerTag,
    opponentTag,
    challengerTeamName,
    opponentTeamName,
    challengerLineup = [],
    opponentLineup = [],
    challengerAverageStats = 0,
    opponentAverageStats = 0,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.challengerTag = challengerTag;
    this.opponentTag = opponentTag;
    this.challengerTeamName = challengerTeamName;
    this.opponentTeamName = opponentTeamName;
    this.challengerLineup = challengerLineup;
    this.opponentLineup = opponentLineup;
    this.challengerAverageStats = challengerAverageStats;
    this.opponentAverageStats = opponentAverageStats;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    let typeKey, color;
    if (this.type === WarType.WAR) {
      typeKey = "war_type_war";
      color = 0xe74c3c;
    } else if (this.type === WarType.SCRIM) {
      typeKey = "war_type_scrim";
      color = 0x1abc9c;
    } else if (this.type === WarType.TOURNAMENTWAR) {
      typeKey = "war_type_tournamentwar";
      color = 0x9b59b6;
    } else {
      typeKey = "war_type_war";
      color = 0xe74c3c;
    }

    const typeLabel = lang.getString(
      this.guildId,
      typeKey,
      {},
      this.guildLocale
    );

    const title = lang.getString(
      this.guildId,
      "war_start_title",
      { type: typeLabel },
      this.guildLocale
    );

    const description = lang.getString(
      this.guildId,
      "war_start_description",
      {
        challengerTeam: this.challengerTeamName,
        opponentTeam: this.opponentTeamName,
        challenger: this.challengerTag,
        opponent: this.opponentTag,
      },
      this.guildLocale
    );

    const lineupEmpty = lang.getString(
      this.guildId,
      "war_start_lineup_empty",
      {},
      this.guildLocale
    );

    const challengerLineupText =
      this.challengerLineup.length > 0
        ? this.challengerLineup
            .map((player, idx) => `${idx + 1}. ${player}`)
            .join("\n")
        : lineupEmpty;

    const opponentLineupText =
      this.opponentLineup.length > 0
        ? this.opponentLineup
            .map((player, idx) => `${idx + 1}. ${player}`)
            .join("\n")
        : lineupEmpty;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    embed.addFields(
      {
        name: lang.getString(
          this.guildId,
          "war_start_team_field",
          { team: this.challengerTeamName },
          this.guildLocale
        ),
        value: challengerLineupText,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_start_team_field",
          { team: this.opponentTeamName },
          this.guildLocale
        ),
        value: opponentLineupText,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "war_start_stats_field",
          {},
          this.guildLocale
        ),
        value: lang.getString(
          this.guildId,
          "war_start_stats_value",
          {
            challengerTeam: this.challengerTeamName,
            challengerStats:
              Math.round(this.challengerAverageStats * 100) / 100,
            opponentTeam: this.opponentTeamName,
            opponentStats: Math.round(this.opponentAverageStats * 100) / 100,
          },
          this.guildLocale
        ),
        inline: false,
      }
    );

    return embed;
  }
}

module.exports = EmbedWarStart;
