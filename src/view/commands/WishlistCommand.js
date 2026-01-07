const Model = require("../../model/Model");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedWishlist = require("../../extras/embedbuilder/embedcomponents/EmbedWishlist");
const LanguageManager = require("../../managers/LanguageManager");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      let targetUser = message.author;
      let isOwnWishlist = true;

      if (args.length > 0 && message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
        isOwnWishlist = false;
      } else if (args.length > 0) {
        const errorMessage = langManager.getString(
          guildId,
          "wishlist_invalid_mention",
          {},
          guildLocale
        );

        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = targetUser.id;
      const discordServerId = guildId || "DM";
      const userName = targetUser.username;

      const user = await model.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );
      const teamName = user?.TeamName || user?.Name || userName;

      const userRank = await model.getUserRankData(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );
      const maxWishlists = userRank.wishlists;

      const result = await model.getUserWishlist(discordId, discordServerId);

      if (!result.success || result.players.length === 0) {
        const wishlistEmbed = new EmbedWishlist(
          teamName,
          true,
          0,
          maxWishlists,
          guildId,
          guildLocale
        );
        await message.reply({ embeds: [wishlistEmbed.build()] });
        return;
      }

      const wishlistEmbed = new EmbedWishlist(
        teamName,
        false,
        result.count,
        maxWishlists,
        guildId,
        guildLocale
      );
      const embed = wishlistEmbed.build();

      for (let i = 0; i < result.players.length; i++) {
        const player = result.players[i];
        const mmr = player.MMR || 0;
        const playerName =
          player.Alias ||
          player.Name ||
          player.LoungeName ||
          langManager.getString(
            guildId,
            "wishlist_unknown_player",
            {},
            guildLocale
          );

        let mmrEmoji = "";
        if (mmr >= 13500) {
          mmrEmoji = "<:emoji:1441958268195962952>";
        } else if (mmr >= 12500) {
          mmrEmoji = "<:emoji:1441958336567312404>";
        } else if (mmr >= 11000) {
          mmrEmoji = "<:emoji:1441958204937601064>";
        } else if (mmr >= 9500) {
          mmrEmoji = "<:emoji:1441958385619828810>";
        } else if (mmr >= 8000) {
          mmrEmoji = "<:emoji:1441958418297655367>";
        } else if (mmr >= 6500) {
          mmrEmoji = "<:emoji:1441958362958008332>";
        } else if (mmr >= 5000) {
          mmrEmoji = "<:emoji:1441958237296660531>";
        } else if (mmr >= 3500) {
          mmrEmoji = "<:emoji:1441958450354716692>";
        } else if (mmr >= 2000) {
          mmrEmoji = "<:emoji:1441958154010234973>";
        } else {
          mmrEmoji = "<:emoji:1441958305466552340>";
        }

        embed.addFields({
          name: `${mmrEmoji} **${playerName}**`,
          value: `**MMR:** ${mmr} | **Peak:** ${
            player.PeakMMR || 0
          } | **Eventos:** ${player.Events || 0}`,
          inline: true,
        });
      }

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ Error en wishlistCommand:", error);

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
