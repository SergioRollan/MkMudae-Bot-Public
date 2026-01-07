const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
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
  } else if (
    trackType === TrackType.ANTI_TOP_A ||
    trackType === TrackType.ANTI_TOP_B ||
    trackType === TrackType.ANTI_TOP
  ) {
    return "antitop";
  }
  return trackType;
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      if (args.length < 1) {
        const errorMessage = langManager.getString(
          guildId,
          "trackremove_invalid_syntax",
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
          "trackremove_invalid_type",
          { types: validTypes },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let specificTrackName = null;
      if (args.length > 1) {
        const trackNameArg = args.slice(1).join(" ");
        if (trackNameArg.startsWith('"') && trackNameArg.endsWith('"')) {
          specificTrackName = trackNameArg.slice(1, -1).trim();
        } else {
          specificTrackName = trackNameArg.trim();

          if (specificTrackName.includes(" ")) {
            const errorMessage = langManager.getString(
              guildId,
              "trackremove_name_quotes",
              {},
              guildLocale
            );
            const errorEmbed = new EmbedError(
              errorMessage,
              guildId,
              guildLocale
            );
            await message.reply({ embeds: [errorEmbed.build()] });
            return;
          }
        }
      }

      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const user = await model.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );
      if (!user || !user.UserID) {
        const errorMessage = langManager.getString(
          guildId,
          "trackremove_user_not_found",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      let specificSlotToRemove = null;
      if (specificTrackName) {
        let trackByAbbreviation = await model.getTrackByAbbreviation(
          specificTrackName
        );

        const trackSlots = {
          [TrackType.TOP]: ["TrackTopA", "TrackTopB"],
          [TrackType.TOP_A]: ["TrackTopA"],
          [TrackType.TOP_B]: ["TrackTopB"],
          [TrackType.BOTTOM]: ["TrackBottomA", "TrackBottomB"],
          [TrackType.BOTTOM_A]: ["TrackBottomA"],
          [TrackType.BOTTOM_B]: ["TrackBottomB"],
          [TrackType.ANTI_TOP]: ["TrackRemoveTopA", "TrackRemoveTopB"],
          [TrackType.ANTI_TOP_A]: ["TrackRemoveTopA"],
          [TrackType.ANTI_TOP_B]: ["TrackRemoveTopB"],
          [TrackType.BALANCED]: ["TrackBalancedA", "TrackBalancedB"],
          [TrackType.BALANCED_A]: ["TrackBalancedA"],
          [TrackType.BALANCED_B]: ["TrackBalancedB"],
        };

        const slotsToCheck = trackSlots[normalizedType] || [];
        for (const slot of slotsToCheck) {
          const trackId = user[slot];
          if (trackId) {
            const track = await model.getTrackById(trackId);
            if (track) {
              if (
                trackByAbbreviation &&
                track.IDTrack === trackByAbbreviation.IDTrack
              ) {
                specificSlotToRemove = slot;
                break;
              }

              const trackNameES = track.nameES || "";
              const trackNameEN = track.nameEN || "";
              const trackNameFR = track.nameFR || "";

              const inputLower = specificTrackName.toLowerCase();
              if (
                trackNameES.toLowerCase() === inputLower ||
                trackNameEN.toLowerCase() === inputLower ||
                trackNameFR.toLowerCase() === inputLower
              ) {
                specificSlotToRemove = slot;
                break;
              }
            }
          }
        }

        if (!specificSlotToRemove) {
          const errorMessage = langManager.getString(
            guildId,
            "trackremove_track_not_found",
            { name: specificTrackName },
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return;
        }
      }

      const trackIdsToRemove = [];
      const slotsToRemove = [];

      if (specificSlotToRemove) {
        if (user[specificSlotToRemove]) {
          trackIdsToRemove.push(user[specificSlotToRemove]);
          slotsToRemove.push(specificSlotToRemove);
        }
      } else {
        if (normalizedType === TrackType.TOP) {
          if (user.TrackTopA) {
            trackIdsToRemove.push(user.TrackTopA);
            slotsToRemove.push("TrackTopA");
          }
          if (user.TrackTopB) {
            trackIdsToRemove.push(user.TrackTopB);
            slotsToRemove.push("TrackTopB");
          }
        } else if (normalizedType === TrackType.BOTTOM) {
          if (user.TrackBottomA) {
            trackIdsToRemove.push(user.TrackBottomA);
            slotsToRemove.push("TrackBottomA");
          }
          if (user.TrackBottomB) {
            trackIdsToRemove.push(user.TrackBottomB);
            slotsToRemove.push("TrackBottomB");
          }
        } else if (normalizedType === TrackType.ANTI_TOP) {
          if (user.TrackRemoveTopA) {
            trackIdsToRemove.push(user.TrackRemoveTopA);
            slotsToRemove.push("TrackRemoveTopA");
          }
          if (user.TrackRemoveTopB) {
            trackIdsToRemove.push(user.TrackRemoveTopB);
            slotsToRemove.push("TrackRemoveTopB");
          }
        } else if (normalizedType === TrackType.BALANCED) {
          if (user.TrackBalancedA) {
            trackIdsToRemove.push(user.TrackBalancedA);
            slotsToRemove.push("TrackBalancedA");
          }
          if (user.TrackBalancedB) {
            trackIdsToRemove.push(user.TrackBalancedB);
            slotsToRemove.push("TrackBalancedB");
          }
        } else if (normalizedType === TrackType.TOP_A && user.TrackTopA) {
          trackIdsToRemove.push(user.TrackTopA);
          slotsToRemove.push("TrackTopA");
        } else if (normalizedType === TrackType.TOP_B && user.TrackTopB) {
          trackIdsToRemove.push(user.TrackTopB);
          slotsToRemove.push("TrackTopB");
        } else if (normalizedType === TrackType.BOTTOM_A && user.TrackBottomA) {
          trackIdsToRemove.push(user.TrackBottomA);
          slotsToRemove.push("TrackBottomA");
        } else if (normalizedType === TrackType.BOTTOM_B && user.TrackBottomB) {
          trackIdsToRemove.push(user.TrackBottomB);
          slotsToRemove.push("TrackBottomB");
        } else if (
          normalizedType === TrackType.BALANCED_A &&
          user.TrackBalancedA
        ) {
          trackIdsToRemove.push(user.TrackBalancedA);
          slotsToRemove.push("TrackBalancedA");
        } else if (
          normalizedType === TrackType.BALANCED_B &&
          user.TrackBalancedB
        ) {
          trackIdsToRemove.push(user.TrackBalancedB);
          slotsToRemove.push("TrackBalancedB");
        } else if (
          normalizedType === TrackType.ANTI_TOP_A &&
          user.TrackRemoveTopA
        ) {
          trackIdsToRemove.push(user.TrackRemoveTopA);
          slotsToRemove.push("TrackRemoveTopA");
        } else if (
          normalizedType === TrackType.ANTI_TOP_B &&
          user.TrackRemoveTopB
        ) {
          trackIdsToRemove.push(user.TrackRemoveTopB);
          slotsToRemove.push("TrackRemoveTopB");
        }
      }

      const tracksToRemove = [];
      for (const trackId of trackIdsToRemove) {
        const track = await model.getTrackById(trackId);
        if (track) {
          tracksToRemove.push(track);
        }
      }

      try {
        for (const slot of slotsToRemove) {
          await model.updateUserTrackByUserId(user.UserID, slot, null);
        }

        const slotPairs = {
          TrackTopA: "TrackTopB",
          TrackBottomA: "TrackBottomB",
          TrackRemoveTopA: "TrackRemoveTopB",
          TrackBalancedA: "TrackBalancedB",
        };

        const updatedUser = await model.getUser(
          discordId,
          discordServerId,
          userName,
          guildLocale
        );

        for (const slotA in slotPairs) {
          const slotB = slotPairs[slotA];

          if (slotsToRemove.includes(slotA) && updatedUser[slotB]) {
            await model.updateUserTrackByUserId(
              updatedUser.UserID,
              slotA,
              updatedUser[slotB]
            );
            await model.updateUserTrackByUserId(
              updatedUser.UserID,
              slotB,
              null
            );
          }
        }
      } catch (err) {
        console.error("❌ Error eliminando track del usuario:", err);
        const errorMessage = langManager.getString(
          guildId,
          "error_processing_command",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const lang = langManager.getGuildLanguage(guildId, guildLocale);

      let tracksText = "";
      if (tracksToRemove.length > 0) {
        const names = tracksToRemove
          .map((track) =>
            getTrackNameByLocale(track, langManager, guildId, guildLocale)
          )
          .filter((name) => name);
        if (names.length > 0) {
          if (names.length === 1) {
            tracksText = `**${names[0]}**`;
          } else {
            const separator =
              lang === "en"
                ? "** and **"
                : lang === "fr"
                ? "** et **"
                : "** y **";
            tracksText = `**${names.join(separator)}**`;
          }
        }
      }

      if (!tracksText) {
        const defaultText =
          lang === "en"
            ? "the track(s)"
            : lang === "fr"
            ? "le(s) circuit(s)"
            : "la(s) pista(s)";
        tracksText = defaultText;
      }

      const genericType = getGenericTrackType(normalizedType);
      const successMessage = langManager.getString(
        guildId,
        "trackremove_success",
        { type: genericType, tracks: tracksText },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.reply({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en TrackRemoveCommand:", error);
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
