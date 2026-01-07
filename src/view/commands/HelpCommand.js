const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const LanguageManager = require("../../managers/LanguageManager");
const Utils = require("../../extras/Utils");
const EmbedHelp = require("../../extras/embedbuilder/embedcomponents/EmbedHelp");
const EmbedHelpCommand = require("../../extras/embedbuilder/embedcomponents/EmbedHelpCommand");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows the bot help")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Specific command to get detailed help")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("language")
        .setDescription(
          "Language to display the help (es/en/fr). Ignores the server language only for this command."
        )
        .setRequired(false)
        .addChoices(
          { name: "Español", value: "es" },
          { name: "English", value: "en" },
          { name: "Français", value: "fr" }
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guild?.id || null;
    let guildLocale = interaction.guild?.preferredLocale || null;

    const languageOption = interaction.options.getString("language");
    if (languageOption && ["es", "en", "fr"].includes(languageOption)) {
      guildLocale = languageOption;
    } else if (interaction.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: interaction.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    const langManager = LanguageManager.getInstance();
    const commandOption = interaction.options.getString("command");

    if (commandOption) {
      const commandNameLower = commandOption.toLowerCase();
      const helpCommandEmbed = new EmbedHelpCommand(
        commandNameLower,
        guildId,
        guildLocale
      );
      const embed = helpCommandEmbed.build();

      if (!embed) {
        const errorMessage = langManager.getString(
          guildId,
          "help_command_not_found_description",
          { command: commandOption },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        const errorEmbedBuilt = errorEmbed.build();
        errorEmbedBuilt.setTitle(
          langManager.getString(
            guildId,
            "help_command_not_found",
            { command: commandOption },
            guildLocale
          )
        );
        await interaction.reply({ embeds: [errorEmbedBuilt], ephemeral: true });
        return;
      }
    }

    const commandNameForButton = commandOption
      ? commandOption.toLowerCase()
      : "general";

    const localeSuffix = languageOption ? `_${languageOption}` : "";

    const questionMessage = commandOption
      ? langManager.getString(
          guildId,
          "help_question_command",
          { command: commandOption },
          guildLocale
        )
      : langManager.getString(
          guildId,
          "help_question_general",
          {},
          guildLocale
        );

    const hereButton = new ButtonBuilder()
      .setCustomId(`help_here_${commandNameForButton}${localeSuffix}`)
      .setLabel(
        langManager.getString(guildId, "help_button_here", {}, guildLocale)
      )
      .setStyle(ButtonStyle.Primary);

    const dmButton = new ButtonBuilder()
      .setCustomId(`help_dm_${commandNameForButton}${localeSuffix}`)
      .setLabel(
        langManager.getString(guildId, "help_button_dm", {}, guildLocale)
      )
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hereButton, dmButton);

    await interaction.reply({
      content: questionMessage,
      components: [row],
    });
  },
  async handleMessage(message, args) {
    const guildId = message.guild?.id || null;
    const langManager = LanguageManager.getInstance();
    let guildLocale = message.guild?.preferredLocale || null;

    if (message.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: message.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    const helpMessage = langManager.getString(
      guildId,
      "help_message_command",
      {},
      guildLocale
    );
    const helpEmbed = new EmbedHelp(guildId, guildLocale);
    const embed = helpEmbed.build();
    embed.setDescription(helpMessage);

    await message.reply({ embeds: [embed] });
  },
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "command") {
      const commandList = [
        { name: "roster", value: "roster" },
        { name: "buyelo", value: "buyelo" },
        { name: "roll", value: "roll" },
        { name: "buy", value: "buy" },
        { name: "sell", value: "sell" },
        { name: "trade", value: "trade" },
        { name: "gift", value: "gift" },
        { name: "timerinfo", value: "timerinfo" },
        { name: "trackinfo", value: "trackinfo" },
        { name: "playerinfo", value: "playerinfo" },
        { name: "playerstats", value: "playerstats" },
        { name: "rosterstats", value: "rosterstats" },
        { name: "wishlist", value: "wishlist" },
        { name: "stop", value: "stop" },
        { name: "deny", value: "deny" },
        { name: "teamname", value: "teamname" },
        { name: "userinfo", value: "userinfo" },
        { name: "tag", value: "tag" },
        { name: "alias", value: "alias" },
        { name: "rankinfo", value: "rankinfo" },
        { name: "loungeodds", value: "loungeodds" },
        { name: "leaderboardmmr", value: "leaderboardmmr" },
        { name: "leaderboard", value: "leaderboard" },
        { name: "lineup", value: "lineup" },
        { name: "lineupadd", value: "lineupadd" },
        { name: "lineupremove", value: "lineupremove" },
        { name: "removealias", value: "removealias" },
        { name: "removealiasuser", value: "removealiasuser" },
        { name: "removeplayer", value: "removeplayer" },
        { name: "clearroster", value: "clearroster" },
        { name: "editteamname", value: "editteamname" },
        { name: "coinsadd", value: "coinsadd" },
        { name: "coinsremove", value: "coinsremove" },
        { name: "ban", value: "ban" },
        { name: "unban", value: "unban" },
        { name: "restrict", value: "restrict" },
        { name: "unrestrict", value: "unrestrict" },
        { name: "fullreset", value: "fullreset" },
        { name: "edittag", value: "edittag" },
        { name: "trackpick", value: "trackpick" },
        { name: "trackremove", value: "trackremove" },
        { name: "train", value: "train" },
        { name: "accept", value: "accept" },
        { name: "war", value: "war" },
        { name: "scrim", value: "scrim" },
        { name: "tournamentwar", value: "tournamentwar" },
        { name: "cpuwar", value: "cpuwar" },
        { name: "calc", value: "calc" },
        { name: "thanos", value: "thanos" },
        { name: "adminrole", value: "adminrole" },
      ];

      const filtered = commandList.filter((command) =>
        command.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
      );

      await interaction.respond(
        filtered.slice(0, 25).map((command) => ({
          name: command.name,
          value: command.value,
        }))
      );
    }
  },
};
