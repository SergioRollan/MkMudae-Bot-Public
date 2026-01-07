const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedError extends IEmbed {
  constructor(message, guildId = null, guildLocale = null) {
    super();
    this.message = message;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(
        lang.getString(this.guildId, "error_title", {}, this.guildLocale)
      )
      .setDescription(this.message)
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedError;
