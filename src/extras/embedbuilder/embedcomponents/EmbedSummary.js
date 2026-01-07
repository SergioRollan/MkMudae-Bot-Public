const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedSummary extends IEmbed {
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
        lang.getString(this.guildId, "summary_title", {}, this.guildLocale)
      )
      .setDescription(
        lang.getString(
          this.guildId,
          "summary_description",
          {},
          this.guildLocale
        )
      )
      .addFields([
        {
          name: lang.getString(
            this.guildId,
            "summary_basics_title",
            {},
            this.guildLocale
          ),
          value: lang.getString(
            this.guildId,
            "summary_basics_description",
            {},
            this.guildLocale
          ),
          inline: false,
        },
        {
          name: lang.getString(
            this.guildId,
            "summary_war_title",
            {},
            this.guildLocale
          ),
          value: lang.getString(
            this.guildId,
            "summary_war_description",
            {},
            this.guildLocale
          ),
          inline: false,
        },
        {
          name: lang.getString(
            this.guildId,
            "summary_advanced_title",
            {},
            this.guildLocale
          ),
          value: lang.getString(
            this.guildId,
            "summary_advanced_description",
            {},
            this.guildLocale
          ),
          inline: false,
        },
        {
          name: lang.getString(
            this.guildId,
            "summary_contact_title",
            {},
            this.guildLocale
          ),
          value: lang.getString(
            this.guildId,
            "summary_contact_description",
            {},
            this.guildLocale
          ),
          inline: false,
        },
      ])
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedSummary;
