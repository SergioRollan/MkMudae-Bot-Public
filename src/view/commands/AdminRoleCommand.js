const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const { PermissionFlagsBits } = require("discord.js");
const AdminRoleDAO = require("../../dao/AdminRoleDAO");

module.exports = {
  async handleMessage(message, args) {
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    if (!message.guild) {
      const errorMessage = langManager.getString(
        guildId,
        "adminrole_only_server",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    if (
      !message.member ||
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      const errorMessage = langManager.getString(
        guildId,
        "adminrole_no_permission",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const adminRoleDAO = new AdminRoleDAO();

      if (args.length === 0) {
        const adminRoleRecord = await adminRoleDAO.getByGuildId(guildId);

        if (!adminRoleRecord || !adminRoleRecord.role_name) {
          const infoMessage = langManager.getString(
            guildId,
            "adminrole_not_set",
            {},
            guildLocale
          );
          const infoEmbed = new EmbedSuccess(infoMessage, guildId, guildLocale);
          await message.reply({ embeds: [infoEmbed.build()] });
          return;
        }

        const infoMessage = langManager.getString(
          guildId,
          "adminrole_current",
          { role: adminRoleRecord.role_name },
          guildLocale
        );
        const infoEmbed = new EmbedSuccess(infoMessage, guildId, guildLocale);
        await message.reply({ embeds: [infoEmbed.build()] });
        return;
      }

      const roleName = args.join(" ").trim();

      if (!roleName) {
        const errorMessage = langManager.getString(
          guildId,
          "adminrole_missing_name",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const role = message.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase()
      );

      if (!role) {
        const errorMessage = langManager.getString(
          guildId,
          "adminrole_not_found",
          { role: roleName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      await adminRoleDAO.upsertAdminRole(guildId, role.name);

      const successMessage = langManager.getString(
        guildId,
        "adminrole_success",
        { role: role.name },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en AdminRoleCommand:", error);
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

