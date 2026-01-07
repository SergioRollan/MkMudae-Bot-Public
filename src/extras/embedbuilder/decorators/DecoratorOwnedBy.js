const Decorator = require("../Decorator");
const LanguageManager = require("../../../managers/LanguageManager");

class DecoratorOwnedBy extends Decorator {
  constructor(
    embed,
    ownerName = null,
    ownerAvatarURL = null,
    guildId = null,
    guildLocale = null
  ) {
    super(embed);
    this.ownerName = ownerName;
    this.ownerAvatarURL = ownerAvatarURL;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const baseEmbed = super.build();

    if (!this.ownerName) {
      return baseEmbed;
    }

    const lang = LanguageManager.getInstance();
    baseEmbed.setFooter({
      text: lang.getString(
        this.guildId,
        "playerinfo_owned_by",
        { name: this.ownerName },
        this.guildLocale
      ),
      iconURL: this.ownerAvatarURL || undefined,
    });

    return baseEmbed;
  }
}

module.exports = DecoratorOwnedBy;
