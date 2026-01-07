const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedTrainFocusMenu extends IEmbed {
  constructor(playerDisplayName, guildId = null, guildLocale = null) {
    super();
    this.playerDisplayName = playerDisplayName;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const title = lang.getString(
      this.guildId,
      "train_focus_title",
      { name: this.playerDisplayName },
      this.guildLocale
    );

    const description = lang.getString(
      this.guildId,
      "train_focus_description",
      {},
      this.guildLocale
    );

    const attrLines = lang.getString(
      this.guildId,
      "playerinfo_role_lines",
      {},
      this.guildLocale
    );
    const attrConsistency = lang.getString(
      this.guildId,
      "playerinfo_role_consistency",
      {},
      this.guildLocale
    );
    const attrItemUsage = lang.getString(
      this.guildId,
      "playerinfo_role_item_usage",
      {},
      this.guildLocale
    );
    const attrPrecision = lang.getString(
      this.guildId,
      "playerinfo_role_precision",
      {},
      this.guildLocale
    );
    const attrCommunication = lang.getString(
      this.guildId,
      "playerinfo_role_communication",
      {},
      this.guildLocale
    );
    const attrMental = lang.getString(
      this.guildId,
      "playerinfo_role_mental",
      {},
      this.guildLocale
    );
    const attrGameSense = lang.getString(
      this.guildId,
      "playerinfo_role_game_sense",
      {},
      this.guildLocale
    );
    const attrShockfinding = lang.getString(
      this.guildId,
      "playerinfo_role_shockfinding",
      {},
      this.guildLocale
    );

    const listLines = [
      `1 - ${attrLines}`,
      `2 - ${attrConsistency}`,
      `3 - ${attrItemUsage}`,
      `4 - ${attrPrecision}`,
      `5 - ${attrCommunication}`,
      `6 - ${attrMental}`,
      `7 - ${attrGameSense}`,
      `8 - ${attrShockfinding}`,
    ].join("\n");

    const prompt = lang.getString(
      this.guildId,
      "train_prompt_select_attribute",
      {},
      this.guildLocale
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(title)
      .setDescription(`${description}\n\n${listLines}\n\n${prompt}`)
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedTrainFocusMenu;
