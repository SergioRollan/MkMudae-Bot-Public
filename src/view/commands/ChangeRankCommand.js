const EmbedNotImplemented = require("../../extras/embedbuilder/embedcomponents/EmbedNotImplemented");

module.exports = {
  async handleMessage(message, args) {
    const embed = new EmbedNotImplemented("$changerank");
    await message.reply({ embeds: [embed.build()] });
  },
};
