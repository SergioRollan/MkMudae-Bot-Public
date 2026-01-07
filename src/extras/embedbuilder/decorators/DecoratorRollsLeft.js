const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorRollsLeft extends Decorator {
  constructor(embed, rollsLeft, guildId = null, guildLocale = null) {
    super(embed);
    this.rollsLeft = rollsLeft;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const baseEmbed = super.build();

    baseEmbed.addFields({
      name: lang.getString(
        this.guildId,
        "roll_rolls_left_field",
        {},
        this.guildLocale
      ),
      value: `${this.rollsLeft}`,
      inline: true,
    });

    return baseEmbed;
  }
}

module.exports = DecoratorRollsLeft;
