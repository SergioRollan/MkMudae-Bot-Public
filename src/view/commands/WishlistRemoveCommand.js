const Model = require("../../model/Model");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const { EmbedBuilder } = require("discord.js");
const LanguageManager = require("../../managers/LanguageManager");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const playerName = args.join(" ").trim();

      if (!playerName) {
        const errorMessage = langManager.getString(
          guildId,
          "wishlistremove_no_player_name",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const result = await model.removePlayerFromWishlist(
        discordId,
        discordServerId,
        userName,
        playerName
      );

      if (!result.success) {
        let errorMessage = "";
        switch (result.error) {
          case "not_in_wishlist":
            errorMessage = langManager.getString(
              guildId,
              "wishlistremove_not_in_wishlist",
              { name: playerName },
              guildLocale
            );
            break;
          case "player_not_found":
            errorMessage = langManager.getString(
              guildId,
              "wishlistremove_player_not_found",
              { name: playerName },
              guildLocale
            );
            break;
          default:
            errorMessage = langManager.getString(
              guildId,
              "error_processing_command",
              {},
              guildLocale
            );
        }
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const playerDisplayName =
        result.player.Alias || result.player.Name || playerName;

      const successMessage = langManager.getString(
        guildId,
        "wishlistremove_success",
        { name: playerDisplayName },
        guildLocale
      );

      const successEmbed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setDescription(successMessage)
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("❌ Error en wishlistRemoveCommand:", error);

      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const finalEmbed = errorEmbed.build();
      finalEmbed.setFooter({ text: error.message });

      await message.reply({ embeds: [finalEmbed] });
    }
  },
};
