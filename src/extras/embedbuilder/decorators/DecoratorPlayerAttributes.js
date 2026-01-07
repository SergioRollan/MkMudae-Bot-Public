const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");
const Utils = require("../../Utils");

class DecoratorPlayerAttributes extends Decorator {
  constructor(embed, roles = {}, mmr = 0, guildId = null, guildLocale = null) {
    super(embed);
    this.roles = roles || {};
    this.mmr = mmr || 0;
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

    const attributeKeys = [
      { key: "Lines", stringKey: "playerinfo_role_lines" },
      { key: "Consistency", stringKey: "playerinfo_role_consistency" },
      { key: "ItemUsage", stringKey: "playerinfo_role_item_usage" },
      { key: "Precision", stringKey: "playerinfo_role_precision" },
      { key: "Communication", stringKey: "playerinfo_role_communication" },
      { key: "Mental", stringKey: "playerinfo_role_mental" },
      { key: "GameSense", stringKey: "playerinfo_role_game_sense" },
      { key: "Shockfinding", stringKey: "playerinfo_role_shockfinding" },
    ];

    const attributesGroupTitle =
      lang.getString(
        this.guildId,
        "playerinfo_roles_group_title",
        {},
        this.guildLocale
      ) || "🎯 Attributes";

    const fields = attributeKeys.map((attribute) => {
      const attributeName =
        lang.getString(
          this.guildId,
          attribute.stringKey,
          {},
          this.guildLocale
        ) || attribute.key;
      const attributeValue = this.roles[attribute.key] || 0;

      let percent = Utils.getStatfromMMR(attributeValue);
      if (!Number.isFinite(percent)) percent = 0;
      percent = Math.max(0, Math.min(100, percent));
      const bar = this.buildProgressBar(percent);

      return {
        name: attributeName,
        value: `**${percent}**\n${bar}`,
        inline: false,
      };
    });

    baseEmbed.addFields({
      name: attributesGroupTitle,
      value: " ",
      inline: false,
    });

    fields.forEach((f) => baseEmbed.addFields(f));

    return baseEmbed;
  }
}

module.exports = DecoratorPlayerAttributes;
