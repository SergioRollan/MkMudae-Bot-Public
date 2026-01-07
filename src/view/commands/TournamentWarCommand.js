const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedWarRequest = require("../../extras/embedbuilder/embedcomponents/war/EmbedWarRequest");
const WarType = require("../../enums/WarType");

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
        "tournamentwar_error_no_opponent",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
      return;
    }

    const challenger = message.author;

    const amount = 0;

    const result = await model.createWarRequest(
      challenger.id,
      opponent.id,
      WarType.TOURNAMENTWAR,
      amount,
      {
        guildId,
      }
    );

    if (!result.success) {
      let errorKey = "tournamentwar_error_unknown";
      const params = {};

      switch (result.error) {
        case "invalid_users":
          errorKey = "tournamentwar_error_no_opponent";
          break;
        case "self_request":
          errorKey = "tournamentwar_error_self";
          break;
        case "invalid_amount":
          errorKey = "tournamentwar_error_invalid_amount";
          break;
        case "already_pending":
          errorKey = "tournamentwar_error_already_pending";
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

    const embed = new EmbedWarRequest({
      type: WarType.TOURNAMENTWAR,
      challengerTag: challenger.toString(),
      opponentTag: opponent.toString(),
      amount: 0,
      guildId,
      guildLocale,
    });

    await message.reply({ embeds: [embed.build()] });

    const timeoutId = setTimeout(async () => {
      model.expireWarRequest(result.key);

      const timeoutMessage = langManager.getString(
        guildId,
        "tournamentwar_request_timeout",
        {
          challenger: challenger.toString(),
          opponent: opponent.toString(),
        },
        guildLocale
      );

      try {
        await message.channel.send({ content: timeoutMessage });
      } catch (err) {
        console.error(
          "❌ Error enviando mensaje de timeout de tournamentwar:",
          err
        );
      }
    }, 30000);

    model.setWarRequestTimeout(result.key, timeoutId);
  },
};
