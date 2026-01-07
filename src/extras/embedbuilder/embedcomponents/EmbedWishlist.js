const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedWishlist extends IEmbed {
  constructor(
    teamName,
    isEmpty,
    count,
    maxWishlist = 2,
    guildId = null,
    guildLocale = null
  ) {
    super();
    this.teamName = teamName;
    this.isEmpty = isEmpty;
    this.count = count;
    this.maxWishlist = maxWishlist;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const embed = new EmbedBuilder().setColor(0x5865f2).setTimestamp();

    if (this.isEmpty) {
      const emptyMessage = lang.getString(
        this.guildId,
        "wishlist_empty",
        {},
        this.guildLocale
      );

      embed
        .setTitle(
          lang.getString(
            this.guildId,
            "wishlist_title",
            { name: this.teamName },
            this.guildLocale
          )
        )
        .setDescription(emptyMessage);
    } else {
      embed
        .setTitle(
          lang.getString(
            this.guildId,
            "wishlist_title",
            { name: this.teamName },
            this.guildLocale
          )
        )
        .setDescription(
          lang
            .getString(
              this.guildId,
              "wishlist_description",
              { count: this.count, max: this.maxWishlist },
              this.guildLocale
            )
            .replace("{count}", this.count)
            .replace("{max}", this.maxWishlist)
        );
    }

    return embed;
  }
}

module.exports = EmbedWishlist;
