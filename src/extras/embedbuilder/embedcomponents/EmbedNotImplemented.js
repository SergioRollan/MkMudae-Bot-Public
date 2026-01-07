const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedNotImplemented extends IEmbed {
  constructor(commandName, guildId = null, guildLocale = null) {
    super();
    this.commandName = commandName;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle(
        lang.getString(
          this.guildId,
          "not_implemented_title",
          {},
          this.guildLocale
        )
      )
      .setDescription(
        lang.getString(
          this.guildId,
          "not_implemented_description",
          {
            command: this.commandName,
          },
          this.guildLocale
        )
      )
      .setFooter({
        text: lang.getString(
          this.guildId,
          "not_implemented_footer",
          {},
          this.guildLocale
        ),
      })
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedNotImplemented;
