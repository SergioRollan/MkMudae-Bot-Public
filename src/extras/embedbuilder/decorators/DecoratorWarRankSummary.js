const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorWarRankSummary extends Decorator {
  constructor(embed, options = {}) {
    super(embed);
    this.winnerName = options.winnerName || null;
    this.loserName = options.loserName || null;
    this.winnerRankName = options.winnerRankName || null;
    this.loserRankName = options.loserRankName || null;
    this.winnerRankChange = options.winnerRankChange || "same";
    this.loserRankChange = options.loserRankChange || "same";
    this.guildId = options.guildId || null;
    this.guildLocale = options.guildLocale || null;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const winnerRankLine = this._getRankChangeLine(
      this.winnerRankChange,
      this.winnerName,
      this.winnerRankName
    );
    const loserRankLine = this._getRankChangeLine(
      this.loserRankChange,
      this.loserName,
      this.loserRankName
    );

    const existingDescription = baseEmbed.data?.description || "";
    const linesToAppend = [winnerRankLine, loserRankLine].filter(Boolean);

    const descriptionSegments = existingDescription
      ? [existingDescription, ...linesToAppend]
      : [...linesToAppend];

    baseEmbed.setDescription(descriptionSegments.join("\n"));

    return baseEmbed;
  }

  _getRankChangeLine(change, name, rank) {
    if (!name || !rank) {
      return null;
    }
    const lang = LanguageManager.getInstance();
    const key =
      change === "up"
        ? "war_finish_line_rank_up"
        : change === "down"
        ? "war_finish_line_rank_down"
        : "war_finish_line_rank_same";

    return lang.getString(
      this.guildId,
      key,
      {
        name,
        rank,
      },
      this.guildLocale
    );
  }
}

module.exports = DecoratorWarRankSummary;
