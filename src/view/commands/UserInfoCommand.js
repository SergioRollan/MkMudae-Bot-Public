const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedUserInfo = require("../../extras/embedbuilder/embedcomponents/EmbedUserInfo");

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

      const userRecord = await model.getUser(
        targetDiscordId,
        discordServerId,
        targetUserName,
        guildLocale
      );

      if (!userRecord) {
        const errorMessage = langManager.getString(
          guildId,
          "userinfo_not_found",
          { name: targetUserName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const rankData = await model.getUserRankData(
        targetDiscordId,
        discordServerId,
        targetUserName,
        guildLocale
      );

      const ownedPlayers = await model.getUserOwnedPlayers(userRecord.UserID);

      const lineupNames = await model.getLineupDisplayNamesFromRecord(
        userRecord,
        ownedPlayers
      );
      const lineupCount = Array.isArray(lineupNames) ? lineupNames.length : 0;
      const missingSlots = Math.max(0, 6 - lineupCount);

      let lineupDisplay = null;
      if (lineupCount === 0) {
        lineupDisplay = langManager.getString(
          guildId,
          "userinfo_lineup_empty",
          {},
          guildLocale
        );
      } else if (lineupCount > 0) {
        lineupDisplay = lineupNames.join(", ");
        if (missingSlots > 0) {
          lineupDisplay = `${lineupDisplay} +${missingSlots}`;
        }
      }

      const trackIds = [
        userRecord.TrackBalancedA,
        userRecord.TrackBalancedB,
        userRecord.TrackTopA,
        userRecord.TrackTopB,
        userRecord.TrackRemoveTopA,
        userRecord.TrackRemoveTopB,
        userRecord.TrackBottomA,
        userRecord.TrackBottomB,
      ].filter((id) => id !== null && id !== undefined);

      const tracksMap = new Map();
      if (trackIds.length > 0) {
        const tracks = await Promise.all(
          trackIds.map((id) => model.getTrackById(id))
        );

        const lang = langManager.getGuildLanguage(guildId, guildLocale);

        tracks.forEach((track) => {
          if (track) {
            const langMap = {
              es: track.nameES,
              en: track.nameEN,
              fr: track.nameFR,
            };
            const trackName =
              langMap[lang] || track.nameES || track.nameEN || track.nameFR;
            tracksMap.set(track.IDTrack, trackName);
          }
        });
      }

      const embed = new EmbedUserInfo({
        displayName: userRecord.Name || targetUserName,
        teamName: userRecord.TeamName || userRecord.Name || targetUserName,
        tag: userRecord.Tag || null,
        coins: userRecord.Coins || 0,
        elo: userRecord.Elo || 0,
        rankName: rankData?.name || null,
        rankEmote: rankData?.emote || "",
        lineup: lineupDisplay,
        trackBalancedA: tracksMap.get(userRecord.TrackBalancedA) || null,
        trackBalancedB: tracksMap.get(userRecord.TrackBalancedB) || null,
        trackTopA: tracksMap.get(userRecord.TrackTopA) || null,
        trackTopB: tracksMap.get(userRecord.TrackTopB) || null,
        trackRemoveTopA: tracksMap.get(userRecord.TrackRemoveTopA) || null,
        trackRemoveTopB: tracksMap.get(userRecord.TrackRemoveTopB) || null,
        trackBottomA: tracksMap.get(userRecord.TrackBottomA) || null,
        trackBottomB: tracksMap.get(userRecord.TrackBottomB) || null,
        guildId,
        guildLocale,
        avatarURL: targetUser.displayAvatarURL({ dynamic: true }),
      });

      await message.reply({ embeds: [embed.build()] });
    } catch (error) {
      console.error("❌ Error en UserInfoCommand:", error);

      const targetName =
        message.mentions.users.first()?.username || message.author.username;

      const errorMessage = langManager.getString(
        guildId,
        "userinfo_error",
        { name: targetName },
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      const finalEmbed = errorEmbed.build();
      finalEmbed.setFooter({ text: error.message });

      await message.reply({ embeds: [finalEmbed] });
    }
  },
};
