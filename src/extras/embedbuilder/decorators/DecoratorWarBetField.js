const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");
const Utils = require("../../Utils");

class DecoratorWarBetField extends Decorator {
  constructor(
    embed,
    amount = 0,
    guildId = null,
    guildLocale = null,
    fieldKey = "war_request_field_bet",
    noBetKey = "war_request_no_bet"
  ) {
    super(embed);
    this.amount = amount;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
    this.fieldKey = fieldKey;
    this.noBetKey = noBetKey;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const value =
      this.amount > 0
        ? `${this.amount.toLocaleString()} ${Utils.formatCoins(this.amount)}`
        : lang.getString(this.guildId, this.noBetKey, {}, this.guildLocale);

    baseEmbed.addFields({
      name: lang.getString(this.guildId, this.fieldKey, {}, this.guildLocale),
      value,
      inline: true,
    });

    return baseEmbed;
  }
}

module.exports = DecoratorWarBetField;
