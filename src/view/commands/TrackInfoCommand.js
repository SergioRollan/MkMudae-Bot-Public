const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedTrackInfo = require("../../extras/embedbuilder/embedcomponents/EmbedTrackInfo");

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const tracks = await model.getAllTracks();

      if (!tracks || tracks.length === 0) {
        const errorMessage = langManager.getString(
          guildId,
          "trackinfo_no_tracks",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const trackInfoEmbed = new EmbedTrackInfo(tracks, guildId, guildLocale);
      await message.reply({ embeds: [trackInfoEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en TrackInfoCommand:", error);
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
