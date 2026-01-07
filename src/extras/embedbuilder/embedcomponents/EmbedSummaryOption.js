const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

const DEVELOPER_IDS = {
  SUPER: "466364835400253480",
  SERG: "513755565843808266",
};

class EmbedSummaryOption extends IEmbed {
  constructor(option, guildId = null, guildLocale = null) {
    super();
    this.option = option.toLowerCase();
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const validOptions = ["basics", "war", "advanced", "contact"];

    if (!validOptions.includes(this.option)) {
      return null;
    }

    const titleKey = `summary_${this.option}_title`;
    const contentKey = `summary_${this.option}_content`;

    let content = lang.getString(
      this.guildId,
      contentKey,
      {},
      this.guildLocale
    );

    if (this.option === "contact") {
      content = content
        .replace("{SUPER_ID}", DEVELOPER_IDS.SUPER)
        .replace("{SERG_ID}", DEVELOPER_IDS.SERG);
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(lang.getString(this.guildId, titleKey, {}, this.guildLocale))
      .setDescription(content)
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedSummaryOption;
