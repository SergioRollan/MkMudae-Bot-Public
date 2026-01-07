const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedRankInfo extends IEmbed {
  constructor(
    ranks,
    currentRankName = "WOOD",
    guildId = null,
    guildLocale = null
  ) {
    super();
    this.ranks = ranks;
    this.currentRankName = currentRankName;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(
        lang.getString(this.guildId, "rankinfo_title", {}, this.guildLocale)
      )
      .setDescription(
        lang.getString(
          this.guildId,
          "rankinfo_description",
          {},
          this.guildLocale
        )
      )
      .setTimestamp();

    for (const rank of this.ranks) {
      const emote = rank.emote || "";
      const rankName = `${emote} ${rank.name}`;

      let value = `🎲 **${lang.getString(
        this.guildId,
        "rankinfo_pulls",
        {},
        this.guildLocale
      )}:** ${rank.pulls}\n`;
      value += `🏋️ **${lang.getString(
        this.guildId,
        "rankinfo_training_sessions",
        {},
        this.guildLocale
      )}:** ${rank.training_sessions}\n`;
      value += `📝 **${lang.getString(
        this.guildId,
        "rankinfo_wishlists",
        {},
        this.guildLocale
      )}:** ${rank.wishlists}\n`;
      value += `⭐ **${lang.getString(
        this.guildId,
        "rankinfo_wishlist_mult",
        {},
        this.guildLocale
      )}:** x${rank.wishlist_mult}\n`;
      value += `👥 **${lang.getString(
        this.guildId,
        "rankinfo_max_roster",
        {},
        this.guildLocale
      )}:** ${rank.max_roster}\n`;

      const discount = Number(rank.discount) || 0;

      const sellBenefitPercent = discount === 0 ? 50 : discount;

      const sellBenefitLabel = lang.getString(
        this.guildId,
        "rankinfo_default_sell_benefit",
        {},
        this.guildLocale
      );
      value += `💰 **${sellBenefitLabel}:** ${sellBenefitPercent}%\n`;

      const eloCostLabel = lang.getString(
        this.guildId,
        "rankinfo_elo_cost",
        {},
        this.guildLocale
      );
      const eloCostValue = (rank.elo_cost || 1).toFixed(2);
      value += `💸 **${eloCostLabel}:** ${eloCostValue}\n`;

      const eloLabel = lang.getString(
        this.guildId,
        "rankinfo_elo_needed",
        {},
        this.guildLocale
      );
      const eloValue =
        rank.elo_needed > 0 ? `${rank.elo_needed.toLocaleString()}` : `0`;
      value += `📈 **${eloLabel}:** ${eloValue}`;

      value += "\n\u200b";

      embed.addFields({
        name: rankName,
        value: value,
        inline: true,
      });
    }

    embed.setFooter({
      text: lang.getString(
        this.guildId,
        "rankinfo_footer",
        {},
        this.guildLocale
      ),
    });

    return embed;
  }
}

module.exports = EmbedRankInfo;
