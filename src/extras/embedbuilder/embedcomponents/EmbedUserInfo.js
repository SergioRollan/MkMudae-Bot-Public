const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");
const Utils = require("../../../extras/Utils");

class EmbedUserInfo extends IEmbed {
  constructor({
    displayName,
    teamName,
    tag,
    coins,
    elo,
    rankName,
    rankEmote,
    lineup,
    trackBalancedA,
    trackBalancedB,
    trackTopA,
    trackTopB,
    trackRemoveTopA,
    trackRemoveTopB,
    trackBottomA,
    trackBottomB,
    guildId = null,
    guildLocale = null,
    avatarURL = null,
  }) {
    super();
    this.displayName = displayName;
    this.teamName = teamName;
    this.tag = tag;
    this.coins = coins;
    this.elo = elo;
    this.rankName = rankName;
    this.rankEmote = rankEmote;
    this.lineup = lineup;
    this.trackBalancedA = trackBalancedA;
    this.trackBalancedB = trackBalancedB;
    this.trackTopA = trackTopA;
    this.trackTopB = trackTopB;
    this.trackRemoveTopA = trackRemoveTopA;
    this.trackRemoveTopB = trackRemoveTopB;
    this.trackBottomA = trackBottomA;
    this.trackBottomB = trackBottomB;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
    this.avatarURL = avatarURL;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(
        lang.getString(
          this.guildId,
          "userinfo_title",
          { name: this.displayName },
          this.guildLocale
        )
      )
      .addFields(
        {
          name: lang.getString(
            this.guildId,
            "userinfo_team_field",
            {},
            this.guildLocale
          ),
          value:
            this.teamName ||
            lang.getString(
              this.guildId,
              "userinfo_team_default",
              {},
              this.guildLocale
            ),
          inline: true,
        },
        {
          name: lang.getString(
            this.guildId,
            "userinfo_tag_field",
            {},
            this.guildLocale
          ),
          value:
            this.tag ||
            lang.getString(
              this.guildId,
              "userinfo_tag_default",
              {},
              this.guildLocale
            ),
          inline: true,
        },
        {
          name: lang.getString(
            this.guildId,
            "userinfo_coins_field",
            {},
            this.guildLocale
          ),
          value: `${(this.coins || 0).toLocaleString()} ${Utils.formatCoins(
            this.coins || 0
          )}`,
          inline: true,
        },
        {
          name: lang.getString(
            this.guildId,
            "userinfo_elo_field",
            {},
            this.guildLocale
          ),
          value: `${(this.elo || 0).toLocaleString()} Elo`,
          inline: true,
        },
        {
          name: lang.getString(
            this.guildId,
            "userinfo_rank_field",
            {},
            this.guildLocale
          ),
          value: this.rankName
            ? `${this.rankName} ${this.rankEmote || ""}`.trim()
            : lang.getString(
                this.guildId,
                "userinfo_rank_unknown",
                {},
                this.guildLocale
              ),
          inline: true,
        },
        {
          name: lang.getString(
            this.guildId,
            "userinfo_tracks_field",
            {},
            this.guildLocale
          ),
          value: this.buildTracksSection(lang),
          inline: false,
        },
        {
          name: lang.getString(
            this.guildId,
            "userinfo_lineup_field",
            {},
            this.guildLocale
          ),
          value:
            this.lineup ||
            lang.getString(
              this.guildId,
              "userinfo_lineup_empty",
              {},
              this.guildLocale
            ),
          inline: false,
        }
      )
      .setTimestamp();

    if (this.avatarURL) {
      embed.setThumbnail(this.avatarURL);
    }

    return embed;
  }

  buildTracksSection(lang) {
    const empty = lang.getString(
      this.guildId,
      "userinfo_track_empty",
      {},
      this.guildLocale
    );

    const lines = [
      `**${lang.getString(
        this.guildId,
        "userinfo_track_balanced_field",
        {},
        this.guildLocale
      )}:** ${this.formatTrackValue(
        this.trackBalancedA,
        this.trackBalancedB,
        empty
      )}`,
      `**${lang.getString(
        this.guildId,
        "userinfo_track_top_field",
        {},
        this.guildLocale
      )}:** ${this.formatTrackValue(this.trackTopA, this.trackTopB, empty)}`,
      `**${lang.getString(
        this.guildId,
        "userinfo_track_remove_top_field",
        {},
        this.guildLocale
      )}:** ${this.formatTrackValue(
        this.trackRemoveTopA,
        this.trackRemoveTopB,
        empty
      )}`,
      `**${lang.getString(
        this.guildId,
        "userinfo_track_bottom_field",
        {},
        this.guildLocale
      )}:** ${this.formatTrackValue(
        this.trackBottomA,
        this.trackBottomB,
        empty
      )}`,
    ];

    return lines.join("\n");
  }

  formatTrackValue(trackA, trackB, emptyValue) {
    const valueA = trackA || emptyValue;
    const valueB = trackB || emptyValue;
    return `${valueA}, ${valueB}`;
  }
}

module.exports = EmbedUserInfo;
