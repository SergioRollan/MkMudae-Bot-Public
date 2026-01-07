const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedRosterContinued extends IEmbed {
  constructor(guildId = null, guildLocale = null) {
    super();
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        lang.getString(
          this.guildId,
          "roster_title_continued",
          {},
          this.guildLocale
        )
      )
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedRosterContinued;
