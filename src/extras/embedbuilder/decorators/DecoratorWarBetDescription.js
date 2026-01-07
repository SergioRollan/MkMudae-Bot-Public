const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorWarBetDescription extends Decorator {
  constructor(
    embed,
    winnerDisplayName,
    amount = 0,
    guildId = null,
    guildLocale = null
  ) {
    super(embed);
    this.winnerDisplayName = winnerDisplayName;
    this.amount = amount;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const key =
      this.amount > 0 ? "war_finish_line_coins" : "war_finish_line_no_coins";

    const line =
      this.amount > 0
        ? lang.getString(
            this.guildId,
            key,
            {
              winner: this.winnerDisplayName,
              amount: this.amount.toLocaleString(),
            },
            this.guildLocale
          )
        : lang.getString(this.guildId, key, {}, this.guildLocale);

    const existingDescription = baseEmbed.data?.description || "";
    const descriptionSegments = existingDescription
      ? [existingDescription, line]
      : [line];

    baseEmbed.setDescription(descriptionSegments.filter(Boolean).join("\n"));

    return baseEmbed;
  }
}

module.exports = DecoratorWarBetDescription;
