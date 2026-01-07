const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedWarRequest = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarRequest");
const DecoratorWarBetField = require("../../extras/embedbuilder/decorators/DecoratorWarBetField");
const WarType = require("../../enums/WarType");

function parseAmount(args) {
  for (const arg of args) {
    const normalized = arg.replace(/[,.\s]/g, "");
    if (/^\d+$/.test(normalized)) {
      return Number(normalized);
    }
  }
  return 0;
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    const opponent = message.mentions.users.first();
    if (!opponent) {
      const errorMessage = langManager.getString(
        guildId,
        "war_error_no_opponent",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    const challenger = message.author;
    const amount = parseAmount(
      args.filter((arg) => !arg.includes("<@") && !arg.includes("<@!"))
    );

    if (amount > 0) {
      const metadataGuildId = guildId || "DM";
      try {
        const [challengerRecord, opponentRecord] = await Promise.all([
          model.getUser(
            challenger.id,
            metadataGuildId,
            challenger.username,
            guildLocale
          ),
          model.getUser(
            opponent.id,
            metadataGuildId,
            opponent.username,
            guildLocale
          ),
        ]);

        const challengerCoins = challengerRecord?.Coins || 0;
        const opponentCoins = opponentRecord?.Coins || 0;

        if (challengerCoins < amount || opponentCoins < amount) {
          const insufficientUser =
            challengerCoins < amount
              ? challengerRecord?.Name || challenger.username
              : opponentRecord?.Name || opponent.username;
          const errorMessage = langManager.getString(
            guildId,
            "war_error_insufficient_bet",
            {
              user: insufficientUser,
              amount: amount.toLocaleString(),
            },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }
      } catch (err) {
        console.error("❌ Error verificando coins para scrim:", err);
        const errorMessage = langManager.getString(
          guildId,
          "scrim_error_unknown",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }
    }

    const result = await model.createWarRequest(
      challenger.id,
      opponent.id,
      WarType.SCRIM,
      amount,
      {
        guildId,
      }
    );

    if (!result.success) {
      let errorKey = "scrim_error_unknown";
      switch (result.error) {
        case "invalid_users":
          errorKey = "war_error_no_opponent";
          break;
        case "self_request":
          errorKey = "scrim_error_self";
          break;
        case "invalid_amount":
          errorKey = "scrim_error_invalid_amount";
          break;
        case "already_pending":
          errorKey = "scrim_error_already_pending";
          break;
        default:
          break;
      }

      const errorMessage = langManager.getString(
        guildId,
        errorKey,
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    let embed = new EmbedWarRequest({
      type: WarType.SCRIM,
      challengerTag: challenger.toString(),
      opponentTag: opponent.toString(),
      amount,
      guildId,
      guildLocale,
    });

    embed = new DecoratorWarBetField(embed, amount || 0, guildId, guildLocale);

    await message.reply({ embeds: [embed.build()] });

    const timeoutId = setTimeout(async () => {
      model.expireWarRequest(result.key);

      const timeoutMessage = langManager.getString(
        guildId,
        "scrim_request_timeout",
        {
          challenger: challenger.toString(),
          opponent: opponent.toString(),
        },
        guildLocale
      );

      try {
        await message.channel.send({ content: timeoutMessage });
      } catch (err) {
        console.error("❌ Error enviando mensaje de timeout de scrim:", err);
      }
    }, 30000);

    model.setWarRequestTimeout(result.key, timeoutId);
  },
};
