const LanguageManager = require("../../managers/LanguageManager");
const EmbedHelp = require("../../extras/embedbuilder/embedcomponents/EmbedHelp");
const EmbedHelpCommand = require("../../extras/embedbuilder/embedcomponents/EmbedHelpCommand");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleInteraction(interaction) {
    const langManager = LanguageManager.getInstance();
    const guildId = interaction.guild?.id || null;
    let guildLocale = interaction.guild?.preferredLocale || null;
    const customId = interaction.customId;

    if (!customId.startsWith("help_here_")) {
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
    let commandName = parts.slice(2).join("_");
    let buttonLocale = guildLocale;

    if (["es", "en", "fr"].includes(lastPart)) {
      buttonLocale = lastPart;

      commandName = parts.slice(2, -1).join("_");
    }

    try {
      let embed;

      if (commandName === "general") {
        const helpEmbed = new EmbedHelp(guildId, buttonLocale);
        embed = helpEmbed.build();
      } else {
        const helpCommandEmbed = new EmbedHelpCommand(
          commandName,
          guildId,
          buttonLocale
        );
        embed = helpCommandEmbed.build();

        if (!embed) {
          const errorMessage = langManager.getString(
            guildId,
            "help_command_not_found_description",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          const errorEmbedBuilt = errorEmbed.build();
          errorEmbedBuilt.setTitle(
            langManager.getString(
              guildId,
              "help_command_not_found",
              { command: commandName },
              guildLocale
            )
          );
          embed = errorEmbedBuilt;
        }
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

      return true;
    } catch (error) {
      console.error("❌ Error en HelpHereButton:", error);
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
