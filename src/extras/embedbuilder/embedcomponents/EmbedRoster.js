const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedRoster extends IEmbed {
  constructor(
    teamName,
    isOwnRoster,
    isEmpty,
    count,
    guildId = null,
    guildLocale = null
  ) {
    super();
    this.teamName = teamName;
    this.isOwnRoster = isOwnRoster;
    this.isEmpty = isEmpty;
    this.count = count;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder().setColor(0x5865f2).setTimestamp();

    if (this.isEmpty) {
      const emptyMessage = this.isOwnRoster
        ? lang.getString(this.guildId, "roster_empty", {}, this.guildLocale)
        : lang.getString(
            this.guildId,
            "roster_empty_other",
            { name: this.teamName },
            this.guildLocale
          );

      embed
        .setTitle(
          lang.getString(
            this.guildId,
            "roster_title",
            { name: this.teamName },
            this.guildLocale
          )
        )
        .setDescription(emptyMessage);
    } else {
      embed
        .setTitle(
          lang.getString(
            this.guildId,
            "roster_title",
            { name: this.teamName },
            this.guildLocale
          )
        )
        .setDescription(
          lang
            .getString(
              this.guildId,
              this.count === 1
                ? "roster_description_singular"
                : "roster_description_plural",
              { count: this.count },
              this.guildLocale
            )
            .replace("{count}", this.count)
        );
    }

    return embed;
  }
}

module.exports = EmbedRoster;
