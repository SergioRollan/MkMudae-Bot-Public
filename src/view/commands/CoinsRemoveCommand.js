const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    if (!message.guild) {
      const errorMessage = langManager.getString(
        guildId,
        "coinsremove_only_server",
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
        "coinsremove_no_permission",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const mentions = Array.from(message.mentions.users.values());
      const targetUser = mentions.length > 0 ? mentions[0] : message.author;

      const textArgs = args.filter((arg) => !arg.startsWith("<@"));

      if (textArgs.length === 0) {
        const errorMessage = langManager.getString(
          guildId,
          "coinsremove_missing_amount",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const amountStr = textArgs[0];
      const amount = Number(amountStr);

      if (!Number.isFinite(amount) || amount <= 0) {
        const errorMessage = langManager.getString(
          guildId,
          "coinsremove_invalid_amount",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const targetDiscordId = targetUser.id;
      const targetDiscordServerId = guildId || "DM";
      const targetName = targetUser.username;

      const removeResult = await model.removeCoinsFromUser(
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        amount,
        guildLocale
      );

      if (!removeResult.success) {
        let errorKey = "error_processing_command";
        let params = {};

        switch (removeResult.error) {
          case "user_not_found":
            errorKey = "coinsremove_user_not_found";
            break;
          case "invalid_amount":
            errorKey = "coinsremove_invalid_amount";
            break;
          case "insufficient_coins":
            errorKey = "coinsremove_insufficient_coins";
            params = { user: targetUser.username };
            break;
          default:
            break;
        }

        const errorMessage = langManager.getString(
          guildId,
          errorKey,
          params,
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const successMessage = langManager.getString(
        guildId,
        "coinsremove_success",
        {
          user: targetUser.username,
          amount: removeResult.removedCoins.toLocaleString(),
          previous: removeResult.previousCoins.toLocaleString(),
          new: removeResult.newCoins.toLocaleString(),
        },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en CoinsRemoveCommand:", error);
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
