const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");
const Utils = require("../../Utils");

class EmbedLeaderboard extends IEmbed {
  constructor(
    leaderboard,
    totalUsers,
    ranks,
    guildId = null,
    guildLocale = null
  ) {
    super();
    this.leaderboard = leaderboard;
    this.totalUsers = totalUsers;
    this.ranks = ranks;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const title = lang.getString(
      this.guildId,
      "leaderboard_title",
      {},
      this.guildLocale
    );

    const description = lang.getString(
      this.guildId,
      "leaderboard_description",
      { total: this.totalUsers },
      this.guildLocale
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    if (!this.leaderboard || this.leaderboard.length === 0) {
      const emptyMessage = lang.getString(
        this.guildId,
        "leaderboard_empty",
        {},
        this.guildLocale
      );
      embed.setDescription(emptyMessage);
      return embed;
    }

    const MAX_FIELD_LENGTH = 1024;
    const MAX_FIELDS = 25;
    const leaderboardLines = [];

    for (let i = 0; i < this.leaderboard.length; i++) {
      const entry = this.leaderboard[i];
      const position = i + 1;

      const rank = Utils.findRankForElo(this.ranks, entry.elo);
      const rankEmote = rank?.emote || "";

      const teamName = entry.teamName || entry.name || "Unknown";
      const eloValue = entry.elo.toLocaleString();

      leaderboardLines.push(
        `**#${position}.** ${rankEmote} **${teamName}** - ${eloValue} Elo`
      );
    }

    const fieldTitle = lang.getString(
      this.guildId,
      "leaderboard_field_title",
      {},
      this.guildLocale
    );

    let currentFieldContent = "";
    let fieldNumber = 1;

    for (let i = 0; i < leaderboardLines.length; i++) {
      if (fieldNumber > MAX_FIELDS) {
        break;
      }

      const line = leaderboardLines[i];
      const lineWithNewline = i === 0 ? line : `\n${line}`;

      if (
        currentFieldContent.length + lineWithNewline.length >
          MAX_FIELD_LENGTH &&
        currentFieldContent.length > 0
      ) {
        embed.addFields({
          name: fieldNumber === 1 ? fieldTitle : "--------------------",
          value: currentFieldContent,
          inline: false,
        });
        currentFieldContent = line;
        fieldNumber++;
      } else {
        currentFieldContent += lineWithNewline;
      }
    }

    if (currentFieldContent.length > 0 && fieldNumber <= MAX_FIELDS) {
      embed.addFields({
        name: fieldNumber === 1 ? fieldTitle : "--------------------",
        value: currentFieldContent,
        inline: false,
      });
    }

    return embed;
  }
}

module.exports = EmbedLeaderboard;
