const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    const mentions = Array.from(message.mentions.users.values());
    const targetUser = mentions.length > 0 ? mentions[0] : null;

    if (!targetUser) {
      const errorMessage = langManager.getString(
        guildId,
        "trade_no_mention",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    if (targetUser.id === message.author.id) {
      const errorMessage = langManager.getString(
        guildId,
        "trade_cannot_trade_with_self",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    const textArgs = args.filter((arg) => !arg.startsWith("<@"));
    const fullText = textArgs.join(" ");

    function extractQuotedText(text, startIndex = 0) {
      const quoteStart = text.indexOf('"', startIndex);
      if (quoteStart === -1) return null;

      const quoteEnd = text.indexOf('"', quoteStart + 1);
      if (quoteEnd === -1) return null;

      return {
        text: text.slice(quoteStart + 1, quoteEnd).trim(),
        nextIndex: quoteEnd + 1,
      };
    }

    let initiatorPlayerName = "";
    let targetPlayerName = "";

    const firstQuote = extractQuotedText(fullText, 0);
    if (firstQuote) {
      initiatorPlayerName = firstQuote.text;

      const secondQuote = extractQuotedText(fullText, firstQuote.nextIndex);
      if (!secondQuote) {
        const errorMessage = langManager.getString(
          guildId,
          "trade_missing_quotes",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      targetPlayerName = secondQuote.text;
    } else {
      if (textArgs.length < 2) {
        const errorMessage = langManager.getString(
          guildId,
          "trade_missing_players",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      if (textArgs.length > 2) {
        const errorMessage = langManager.getString(
          guildId,
          "trade_suggest_quotes",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      initiatorPlayerName = textArgs[0].trim();
      targetPlayerName = textArgs.slice(1).join(" ").trim();
    }

    if (!initiatorPlayerName || !targetPlayerName) {
      const errorMessage = langManager.getString(
        guildId,
        "trade_missing_players",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    try {
      const initiatorDiscordId = message.author.id;
      const initiatorDiscordServerId = guildId || "DM";
      const initiatorName = message.author.username;
      const targetDiscordId = targetUser.id;
      const targetDiscordServerId = guildId || "DM";
      const targetName = targetUser.username;

      const result = await model.createTradeOffer(
        initiatorDiscordId,
        initiatorDiscordServerId,
        initiatorName,
        targetDiscordId,
        targetDiscordServerId,
        targetName,
        initiatorPlayerName,
        targetPlayerName,
        guildLocale
      );

      if (!result.success) {
        let errorKey = "trade_unknown_error";
        if (result.error === "initiator_player_not_owned") {
          errorKey = "trade_initiator_player_not_owned";
        } else if (result.error === "target_player_not_owned") {
          errorKey = "trade_target_player_not_owned";
        } else if (result.error === "same_player") {
          errorKey = "trade_same_player";
        } else if (result.error === "already_pending") {
          errorKey = "trade_already_pending";
        } else if (result.error === "cannot_trade_with_self") {
          errorKey = "trade_cannot_trade_with_self";
        }

        const errorMessage = langManager.getString(
          guildId,
          errorKey,
          {
            initiatorPlayer: initiatorPlayerName,
            targetPlayer: targetPlayerName,
          },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const timeoutState = { occurred: false };

      const confirmMessage = langManager.getString(
        guildId,
        "trade_confirm_prompt",
        {
          initiator: initiatorName,
          initiatorPlayer: result.initiatorPlayerName,
          targetPlayer: result.targetPlayerName,
        },
        guildLocale
      );
      const confirmEmbed = new EmbedSuccess(
        confirmMessage,
        guildId,
        guildLocale
      );
      const confirmMsg = await message.channel.send({
        content: `<@${targetDiscordId}>`,
        embeds: [confirmEmbed.build()],
      });

      const timeoutId = setTimeout(async () => {
        const offer = model.tradeManager.getTradeOffer(
          result.initiatorUser.UserID,
          result.targetUser.UserID
        );

        if (offer && offer.status === "pending") {
          timeoutState.occurred = true;
          model.tradeManager.cancelOfferTimeout(
            result.initiatorUser.UserID,
            result.targetUser.UserID
          );
          model.tradeManager.removeTradeOffer(
            result.initiatorUser.UserID,
            result.targetUser.UserID
          );

          const timeoutMessage = langManager.getString(
            guildId,
            "trade_confirm_timeout",
            {},
            guildLocale
          );
          try {
            await message.channel.send({ content: timeoutMessage });
          } catch (err) {
            console.error("❌ Error enviando mensaje de timeout:", err);
          }
        }
      }, 30000);

      model.tradeManager.setOfferTimeout(
        result.initiatorUser.UserID,
        result.targetUser.UserID,
        timeoutId
      );

      const filter = (response) => response.author.id === targetDiscordId;

      try {
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
          errors: ["time"],
        });

        const confirmationResponse = collected.first();
        const answer = confirmationResponse.content.trim().toLowerCase();

        const yesValues = ["y", "yes", "s", "si", "sí"];
        const noValues = ["n", "no"];

        model.tradeManager.cancelOfferTimeout(
          result.initiatorUser.UserID,
          result.targetUser.UserID
        );

        if (noValues.includes(answer)) {
          model.tradeManager.removeTradeOffer(
            result.initiatorUser.UserID,
            result.targetUser.UserID
          );
          const cancelledMessage = langManager.getString(
            guildId,
            "trade_confirm_cancelled",
            {},
            guildLocale
          );
          await message.channel.send({ content: cancelledMessage });
          return;
        }

        if (!yesValues.includes(answer)) {
          model.tradeManager.removeTradeOffer(
            result.initiatorUser.UserID,
            result.targetUser.UserID
          );
          const invalidMessage = langManager.getString(
            guildId,
            "trade_confirm_invalid",
            {},
            guildLocale
          );
          await message.channel.send({ content: invalidMessage });
          return;
        }

        const completeResult = await model.completeTrade(
          targetDiscordId,
          targetDiscordServerId,
          targetName,
          initiatorDiscordId,
          guildLocale
        );

        if (!completeResult.success) {
          let errorKey = "trade_unknown_error";
          if (completeResult.error === "no_pending_offer") {
            errorKey = "trade_no_pending_offer";
          } else if (completeResult.error === "initiator_not_found") {
            errorKey = "trade_initiator_not_found";
          } else if (
            completeResult.error === "initiator_player_no_longer_owned"
          ) {
            errorKey = "trade_initiator_player_no_longer_owned";
          } else if (completeResult.error === "target_player_no_longer_owned") {
            errorKey = "trade_target_player_no_longer_owned";
          } else if (completeResult.error === "player_already_owned") {
            errorKey = "trade_player_already_owned";
          }

          const errorMessage = langManager.getString(
            guildId,
            errorKey,
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.channel.send({ embeds: [errorEmbed.build()] });
          return;
        }

        const initiatorRealName =
          completeResult.initiatorRealName ||
          completeResult.initiatorPlayerName;
        const targetRealName =
          completeResult.targetRealName || completeResult.targetPlayerName;

        const normalizedInitiatorDisplay = model.normalizePlayerKey(
          completeResult.initiatorPlayerName
        );
        const normalizedInitiatorReal =
          model.normalizePlayerKey(initiatorRealName);
        const normalizedTargetDisplay = model.normalizePlayerKey(
          completeResult.targetPlayerName
        );
        const normalizedTargetReal = model.normalizePlayerKey(targetRealName);

        let finalInitiatorPlayerName = completeResult.initiatorPlayerName;
        if (normalizedInitiatorDisplay !== normalizedInitiatorReal) {
          finalInitiatorPlayerName = `${completeResult.initiatorPlayerName} (${initiatorRealName})`;
        }

        let finalTargetPlayerName = completeResult.targetPlayerName;
        if (normalizedTargetDisplay !== normalizedTargetReal) {
          finalTargetPlayerName = `${completeResult.targetPlayerName} (${targetRealName})`;
        }

        const successMessage = langManager.getString(
          guildId,
          "trade_success",
          {
            initiator: initiatorName,
            target: targetName,
            initiatorPlayer: finalInitiatorPlayerName,
            targetPlayer: finalTargetPlayerName,
          },
          guildLocale
        );
        const finalSuccessEmbed = new EmbedSuccess(
          successMessage,
          guildId,
          guildLocale
        );
        await message.channel.send({ embeds: [finalSuccessEmbed.build()] });
      } catch (err) {
        if (
          err.name === "TimeoutError" ||
          err.message === "time" ||
          err.constructor.name === "TimeoutError"
        ) {
          timeoutState.occurred = true;
        } else {
          console.error("❌ Error esperando confirmación de trade:", err);
        }
      }
    } catch (error) {
      if (
        !timeoutState.occurred &&
        error.name !== "TimeoutError" &&
        error.message !== "time" &&
        error.constructor.name !== "TimeoutError"
      ) {
        console.error("❌ Error en TradeCommand:", error);
      }
    }
  },
};
