const Decorator = require("../Decorator");

class DecoratorRankInfoCurrent extends Decorator {
  constructor(embed, currentRankName = null) {
    super(embed);
    this.currentRankName = currentRankName;
  }

  build() {
    const baseEmbed = super.build();

    if (!this.currentRankName) {
      return baseEmbed;
    }

    const fields = baseEmbed.data?.fields || [];
    if (!fields.length) {
      return baseEmbed;
    }

    const normalizedCurrent = this.currentRankName.trim().toLowerCase();

    const updatedFields = fields.map((field) => {
      const fieldName = field.name || "";
      const fieldNameWithoutEmote = fieldName
        .replace(/^[\p{Emoji}\s]+/u, "")
        .trim();
      const normalizedField = fieldNameWithoutEmote.toLowerCase();

      if (normalizedField === normalizedCurrent) {
        return {
          ...field,
          name: `▶️**${fieldName}**◀️`,
        };
      }
      return field;
    });

    baseEmbed.setFields(updatedFields);
    return baseEmbed;
  }
}

module.exports = DecoratorRankInfoCurrent;
