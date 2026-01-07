const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedLeaderboardMMR extends IEmbed {
  constructor(leaderboard, totalUsers, guildId = null, guildLocale = null) {
    super();
    this.leaderboard = leaderboard;
    this.totalUsers = totalUsers;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  getEmojiByMMR(mmr) {
    if (mmr >= 13500) {
      return "<:emoji:1441958268195962952>";
    } else if (mmr >= 12500) {
      return "<:emoji:1441958336567312404>";
    } else if (mmr >= 11000) {
      return "<:emoji:1441958204937601064>";
    } else if (mmr >= 9500) {
      return "<:emoji:1441958385619828810>";
    } else if (mmr >= 8000) {
      return "<:emoji:1441958418297655367>";
    } else if (mmr >= 6500) {
      return "<:emoji:1441958362958008332>";
    } else if (mmr >= 5000) {
      return "<:emoji:1441958237296660531>";
    } else if (mmr >= 3500) {
      return "<:emoji:1441958450354716692>";
    } else if (mmr >= 2000) {
      return "<:emoji:1441958154010234973>";
    } else {
      return "<:emoji:1441958305466552340>";
    }
  }

  build() {
    const lang = LanguageManager.getInstance();

    const title = lang.getString(
      this.guildId,
      "leaderboardmmr_title",
      {},
      this.guildLocale
    );

    const description = lang.getString(
      this.guildId,
      "leaderboardmmr_description",
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
        "leaderboardmmr_empty",
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
      const emoji = this.getEmojiByMMR(entry.averageMMR);
      const averageMMR = Math.round(entry.averageMMR);
      const teamName = entry.teamName || entry.name || "Unknown";

      leaderboardLines.push(
        `**#${position}.** ${emoji} **${teamName}** - ${averageMMR.toLocaleString()} MMR`
      );
    }

    const fieldTitle = lang.getString(
      this.guildId,
      "leaderboardmmr_field_title",
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

module.exports = EmbedLeaderboardMMR;
