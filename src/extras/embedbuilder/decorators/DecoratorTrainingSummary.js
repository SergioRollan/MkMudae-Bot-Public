const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorTrainingSummary extends Decorator {
  constructor(embed, changes = {}, guildId = null, guildLocale = null) {
    super(embed);
    this.changes = changes || {};
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const keyToString = {
      Lines: "playerinfo_role_lines",
      Consistency: "playerinfo_role_consistency",
      ItemUsage: "playerinfo_role_item_usage",
      Precision: "playerinfo_role_precision",
      Communication: "playerinfo_role_communication",
      Mental: "playerinfo_role_mental",
      GameSense: "playerinfo_role_game_sense",
      Shockfinding: "playerinfo_role_shockfinding",
    };

    const lines = [];
    for (const [attrKey, pair] of Object.entries(this.changes)) {
      const label =
        lang.getString(
          this.guildId,
          keyToString[attrKey] || attrKey,
          {},
          this.guildLocale
        ) || attrKey;
      let oldValNum =
        typeof pair.old === "number" ? pair.old : Number(pair.old) || 0;
      let newValNum =
        typeof pair.new === "number" ? pair.new : Number(pair.new) || 0;

      oldValNum = Math.max(0, Math.min(100, oldValNum));
      newValNum = Math.max(0, Math.min(100, newValNum));
      const oldVal = Number(oldValNum.toFixed(1)).toString();
      const newVal = Number(newValNum.toFixed(1)).toString();
      lines.push(`${label} ${oldVal}->${newVal}`);
    }

    const value = lines.length > 0 ? lines.join("\n") : "-";

    baseEmbed.addFields({
      name: "📝 Entrenamiento",
      value,
      inline: false,
    });

    return baseEmbed;
  }
}

module.exports = DecoratorTrainingSummary;
