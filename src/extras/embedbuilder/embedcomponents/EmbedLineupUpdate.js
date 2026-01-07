const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedLineupUpdate extends IEmbed {
  constructor({
    lineup = [],
    changedPlayers = null,
    changedFieldKey = null,
    titleKey = "lineupadd_success_title",
    descriptionKey = "lineupadd_success_description",
    descriptionParams = null,
    lineupFieldKey = "lineupadd_field_lineup",
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.lineup = Array.isArray(lineup) ? lineup : [];
    this.changedPlayers = Array.isArray(changedPlayers) ? changedPlayers : null;
    this.changedFieldKey = changedFieldKey;
    this.titleKey = titleKey;
    this.descriptionKey = descriptionKey;
    this.descriptionParams = descriptionParams;
    this.lineupFieldKey = lineupFieldKey;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(
        lang.getString(this.guildId, this.titleKey, {}, this.guildLocale)
      )
      .setDescription(
        lang.getString(
          this.guildId,
          this.descriptionKey,
          this.descriptionParams || {
            count: this.lineup.length,
          },
          this.guildLocale
        )
      )
      .addFields({
        name: lang.getString(
          this.guildId,
          this.lineupFieldKey,
          {},
          this.guildLocale
        ),
        value:
          this.lineup.length > 0
            ? this.formatLineup()
            : lang.getString(
                this.guildId,
                "userinfo_lineup_empty",
                {},
                this.guildLocale
              ),
        inline: false,
      })
      .setTimestamp();

    if (
      this.changedPlayers &&
      this.changedPlayers.length > 0 &&
      this.changedFieldKey
    ) {
      embed.addFields({
        name: lang.getString(
          this.guildId,
          this.changedFieldKey,
          {},
          this.guildLocale
        ),
        value: this.changedPlayers.map((player) => `• ${player}`).join("\n"),
        inline: false,
      });
    }

    return embed;
  }

  formatLineup() {
    return this.lineup
      .map((player, index) => `${index + 1}. ${player}`)
      .join("\n");
  }
}

module.exports = EmbedLineupUpdate;
