const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const LanguageManager = require("../../managers/LanguageManager");
const Model = require("../../model/Model");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      if (args.length < 2) {
        const errorMessage = langManager.getString(
          guildId,
          "gift_invalid_syntax",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const mentions = Array.from(message.mentions.users.values());
      if (mentions.length === 0) {
        const errorMessage = langManager.getString(
          guildId,
          "gift_no_mention",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const recipientUser = mentions[0];

      if (recipientUser.id === message.author.id) {
        const errorMessage = langManager.getString(
          guildId,
          "gift_cannot_gift_self",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const playerNameParts = args.filter((arg) => !arg.startsWith("<@"));
      const playerName = playerNameParts.join(" ").trim();

      if (!playerName) {
        const errorMessage = langManager.getString(
          guildId,
          "gift_no_player_name",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const senderDiscordId = message.author.id;
      const senderDiscordServerId = guildId || "DM";
      const senderName = message.author.username;

      const senderUser = await model.getUser(
        senderDiscordId,
        senderDiscordServerId,
        senderName,
        guildLocale
      );

      const ownedPlayers = await model.getUserOwnedPlayers(senderUser.UserID);
      const playerMatch = model.matchOwnedPlayerByInput(
        ownedPlayers,
        playerName
      );

      if (!playerMatch) {
        const errorMessage = langManager.getString(
          guildId,
          "gift_player_not_owned",
          { name: playerName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const player = playerMatch.data;

      const recipientDiscordId = recipientUser.id;
      const recipientDiscordServerId = guildId || "DM";
      const recipientName = recipientUser.username;

      const recipientUserDB = await model.getUser(
        recipientDiscordId,
        recipientDiscordServerId,
        recipientName,
        guildLocale
      );

      const playerDisplayName = playerMatch.displayName || playerName;
      const confirmMessage = langManager.getString(
        guildId,
        "gift_confirm_prompt",
        {
          player: playerDisplayName,
          recipient: recipientName,
        },
        guildLocale
      );

      await message.reply({ content: confirmMessage });

      const filter = (response) => response.author.id === message.author.id;

      let confirmationResponse;
      try {
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
          errors: ["time"],
        });

        confirmationResponse = collected.first();
      } catch (err) {
        const timeoutMessage = langManager.getString(
          guildId,
          "gift_confirm_timeout",
          {},
          guildLocale
        );
        await message.reply({ content: timeoutMessage });
        return;
      }

      const answer = confirmationResponse.content.trim().toLowerCase();

      const yesValues = ["y", "yes", "s", "si", "sí"];
      const noValues = ["n", "no"];

      if (noValues.includes(answer)) {
        const cancelledMessage = langManager.getString(
          guildId,
          "gift_confirm_cancelled",
          {},
          guildLocale
        );
        await message.reply({ content: cancelledMessage });
        return;
      }

      if (!yesValues.includes(answer)) {
        const invalidMessage = langManager.getString(
          guildId,
          "gift_confirm_invalid",
          {},
          guildLocale
        );
        await message.reply({ content: invalidMessage });
        return;
      }

      const transferResult = await model.transferOwnershipWithRosterCheck(
        senderUser.UserID,
        recipientUserDB.UserID,
        recipientDiscordId,
        recipientDiscordServerId,
        recipientName,
        player.IDPlayer,
        guildLocale
      );

      if (!transferResult.success) {
        let errorMessage = "";
        if (transferResult.error === "not_owned") {
          errorMessage = langManager.getString(
            guildId,
            "gift_player_not_owned",
            { name: playerName },
            guildLocale
          );
        } else if (transferResult.error === "recipient_already_owns") {
          errorMessage = langManager.getString(
            guildId,
            "gift_recipient_already_owns",
            { name: recipientName },
            guildLocale
          );
        } else if (transferResult.error === "recipient_roster_full") {
          errorMessage = langManager.getString(
            guildId,
            "gift_recipient_roster_full",
            {
              recipient: recipientName,
              current: transferResult.currentCount,
              max: transferResult.maxRoster,
              toSell: transferResult.toSell,
            },
            guildLocale
          );
        } else {
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

      const candidateNames = [
        playerMatch.displayName,
        player.LoungeName,
        player.Alias,
        player.Name,
        playerName,
      ].filter((value) => typeof value === "string" && value.trim().length > 0);

      try {
        await model.removePlayerFromLineupRecord(senderUser, {
          playerIds: [player.IDPlayer],
          candidateNames,
        });
      } catch (err) {
        console.error(
          "⚠️ No se pudo quitar el jugador de la lineup tras gift:",
          err
        );
      }

      try {
        const loungeId =
          player.LoungeID || player.lounge_id || player.id || player.loungeId;
        if (loungeId && recipientUserDB?.UserID) {
          const removeResult =
            await model.wishlistDAO.removePlayerFromWishlistByLoungeId(
              recipientUserDB.UserID,
              loungeId
            );
          if (removeResult.success && removeResult.removedCount > 0) {
            console.log(
              `✅ Jugador con LoungeID ${loungeId} eliminado automáticamente de la wishlist del usuario ${recipientUserDB.UserID} tras gift`
            );
          }
        } else if (recipientUserDB?.UserID) {
          const removeResult = await model.wishlistDAO.removePlayerFromWishlist(
            recipientUserDB.UserID,
            player.IDPlayer
          );
          if (removeResult.success) {
            console.log(
              `✅ Jugador ${player.IDPlayer} eliminado automáticamente de la wishlist del usuario ${recipientUserDB.UserID} tras gift`
            );
          }
        }
      } catch (wishlistError) {
        console.error(
          "⚠️ Error eliminando jugador de wishlist del receptor tras gift:",
          wishlistError
        );
      }

      const realName = player.LoungeName || player.Name || playerDisplayName;
      const normalizedInput = model.normalizePlayerKey(playerName);
      const normalizedRealName = model.normalizePlayerKey(realName);
      const normalizedDisplayName = model.normalizePlayerKey(playerDisplayName);

      let finalPlayerDisplayName = playerDisplayName;
      if (
        normalizedInput !== normalizedRealName &&
        normalizedDisplayName !== normalizedRealName
      ) {
        finalPlayerDisplayName = `${playerDisplayName} (${realName})`;
      }

      const successMessage = langManager.getString(
        guildId,
        "gift_success_description",
        { player: finalPlayerDisplayName, recipient: recipientName },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );

      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en GiftCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      await message.reply({ content: errorMessage });
    }
  },
};
