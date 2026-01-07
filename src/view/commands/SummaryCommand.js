const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const LanguageManager = require("../../managers/LanguageManager");
const Utils = require("../../extras/Utils");
const EmbedSummary = require("../../extras/embedbuilder/embedcomponents/EmbedSummary");
const EmbedSummaryOption = require("../../extras/embedbuilder/embedcomponents/EmbedSummaryOption");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Shows a summary of the bot functionalities")
    .addStringOption((option) =>
      option
        .setName("option")
        .setDescription("Specific summary option")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("language")
        .setDescription("Language to display the summary (es/en/fr)")
        .setRequired(false)
        .addChoices(
          { name: "Español", value: "es" },
          { name: "English", value: "en" },
          { name: "Français", value: "fr" }
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guild?.id || null;
    let guildLocale = interaction.guild?.preferredLocale || null;

    const languageOption = interaction.options.getString("language");
    if (languageOption && ["es", "en", "fr"].includes(languageOption)) {
      guildLocale = languageOption;
    } else if (interaction.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: interaction.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    const langManager = LanguageManager.getInstance();
    const optionValue = interaction.options.getString("option");

    if (optionValue) {
      const validOptions = ["basics", "war", "advanced", "contact"];
      if (!validOptions.includes(optionValue.toLowerCase())) {
        const errorMessage = langManager.getString(
          guildId,
          "summary_option_not_found_description",
          { option: optionValue },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        const errorEmbedBuilt = errorEmbed.build();
        errorEmbedBuilt.setTitle(
          langManager.getString(
            guildId,
            "summary_option_not_found",
            { option: optionValue },
            guildLocale
          )
        );
        await interaction.reply({ embeds: [errorEmbedBuilt], ephemeral: true });
        return;
      }
    }

    const optionForButton = optionValue ? optionValue.toLowerCase() : "general";

    const localeSuffix = languageOption ? `_${languageOption}` : "";

    const questionMessage = optionValue
      ? langManager.getString(
          guildId,
          "summary_question_option",
          { option: optionValue },
          guildLocale
        )
      : langManager.getString(
          guildId,
          "summary_question_general",
          {},
          guildLocale
        );

    const hereButton = new ButtonBuilder()
      .setCustomId(`summary_here_${optionForButton}${localeSuffix}`)
      .setLabel(
        langManager.getString(guildId, "summary_button_here", {}, guildLocale)
      )
      .setStyle(ButtonStyle.Primary);

    const dmButton = new ButtonBuilder()
      .setCustomId(`summary_dm_${optionForButton}${localeSuffix}`)
      .setLabel(
        langManager.getString(guildId, "summary_button_dm", {}, guildLocale)
      )
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hereButton, dmButton);

    await interaction.reply({
      content: questionMessage,
      components: [row],
    });
  },
  async handleMessage(message, args) {
    const guildId = message.guild?.id || null;
    const langManager = LanguageManager.getInstance();
    let guildLocale = message.guild?.preferredLocale || null;

    if (message.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: message.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    const option = args[0]?.toLowerCase();
    const validOptions = ["basics", "war", "advanced", "contact"];

    if (option && validOptions.includes(option)) {
      const summaryOptionEmbed = new EmbedSummaryOption(
        option,
        guildId,
        guildLocale
      );
      const embed = summaryOptionEmbed.build();
      if (embed) {
        await message.reply({ embeds: [embed] });
      } else {
        const errorMessage = langManager.getString(
          guildId,
          "summary_option_not_found_description",
          { option: option },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
      }
    } else {
      const summaryMessage = langManager.getString(
        guildId,
        "summary_message_command",
        {},
        guildLocale
      );
      const summaryEmbed = new EmbedSummary(guildId, guildLocale);
      const embed = summaryEmbed.build();
      embed.setDescription(summaryMessage);

      await message.reply({ embeds: [embed] });
    }
  },
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "option") {
      const optionList = [
        { name: "basics", value: "basics" },
        { name: "war", value: "war" },
        { name: "advanced", value: "advanced" },
        { name: "contact", value: "contact" },
      ];

      const filtered = optionList.filter((option) =>
        option.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
      );

      await interaction.respond(
        filtered.slice(0, 25).map((option) => ({
          name: option.name,
          value: option.value,
        }))
      );
    }
  },
};
