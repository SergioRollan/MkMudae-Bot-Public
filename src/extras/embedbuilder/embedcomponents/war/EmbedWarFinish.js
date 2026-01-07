const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarFinish extends IEmbed {
  constructor({
    type,
    winnerDisplayName,
    loserDisplayName,
    winnerTeamName,
    loserTeamName,
    winnerPoints,
    loserPoints,
    pointsDiff,
    betAmount = 0,
    winnerEloChange = 0,
    loserEloChange = 0,
    winnerNewElo = 0,
    loserNewElo = 0,
    winnerRankName,
    loserRankName,
    winnerRankChange = "same",
    loserRankChange = "same",
    guildId = null,
    guildLocale = null,
    isTie = false,
  }) {
    super();
    this.type = type;
    this.winnerDisplayName = winnerDisplayName;
    this.loserDisplayName = loserDisplayName;
    this.winnerTeamName = winnerTeamName;
    this.loserTeamName = loserTeamName;
    this.winnerPoints = winnerPoints;
    this.loserPoints = loserPoints;
    this.pointsDiff = pointsDiff;
    this.isTie = isTie;
    this.betAmount = betAmount;
    this.winnerEloChange = winnerEloChange;
    this.loserEloChange = loserEloChange;
    this.winnerNewElo = winnerNewElo;
    this.loserNewElo = loserNewElo;
    this.winnerRankName = winnerRankName;
    this.loserRankName = loserRankName;
    this.winnerRankChange = winnerRankChange;
    this.loserRankChange = loserRankChange;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    let typeKey, color;
    if (this.type === WarType.WAR) {
      typeKey = "war_type_war";
      color = 0x2ecc71;
    } else if (this.type === WarType.SCRIM) {
      typeKey = "war_type_scrim";
      color = 0x3498db;
    } else if (this.type === WarType.TOURNAMENTWAR) {
      typeKey = "war_type_tournamentwar";
      color = 0x9b59b6;
    } else if (this.type === WarType.CPUWAR) {
      typeKey = "war_type_cpuwar";
      color = 0x2ecc71;
    } else {
      typeKey = "war_type_war";
      color = 0x2ecc71;
    }

    const typeLabel = lang.getString(
      this.guildId,
      typeKey,
      {},
      this.guildLocale
    );

    const title = lang.getString(
      this.guildId,
      "war_finish_title",
      { type: typeLabel },
      this.guildLocale
    );

    const descriptionLines = [];
    if (this.isTie || this.pointsDiff === 0) {
      descriptionLines.push(
        lang.getString(
          this.guildId,
          "war_finish_description_tie",
          {
            challenger: this.winnerDisplayName,
            opponent: this.loserDisplayName,
          },
          this.guildLocale
        ) || `${this.winnerDisplayName} y ${this.loserDisplayName} empataron.`
      );
    } else {
      descriptionLines.push(
        lang.getString(
          this.guildId,
          "war_finish_description",
          {
            winner: this.winnerDisplayName,
            points: this.pointsDiff.toLocaleString(),
          },
          this.guildLocale
        )
      );
    }

    if (this.type === WarType.SCRIM) {
      descriptionLines.push(
        lang.getString(
          this.guildId,
          "war_finish_scrim_no_elo",
          {},
          this.guildLocale
        )
      );
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(descriptionLines.filter(Boolean).join("\n"))
      .setTimestamp();

    if (this.isTie || this.pointsDiff === 0) {
      embed.addFields({
        name: lang.getString(
          this.guildId,
          "war_finish_field_score",
          {},
          this.guildLocale
        ),
        value: `${
          this.winnerTeamName
        }: ${this.winnerPoints.toLocaleString()}\n${
          this.loserTeamName
        }: ${this.loserPoints.toLocaleString()}`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: lang.getString(
          this.guildId,
          "war_finish_field_score",
          {},
          this.guildLocale
        ),
        value: `${
          this.winnerTeamName
        }: ${this.winnerPoints.toLocaleString()}\n${
          this.loserTeamName
        }: ${this.loserPoints.toLocaleString()}`,
        inline: false,
      });
    }

    return embed;
  }
}

module.exports = EmbedWarFinish;
