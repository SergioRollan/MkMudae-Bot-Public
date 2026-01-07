const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedTrackInfo extends IEmbed {
  constructor(tracks, guildId = null, guildLocale = null) {
    super();
    this.tracks = tracks;
    this.guildId = guildId;
    this.guildLocale = guildLocale;

    this.trackAbbreviations = [
      "AH",
      "rAF",
      "BCi",
      "BC",
      "CCF",
      "rCM",
      "CC",
      "DD",
      "rDS",
      "rDDJ",
      "rDKP",
      "DKS",
      "DBB",
      "FO",
      "GBR",
      "rKTB",
      "MBC",
      "rMC",
      "rMMM",
      "rPB",
      "PS",
      "RR",
      "SSS",
      "rSGB",
      "rSHS",
      "SP",
      "rTF",
      "rWS",
      "rWSh",
      "WS",
    ];
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(
        lang.getString(this.guildId, "trackinfo_title", {}, this.guildLocale)
      )
      .setTimestamp();

    const trackList = [];
    this.tracks.forEach((track, index) => {
      const trackES = track.nameES || "";
      const trackEN = track.nameEN || "";
      const trackFR = track.nameFR || "";
      const abbreviation = this.trackAbbreviations[index] || "";
      trackList.push(
        `**${
          index + 1
        }.** [${abbreviation}] 🇬🇧 ${trackEN} | 🇪🇸 ${trackES} | 🇫🇷 ${trackFR}`
      );
    });

    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < trackList.length; i += chunkSize) {
      chunks.push(trackList.slice(i, i + chunkSize));
    }

    chunks.forEach((chunk, index) => {
      embed.addFields({
        name:
          index === 0
            ? lang.getString(
                this.guildId,
                "trackinfo_field_tracks",
                {},
                this.guildLocale
              )
            : "\u200b",
        value: chunk.join("\n"),
        inline: false,
      });
    });

    embed.setDescription(
      lang.getString(
        this.guildId,
        "trackinfo_description",
        {},
        this.guildLocale
      )
    );

    return embed;
  }
}

module.exports = EmbedTrackInfo;
