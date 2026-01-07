const LanguageManager = require("../../managers/LanguageManager");
const EmbedSummary = require("../../extras/embedbuilder/embedcomponents/EmbedSummary");
const EmbedSummaryOption = require("../../extras/embedbuilder/embedcomponents/EmbedSummaryOption");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleInteraction(interaction) {
    const langManager = LanguageManager.getInstance();
    const guildId = interaction.guild?.id || null;
    let guildLocale = interaction.guild?.preferredLocale || null;
    const customId = interaction.customId;

    if (!customId.startsWith("summary_dm_")) {
      return false;
    }

    if (interaction.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: interaction.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    const parts = customId.split("_");
    if (parts.length < 3) {
      return false;
    }

    const lastPart = parts[parts.length - 1];
    let optionName = parts.slice(2).join("_");
    let buttonLocale = guildLocale;

    if (["es", "en", "fr"].includes(lastPart)) {
      buttonLocale = lastPart;

      optionName = parts.slice(2, -1).join("_");
    }

    try {
      let embed;

      if (optionName === "general") {
        const summaryEmbed = new EmbedSummary(guildId, buttonLocale);
        embed = summaryEmbed.build();
      } else {
        const summaryOptionEmbed = new EmbedSummaryOption(
          optionName,
          guildId,
          buttonLocale
        );
        embed = summaryOptionEmbed.build();

        if (!embed) {
          const errorMessage = langManager.getString(
            guildId,
            "summary_option_not_found_description",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          const errorEmbedBuilt = errorEmbed.build();
          errorEmbedBuilt.setTitle(
            langManager.getString(
              guildId,
              "summary_option_not_found",
              { option: optionName },
              guildLocale
            )
          );
          embed = errorEmbedBuilt;
        }
      }

      try {
        await interaction.user.send({ embeds: [embed] });
        const successMessage = langManager.getString(
          guildId,
          "summary_dm_sent",
          {},
          guildLocale
        );
        await interaction.reply({
          content: successMessage,
          ephemeral: true,
        });
      } catch (dmError) {
        const errorMessage = langManager.getString(
          guildId,
          "summary_dm_error",
          {},
          guildLocale
        );
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }

      return true;
    } catch (error) {
      console.error("❌ Error en SummaryDmButton:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_button",
        {},
        guildLocale
      );
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }
      return true;
    }
  },
};
