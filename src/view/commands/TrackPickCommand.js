const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const Utils = require("../../extras/Utils");
const TrackType = require("../../enums/TrackType");

function getTrackNameByLocale(track, langManager, guildId, guildLocale) {
  if (!track) return "";

  const lang = langManager.getGuildLanguage(guildId, guildLocale);

  const langMap = {
    es: track.nameES,
    en: track.nameEN,
    fr: track.nameFR,
  };

  return langMap[lang] || track.nameES || track.nameEN || track.nameFR || "";
}

function getGenericTrackType(trackType) {
  if (
    trackType === TrackType.TOP_A ||
    trackType === TrackType.TOP_B ||
    trackType === TrackType.TOP
  ) {
    return "top";
  } else if (
    trackType === TrackType.ANTI_TOP_A ||
    trackType === TrackType.ANTI_TOP_B ||
    trackType === TrackType.ANTI_TOP
  ) {
    return "antitop";
  } else if (
    trackType === TrackType.BOTTOM_A ||
    trackType === TrackType.BOTTOM_B ||
    trackType === TrackType.BOTTOM
  ) {
    return "bottom";
  } else if (
    trackType === TrackType.BALANCED_A ||
    trackType === TrackType.BALANCED_B ||
    trackType === TrackType.BALANCED
  ) {
    return "balanced";
  }
  return trackType;
}

function getTrackTypeDescription(trackType) {
  if (
    trackType === TrackType.TOP_A ||
    trackType === TrackType.TOP_B ||
    trackType === TrackType.TOP
  ) {
    return "track_type_top";
  } else if (
    trackType === TrackType.ANTI_TOP_A ||
    trackType === TrackType.ANTI_TOP_B ||
    trackType === TrackType.ANTI_TOP
  ) {
    return "track_type_antitop";
  } else if (
    trackType === TrackType.BOTTOM_A ||
    trackType === TrackType.BOTTOM_B ||
    trackType === TrackType.BOTTOM
  ) {
    return "track_type_bottom";
  } else if (
    trackType === TrackType.BALANCED_A ||
    trackType === TrackType.BALANCED_B ||
    trackType === TrackType.BALANCED
  ) {
    return "track_type_balanced";
  }
  return "track_type_unknown";
}

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
          "trackpick_invalid_syntax",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const normalizedType = TrackType.normalize(args[0]);

      if (!normalizedType || !TrackType.isValid(normalizedType)) {
        const validTypes = TrackType.getDisplayValues().join(", ");
        const errorMessage = langManager.getString(
          guildId,
          "trackpick_invalid_type",
          { types: validTypes },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const trackNameArg = args.slice(1).join(" ");

      let trackName = "";
      if (trackNameArg.startsWith('"') && trackNameArg.endsWith('"')) {
        trackName = trackNameArg.slice(1, -1).trim();
      } else {
        trackName = trackNameArg.trim();

        if (trackName.includes(" ")) {
          const errorMessage = langManager.getString(
            guildId,
            "trackpick_name_quotes",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }
      }

      if (!trackName) {
        const errorMessage = langManager.getString(
          guildId,
          "trackpick_name_empty",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let trackInDB = await model.getTrackByAbbreviation(trackName);

      if (!trackInDB) {
        const tracks = Utils.DEFAULT_TRACKS;
        let trackIndex = -1;

        trackIndex = tracks.es.findIndex(
          (t) => t.toLowerCase() === trackName.toLowerCase()
        );

        if (trackIndex === -1) {
          trackIndex = tracks.en.findIndex(
            (t) => t.toLowerCase() === trackName.toLowerCase()
          );
        }

        if (trackIndex === -1) {
          trackIndex = tracks.fr.findIndex(
            (t) => t.toLowerCase() === trackName.toLowerCase()
          );
        }

        if (trackIndex === -1) {
          const errorMessage = langManager.getString(
            guildId,
            "trackpick_track_not_found",
            { name: trackName },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }

        trackInDB = await model.getTrackByName(trackName);

        if (!trackInDB && trackIndex >= 0) {
          const trackNameEN = tracks.en[trackIndex];
          trackInDB = await model.getTrackByName(trackNameEN);
        }

        if (!trackInDB && trackIndex >= 0) {
          const trackNameES = tracks.es[trackIndex];
          trackInDB = await model.getTrackByName(trackNameES);
        }

        if (!trackInDB && trackIndex >= 0) {
          const trackNameFR = tracks.fr[trackIndex];
          trackInDB = await model.getTrackByName(trackNameFR);
        }
      }

      if (!trackInDB) {
        const errorMessage = langManager.getString(
          guildId,
          "trackpick_track_not_in_db",
          { name: trackName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const result = await model.updateUserTrack(
        discordId,
        discordServerId,
        userName,
        normalizedType,
        trackInDB.IDTrack
      );

      if (!result.success) {
        let errorMessage = "";
        if (result.error === "user_not_found") {
          errorMessage = langManager.getString(
            guildId,
            "trackpick_user_not_found",
            {},
            guildLocale
          );
        } else if (result.error === "invalid_track_type") {
          const validTypes = TrackType.getDisplayValues().join(", ");
          errorMessage = langManager.getString(
            guildId,
            "trackpick_invalid_type",
            { types: validTypes },
            guildLocale
          );
        } else if (result.error === "track_not_found") {
          errorMessage = langManager.getString(
            guildId,
            "trackpick_track_not_found",
            { name: trackName },
            guildLocale
          );
        } else if (result.error === "track_slot_full") {
          const genericType = getGenericTrackType(result.trackType);
          errorMessage = langManager.getString(
            guildId,
            "trackpick_slot_full",
            { type: genericType },
            guildLocale
          );
        } else if (result.error === "track_already_assigned") {
          const genericType = getGenericTrackType(result.trackType);
          errorMessage = langManager.getString(
            guildId,
            "trackpick_already_assigned",
            { type: genericType },
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

      const trackDisplayName = getTrackNameByLocale(
        trackInDB,
        langManager,
        guildId,
        guildLocale
      );
      const trackTypeDescriptionKey = getTrackTypeDescription(result.trackType);
      const trackTypeDescription = langManager.getString(
        guildId,
        trackTypeDescriptionKey,
        {},
        guildLocale
      );
      const successMessage = langManager.getString(
        guildId,
        "trackpick_success",
        { track: trackDisplayName, type: trackTypeDescription },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en TrackPickCommand:", error);
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
