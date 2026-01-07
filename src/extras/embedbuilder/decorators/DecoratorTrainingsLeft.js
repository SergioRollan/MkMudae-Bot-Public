const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorTrainingsLeft extends Decorator {
  constructor(embed, trainingsLeft, guildId = null, guildLocale = null) {
    super(embed);
    this.trainingsLeft = trainingsLeft;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();
    baseEmbed.addFields({
      name: lang.getString(
        this.guildId,
        "train_trainings_left_field",
        {},
        this.guildLocale
      ),
      value: `${this.trainingsLeft}`,
      inline: true,
    });
    return baseEmbed;
  }
}

module.exports = DecoratorTrainingsLeft;
