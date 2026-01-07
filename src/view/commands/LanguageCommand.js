const { SlashCommandBuilder } = require("discord.js");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedLanguageUpdated = require("../../extras/embedbuilder/embedcomponents/EmbedLanguageUpdated");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const LangDAO = require("../../dao/LangDAO");
const Utils = require("../../extras/Utils");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Changes the bot language in this server")
    .addStringOption((option) =>
      option
        .setName("idioma")
        .setDescription("Select the language")
        .setRequired(true)
        .addChoices(
          { name: "Español", value: "es" },
          { name: "English", value: "en" },
          { name: "Français", value: "fr" }
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guild?.id;
    let guildLocale = interaction.guild?.preferredLocale || null;

    if (interaction.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: interaction.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    const langManager = LanguageManager.getInstance();
    const selectedLang = interaction.options.getString("idioma");

    if (!guildId) {
      const message = langManager.getString(
        null,
        "language_only_server",
        {},
        guildLocale
      );
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
      return;
    }

    if (!(await Utils.hasAdminPermissions(interaction.member, guildId))) {
      const errorMessage = langManager.getString(
        guildId,
        "language_no_permission",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await interaction.reply({
        embeds: [errorEmbed.build()],
        ephemeral: true,
      });
      return;
    }

    const success = langManager.setGuildLanguage(guildId, selectedLang);

    if (!success) {
      const message = langManager.getString(
        guildId,
        "language_invalid",
        {},
        guildLocale
      );
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
      return;
    }

    await saveLanguageToDB(guildId, selectedLang);
    langManager.setGuildLanguageFromDB(guildId, selectedLang);

    const langNames = {
      es: "Español",
      en: "English",
      fr: "Français",
    };

    const embed = new EmbedLanguageUpdated(
      langNames[selectedLang],
      guildId,
      guildLocale
    );
    await interaction.reply({ embeds: [embed.build()], ephemeral: false });
  },
  async autocomplete(interaction) {},
};

async function saveLanguageToDB(guildId, language) {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️ DATABASE_URL no está definido, omitiendo guardado en BD");
    return;
  }

  try {
    const langDAO = new LangDAO();
    await langDAO.upsertLanguage(guildId, language);
    console.log(`✅ Idioma guardado en BD para guild ${guildId}: ${language}`);
  } catch (error) {
    console.error("❌ Error guardando idioma en BD:", error);
  }
}
