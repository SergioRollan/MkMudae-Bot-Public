const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorWarEloSummary extends Decorator {
  constructor(embed, options = {}) {
    super(embed);
    this.winnerName = options.winnerName || null;
    this.loserName = options.loserName || null;
    this.winnerEloChange =
      typeof options.winnerEloChange === "number" ? options.winnerEloChange : 0;
    this.loserEloChange =
      typeof options.loserEloChange === "number" ? options.loserEloChange : 0;
    this.winnerNewElo =
      typeof options.winnerNewElo === "number" ? options.winnerNewElo : 0;
    this.loserNewElo =
      typeof options.loserNewElo === "number" ? options.loserNewElo : 0;
    this.winnerRankName = options.winnerRankName || null;
    this.loserRankName = options.loserRankName || null;
    this.guildId = options.guildId || null;
    this.guildLocale = options.guildLocale || null;
  }

  build() {
    const baseEmbed = super.build();
    const lang = LanguageManager.getInstance();

    const winnerLineKey =
      this.winnerEloChange === 0
        ? "war_finish_line_winner_elo_same"
        : "war_finish_line_winner_elo";
    const loserLineKey =
      this.loserEloChange === 0
        ? "war_finish_line_loser_elo_same"
        : "war_finish_line_loser_elo";

    const safeWinnerNewElo = Math.max(0, this.winnerNewElo);
    const safeLoserNewElo = Math.max(0, this.loserNewElo);

    const winnerLine = this.winnerName
      ? lang.getString(
          this.guildId,
          winnerLineKey,
          {
            winner: this.winnerName,
            elo: this.winnerEloChange.toLocaleString(),
            newElo: safeWinnerNewElo.toLocaleString(),
            rank: this.winnerRankName,
          },
          this.guildLocale
        )
      : null;

    const loserLine = this.loserName
      ? lang.getString(
          this.guildId,
          loserLineKey,
          {
            loser: this.loserName,
            elo: this.loserEloChange.toLocaleString(),
            newElo: safeLoserNewElo.toLocaleString(),
            rank: this.loserRankName,
          },
          this.guildLocale
        )
      : null;

    const existingDescription = baseEmbed.data?.description || "";
    const linesToAppend = [winnerLine, loserLine].filter(Boolean);

    if (linesToAppend.length === 0) {
      return baseEmbed;
    }

    const descriptionSegments = existingDescription
      ? [existingDescription, ...linesToAppend]
      : [...linesToAppend];

    baseEmbed.setDescription(descriptionSegments.join("\n"));

    return baseEmbed;
  }
}

module.exports = DecoratorWarEloSummary;
