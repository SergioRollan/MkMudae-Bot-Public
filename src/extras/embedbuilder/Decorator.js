const IEmbed = require("./IEmbed");

class Decorator extends IEmbed {
  constructor(embed) {
    super();
    this.embed = embed;
  }

  build() {
    return this.embed.build();
  }
}

module.exports = Decorator;
