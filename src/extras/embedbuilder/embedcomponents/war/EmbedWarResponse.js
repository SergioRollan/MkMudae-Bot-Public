const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../../IEmbed");
const LanguageManager = require("../../../../managers/LanguageManager");
const WarType = require("../../../../enums/WarType");

class EmbedWarResponse extends IEmbed {
  constructor({
    type,
    accepted,
    challengerTag,
    opponentTag,
    amount = 0,
    responderTag,
    guildId = null,
    guildLocale = null,
  }) {
    super();
    this.type = type;
    this.accepted = accepted;
    this.challengerTag = challengerTag;
    this.opponentTag = opponentTag;
    this.amount = amount;
    this.responderTag = responderTag;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const isWar = this.type === WarType.WAR;
    const isScrim = this.type === WarType.SCRIM;
    const isTournamentWar = this.type === WarType.TOURNAMENTWAR;

    let baseKey;
    if (isWar) {
      baseKey = "war";
    } else if (isScrim) {
      baseKey = "scrim";
    } else if (isTournamentWar) {
      baseKey = "tournamentwar";
    } else {
      baseKey = "war";
    }

    const statusKey = this.accepted ? "accept" : "deny";

    const titleKey = `${baseKey}_${statusKey}_title`;
    const descriptionKey = `${baseKey}_${statusKey}_description`;

    const embed = new EmbedBuilder()
      .setColor(this.accepted ? 0x2ecc71 : 0xe74c3c)
      .setTitle(lang.getString(this.guildId, titleKey, {}, this.guildLocale))
      .setDescription(
        lang.getString(
          this.guildId,
          descriptionKey,
          {
            challenger: this.challengerTag,
            opponent: this.opponentTag,
            responder: this.responderTag,
          },
          this.guildLocale
        )
      )
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedWarResponse;
