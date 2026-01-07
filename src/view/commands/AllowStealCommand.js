const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleMessage(message, args) {
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    if (!message.guild) {
      const errorMessage = langManager.getString(
        guildId,
        "allowsteal_only_server",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    if (!(await Utils.hasAdminPermissions(message.member, guildId))) {
      const errorMessage = langManager.getString(
        guildId,
        "allowsteal_no_permission",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      if (args.length === 0) {
        const config = Utils.getConfig();
        const allowSteal = config.allowSteal || {};
        const currentSetting = allowSteal[guildId];

        const statusKey =
          currentSetting === true
            ? "allowsteal_status_enabled"
            : "allowsteal_status_disabled";
        const statusMessage = langManager.getString(
          guildId,
          statusKey,
          {},
          guildLocale
        );
        const statusEmbed = new EmbedSuccess(
          statusMessage,
          guildId,
          guildLocale
        );
        await message.reply({ embeds: [statusEmbed.build()] });
        return;
      }

      const value = args[0].trim();

      if (value !== "0" && value !== "1") {
        const errorMessage = langManager.getString(
          guildId,
          "allowsteal_invalid_value",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const allowSteal = value === "1";

      const config = Utils.getConfig();

      if (!config.allowSteal) {
        config.allowSteal = {};
      }

      config.allowSteal[guildId] = allowSteal;
      Utils.saveConfig(config);

      const successKey = allowSteal
        ? "allowsteal_enabled"
        : "allowsteal_disabled";
      const successMessage = langManager.getString(
        guildId,
        successKey,
        {},
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en AllowStealCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
