const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");
const TrainingManager = require("../../../managers/TrainingManager");

class EmbedTrainMenu extends IEmbed {
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
      "train_title",
      { name: this.playerDisplayName },
      this.guildLocale
    );

    const description = lang.getString(
      this.guildId,
      "train_description",
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

    const fields = [];

    const trainings = TrainingManager.getTrainings();

    const effectLines = (effects) => {
      const mapKeyToLabel = (k) => {
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
        const sk = keyToString[k] || k;
        return lang.getString(this.guildId, sk, {}, this.guildLocale) || k;
      };
      return Object.entries(effects).map(
        ([attr, sym]) => `${mapKeyToLabel(attr)}${sym}`
      );
    };

    const t1Name = lang.getString(
      this.guildId,
      "train_1_name",
      {},
      this.guildLocale
    );
    const t1Value = effectLines(trainings[1].effects).join("\n");
    fields.push({ name: `1 - ${t1Name}`, value: t1Value, inline: false });

    const t2Name = lang.getString(
      this.guildId,
      "train_2_name",
      {},
      this.guildLocale
    );
    const t2Value = effectLines(trainings[2].effects).join("\n");
    fields.push({ name: `2 - ${t2Name}`, value: t2Value, inline: false });

    const t3Name = lang.getString(
      this.guildId,
      "train_3_name",
      {},
      this.guildLocale
    );
    const t3Value = effectLines(trainings[3].effects).join("\n");
    fields.push({ name: `3 - ${t3Name}`, value: t3Value, inline: false });

    const t4Name = lang.getString(
      this.guildId,
      "train_4_name",
      {},
      this.guildLocale
    );
    const t4Value = effectLines(trainings[4].effects).join("\n");
    fields.push({ name: `4 - ${t4Name}`, value: t4Value, inline: false });

    const t5Name = lang.getString(
      this.guildId,
      "train_5_name",
      {},
      this.guildLocale
    );
    const t5Value = effectLines(trainings[5].effects).join("\n");
    fields.push({ name: `5 - ${t5Name}`, value: t5Value, inline: false });

    const t6Name = lang.getString(
      this.guildId,
      "train_6_name",
      {},
      this.guildLocale
    );
    const t6Value = effectLines(trainings[6].effects).join("\n");
    fields.push({ name: `6 - ${t6Name}`, value: t6Value, inline: false });

    const t7Name = lang.getString(
      this.guildId,
      "train_7_name",
      {},
      this.guildLocale
    );
    const t7Value = effectLines(trainings[7].effects).join("\n");
    fields.push({ name: `7 - ${t7Name}`, value: t7Value, inline: false });

    const t8Name = lang.getString(
      this.guildId,
      "train_8_name",
      {},
      this.guildLocale
    );
    const t8Value = lang.getString(
      this.guildId,
      "train_8_description",
      {},
      this.guildLocale
    );
    fields.push({ name: `8 - ${t8Name}`, value: t8Value, inline: false });

    const promptTitle = lang.getString(
      this.guildId,
      "train_prompt_title",
      {},
      this.guildLocale
    );
    const promptValue = lang.getString(
      this.guildId,
      "train_prompt_select_training",
      {},
      this.guildLocale
    );
    fields.push({ name: promptTitle, value: promptValue, inline: false });

    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(title)
      .setDescription(description)
      .addFields(...fields)
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedTrainMenu;
