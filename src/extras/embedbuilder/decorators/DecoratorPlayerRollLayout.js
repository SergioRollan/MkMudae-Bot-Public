const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");
const Utils = require("../../Utils");

class DecoratorPlayerRollLayout extends Decorator {
  constructor(embed, player, guildId = null, guildLocale = null) {
    super(embed);
    this.player = player;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const playerName =
      this.player.name ||
      this.player.PlayerName ||
      lang.getString(this.guildId, "player_unknown", {}, this.guildLocale);

    baseEmbed.setDescription(
      lang.getString(
        this.guildId,
        "roll_description",
        {
          name: playerName,
        },
        this.guildLocale
      )
    );

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

    const rankingValue = this.player.ranking
      ? this.player.ranking.toLocaleString()
      : "-";

    const fields = [
      {
        name: lang.getString(
          this.guildId,
          "roll_name_field",
          {},
          this.guildLocale
        ),
        value: playerName,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "roll_mmr_field",
          {},
          this.guildLocale
        ),
        value: mmrValue.toLocaleString(),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "roll_peak_mmr_field",
          {},
          this.guildLocale
        ),
        value: peakValue.toLocaleString(),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "roll_ranking_field",
          {},
          this.guildLocale
        ),
        value: rankingValue,
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "roll_events_field",
          {},
          this.guildLocale
        ),
        value: eventsValue.toLocaleString(),
        inline: true,
      },
      {
        name: lang.getString(
          this.guildId,
          "roll_market_value_field",
          {},
          this.guildLocale
        ),
        value: `${marketValue.toLocaleString()} ${Utils.formatCoins(
          marketValue
        )}`,
        inline: true,
      },
    ];

    baseEmbed.setFields(fields);

    return baseEmbed;
  }
}

module.exports = DecoratorPlayerRollLayout;
