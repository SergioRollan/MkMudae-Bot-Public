const EmbedRankInfo = require("../../extras/embedbuilder/embedcomponents/EmbedRankInfo");
const DecoratorRankInfoCurrent = require("../../extras/embedbuilder/decorators/DecoratorRankInfoCurrent");
const LanguageManager = require("../../managers/LanguageManager");
const Model = require("../../model/Model");
const Utils = require("../../extras/Utils");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const targetUser = message.mentions.users.first() || message.author;
      const targetDiscordId = targetUser.id;
      const discordServerId = guildId || "DM";
      const targetUserName = targetUser.username;

      const user = await model.getUser(
        targetDiscordId,
        discordServerId,
        targetUserName,
        guildLocale
      );
      const userElo = user?.Elo || 0;

      const ranksData = await Utils.getRanksData();
      const currentRank = Utils.findRankForElo(ranksData, userElo);

      let rankInfoEmbed = new EmbedRankInfo(
        ranksData,
        currentRank.name,
        guildId,
        guildLocale
      );
      rankInfoEmbed = new DecoratorRankInfoCurrent(
        rankInfoEmbed,
        currentRank.name
      );
      const finalEmbed = rankInfoEmbed.build();

      await message.reply({ embeds: [finalEmbed] });
    } catch (error) {
      console.error("❌ Error en RankInfoCommand:", error);
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
