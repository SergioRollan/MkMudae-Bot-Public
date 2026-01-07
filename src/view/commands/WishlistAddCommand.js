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
          "wishlistadd_no_player_name",
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

      const result = await model.addPlayerToWishlist(
        discordId,
        discordServerId,
        userName,
        playerName
      );

      if (!result.success) {
        let errorMessage = "";
        switch (result.error) {
          case "wishlist_full":
            errorMessage = langManager.getString(
              guildId,
              "wishlistadd_full",
              { max: result.maxWishlist },
              guildLocale
            );
            break;
          case "player_not_found":
            errorMessage = langManager.getString(
              guildId,
              "wishlistadd_player_not_found",
              { name: playerName },
              guildLocale
            );
            break;
          case "already_in_wishlist":
            errorMessage = langManager.getString(
              guildId,
              "wishlistadd_already_in_wishlist",
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
        "wishlistadd_success",
        { name: playerDisplayName },
        guildLocale
      );

      const successEmbed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setDescription(successMessage)
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("❌ Error en wishlistAddCommand:", error);

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
