const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedHelpCommand extends IEmbed {
  constructor(commandName, guildId = null, guildLocale = null) {
    super();
    this.commandName = commandName;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const commandNameLower = this.commandName.toLowerCase();

    let descriptionKey = `help_${commandNameLower}_description`;
    let usageKey = `help_${commandNameLower}_usage`;
    let examplesKey = `help_${commandNameLower}_examples`;
    let detailsKey = `help_${commandNameLower}_details`;

    const description = lang.getString(
      this.guildId,
      descriptionKey,
      {},
      this.guildLocale
    );
    const usage = lang.getString(this.guildId, usageKey, {}, this.guildLocale);
    const examples = lang.getString(
      this.guildId,
      examplesKey,
      {},
      this.guildLocale
    );
    const details = lang.getString(
      this.guildId,
      detailsKey,
      {},
      this.guildLocale
    );

    if (
      !description ||
      !usage ||
      !examples ||
      !details ||
      description === descriptionKey ||
      usage === usageKey ||
      examples === examplesKey ||
      details === detailsKey
    ) {
      return null;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        lang.getString(
          this.guildId,
          "help_command_title",
          { command: this.commandName },
          this.guildLocale
        )
      )
      .setDescription(description)
      .addFields([
        {
          name: lang.getString(
            this.guildId,
            "help_usage",
            {},
            this.guildLocale
          ),
          value: usage,
          inline: false,
        },
        {
          name: lang.getString(
            this.guildId,
            "help_examples",
            {},
            this.guildLocale
          ),
          value: examples,
          inline: false,
        },
        {
          name: lang.getString(
            this.guildId,
            "help_details",
            {},
            this.guildLocale
          ),
          value: details,
          inline: false,
        },
      ])
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedHelpCommand;
