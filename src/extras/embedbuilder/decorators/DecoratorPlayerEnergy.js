const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorPlayerEnergy extends Decorator {
  constructor(embed, energy = 100, guildId = null, guildLocale = null) {
    super(embed);
    this.energy = Number(energy) || 100;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  buildProgressBar(percent) {
    const clamped = Math.max(0, Math.min(100, percent));

    const totalBlocks = 33;
    const activeBlocks = Math.round(clamped / (100 / totalBlocks));
    const emptyBlocks = Math.max(0, totalBlocks - activeBlocks);
    const bar = "|".repeat(Math.max(0, activeBlocks)) + " ".repeat(emptyBlocks);

    return "```" + bar + "```";
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const energyName =
      lang.getString(this.guildId, "playerinfo_energy", {}, this.guildLocale) ||
      "Energía";

    const energyValue = Math.max(0, Math.min(100, this.energy));
    const bar = this.buildProgressBar(energyValue);

    baseEmbed.addFields({
      name: energyName,
      value: `**${energyValue}**\n${bar}`,
      inline: false,
    });

    return baseEmbed;
  }
}

module.exports = DecoratorPlayerEnergy;
