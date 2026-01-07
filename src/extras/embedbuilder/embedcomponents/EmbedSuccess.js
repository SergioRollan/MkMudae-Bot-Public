const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedSuccess extends IEmbed {
  constructor(message, guildId = null, guildLocale = null) {
    super();
    this.message = message;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(
        lang.getString(this.guildId, "success_title", {}, this.guildLocale)
      )
      .setDescription(this.message)
      .setTimestamp();
  }
}

module.exports = EmbedSuccess;
