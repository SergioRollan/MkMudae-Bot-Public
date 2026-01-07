const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedLanguageUpdated extends IEmbed {
  constructor(language, guildId = null, guildLocale = null) {
    super();
    this.language = language;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(
        lang.getString(
          this.guildId,
          "language_updated_title",
          {},
          this.guildLocale
        )
      )
      .setDescription(
        lang.getString(
          this.guildId,
          "language_updated_description",
          { language: this.language },
          this.guildLocale
        )
      )
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedLanguageUpdated;
