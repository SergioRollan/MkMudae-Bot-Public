const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarRequest extends IEmbed {
  constructor({
    type,
    challengerTag,
    opponentTag,
    amount = 0,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.challengerTag = challengerTag;
    this.opponentTag = opponentTag;
    this.amount = amount;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const isWar = this.type === WarType.WAR;
    const isScrim = this.type === WarType.SCRIM;
    const isTournamentWar = this.type === WarType.TOURNAMENTWAR;

    let titleKey, descriptionKey, color;
    if (isWar) {
      titleKey = "war_request_title";
      descriptionKey = "war_request_description";
      color = 0xe74c3c;
    } else if (isScrim) {
      titleKey = "scrim_request_title";
      descriptionKey = "scrim_request_description";
      color = 0x1abc9c;
    } else if (isTournamentWar) {
      titleKey = "tournamentwar_request_title";
      descriptionKey = "tournamentwar_request_description";
      color = 0x9b59b6;
    } else {
      titleKey = "war_request_title";
      descriptionKey = "war_request_description";
      color = 0xe74c3c;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(lang.getString(this.guildId, titleKey, {}, this.guildLocale))
      .setDescription(
        lang.getString(
          this.guildId,
          descriptionKey,
          {
            challenger: this.challengerTag,
            opponent: this.opponentTag,
          },
          this.guildLocale
        )
      )
      .setTimestamp();

    embed.addFields({
      name: lang.getString(
        this.guildId,
        "war_request_field_instructions",
        {},
        this.guildLocale
      ),
      value: lang.getString(
        this.guildId,
        "war_request_instructions",
        {},
        this.guildLocale
      ),
      inline: false,
    });

    return embed;
  }
}

module.exports = EmbedWarRequest;
