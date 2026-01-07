const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const Utils = require("../../Utils");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedPlayer extends IEmbed {
  constructor(player, guildId = null, guildLocale = null, customColor = null) {
    super();
    this.player = player;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
    this.customColor = customColor;
  }

  build() {
    const lang = LanguageManager.getInstance();
    const color =
      this.customColor !== null
        ? this.customColor
        : Utils.getColorByMMR(this.player.mmr || 0);
    const rawMmr = Number(this.player.mmr);
    const mmrValue = Number.isFinite(rawMmr) ? rawMmr : 0;
    const rawPeak = Number(this.player.peak_mmr);
    const peakValue = Number.isFinite(rawPeak) ? rawPeak : 0;
    const rawEvents = Number(this.player.events_played);
    const eventsValue = Number.isFinite(rawEvents) ? rawEvents : 0;

    const attributes = {
      Lines: this.player.Lines || 0,
      Consistency: this.player.Consistency || 0,
      ItemUsage: this.player.ItemUsage || 0,
      Precision: this.player.Precision || 0,
      Communication: this.player.Communication || 0,
      Mental: this.player.Mental || 0,
      GameSense: this.player.GameSense || 0,
      Shockfinding: this.player.Shockfinding || 0,
    };

    const marketValue = Utils.getMarketValue(
      mmrValue,
      peakValue,
      eventsValue,
      attributes
    );
    const playerName =
      this.player.name ||
      this.player.PlayerName ||
      lang.getString(this.guildId, "player_unknown", {}, this.guildLocale);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(playerName)
      .setTimestamp();

    const rankingValue = this.player.ranking
      ? this.player.ranking.toLocaleString()
      : "-";

    const fields = [
      {
        name: lang.getString(
          this.guildId,
          "playerinfo_mmr_field",
          {},
          this.guildLocale
        ),
        value: mmrValue.toLocaleString(),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "playerinfo_peak_mmr_field",
          {},
          this.guildLocale
        ),
        value: peakValue.toLocaleString(),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "playerinfo_ranking_field",
          {},
          this.guildLocale
        ),
        value: rankingValue,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "playerinfo_events_field",
          {},
          this.guildLocale
        ),
        value: eventsValue.toLocaleString(),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "playerinfo_market_value_field",
          {},
          this.guildLocale
        ),
        value: `${marketValue.toLocaleString()} ${Utils.formatCoins(
          marketValue
        )}`,
        inline: true,
      },
    ];

    embed.addFields(...fields);

    return embed;
  }
}

module.exports = EmbedPlayer;
