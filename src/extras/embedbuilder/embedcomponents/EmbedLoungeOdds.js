const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedLoungeOdds extends IEmbed {
  constructor(
    rates,
    totalPlayers,
    guildId = null,
    guildLocale = null,
    wishlistInfo = null
  ) {
    super();
    this.rates = rates;
    this.totalPlayers = totalPlayers;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
    this.wishlistInfo = wishlistInfo;
  }

  build() {
    const lang = LanguageManager.getInstance();

    let ratesList = "";
    this.rates.forEach((rate) => {
      ratesList += `${rate.emote} **${rate.name}**: ${rate.count} players (${rate.percentage}%)\n`;
    });

    ratesList += `\n📌 **Total**: ${this.totalPlayers} players`;

    if (this.wishlistInfo) {
      const { count, multiplier } = this.wishlistInfo;

      const totalWithWishlist = this.totalPlayers + count * multiplier;

      const probNotInWishlist = (1 / totalWithWishlist) * 100;
      const probInWishlist = ((count * multiplier) / totalWithWishlist) * 100;
      const probSpecificWishlist = (multiplier / totalWithWishlist) * 100;

      ratesList += `\n\n${lang.getString(
        this.guildId,
        "loungeodds_wishlist_title",
        { count, multiplier },
        this.guildLocale
      )}`;
      ratesList += `\n${lang.getString(
        this.guildId,
        "loungeodds_wishlist_prob_not_in_wishlist",
        { percentage: probNotInWishlist.toFixed(7) },
        this.guildLocale
      )}`;
      ratesList += `\n${lang.getString(
        this.guildId,
        "loungeodds_wishlist_prob_any_wishlist",
        { percentage: probInWishlist.toFixed(7) },
        this.guildLocale
      )}`;
      ratesList += `\n${lang.getString(
        this.guildId,
        "loungeodds_wishlist_prob_specific_wishlist",
        { percentage: probSpecificWishlist.toFixed(7) },
        this.guildLocale
      )}`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        lang.getString(this.guildId, "loungeodds_title", {}, this.guildLocale)
      )
      .setDescription(ratesList)
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedLoungeOdds;
