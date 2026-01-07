const fs = require("fs");
const path = require("path");

class View {
  constructor() {
    this.commands = new Map();
    this.messageCommands = new Map();
    this.buttons = new Map();

    this.commandAliases = new Map([
      ["be", "buyelo"],
      ["r", "roll"],
      ["sl", "sell"],
      ["td", "trade"],
      ["g", "gift"],
      ["ti", "timerinfo"],
      ["tri", "trackinfo"],
      ["pi", "playerinfo"],
      ["rt", "roster"],
      ["rs", "rosterstats"],
      ["w", "war"],
      ["tw", "tournamentwar"],
      ["s", "scrim"],
      ["cw", "cpuwar"],
      ["t", "train"],
      ["wl", "wishlist"],
      ["wla", "wishlistadd"],
      ["wlr", "wishlistremove"],
      ["tn", "teamname"],
      ["ui", "userinfo"],
      ["a", "alias"],
      ["ra", "removealias"],
      ["trp", "trackpick"],
      ["trr", "trackremove"],
      ["ri", "rankinfo"],
      ["lo", "loungeodds"],
      ["lbm", "leaderboardmmr"],
      ["lb", "leaderboard"],
      ["lu", "lineup"],
      ["lua", "lineupadd"],
      ["lur", "lineupremove"],
      ["etn", "editteamname"],
      ["rau", "removealiasuser"],
      ["ca", "coinsadd"],
      ["cr", "coinsremove"],
      ["rp", "removeplayer"],
      ["etag", "edittag"],
      ["ps", "playerstats"],
      ["ar", "adminrole"],
      ["as", "allowsteal"],
      ["sm", "summary"],
    ]);
    this.loadCommands();
    this.loadButtons();
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, "commands");
    if (!fs.existsSync(commandsPath)) {
      console.warn("⚠️  Carpeta de comandos no encontrada:", commandsPath);
      return;
    }

    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") && file !== "View.js");

    for (const file of commandFiles) {
      try {
        const commandModule = require(path.join(commandsPath, file));
        const commandName = this.getCommandNameFromFile(file);

        if (commandModule.execute || commandModule.handleMessage) {
          if (commandModule.execute) {
            this.commands.set(commandName, commandModule);
          }

          if (commandModule.handleMessage) {
            this.messageCommands.set(commandName.toLowerCase(), commandModule);
          }
        }
      } catch (error) {
        console.error(`❌ Error cargando comando ${file}:`, error);
      }
    }

    console.log(
      `✅ Vista cargada: ${this.commands.size} comandos slash, ${this.messageCommands.size} comandos de mensaje`
    );
  }

  loadButtons() {
    const buttonsPath = path.join(__dirname, "buttons");
    if (!fs.existsSync(buttonsPath)) {
      console.warn("⚠️  Carpeta de botones no encontrada:", buttonsPath);
      return;
    }

    const buttonFiles = fs
      .readdirSync(buttonsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of buttonFiles) {
      try {
        const buttonModule = require(path.join(buttonsPath, file));
        const buttonName = this.getButtonNameFromFile(file);

        if (buttonModule.handleInteraction) {
          this.buttons.set(buttonName, buttonModule);
        }
      } catch (error) {
        console.error(`❌ Error cargando botón ${file}:`, error);
      }
    }

    console.log(`✅ Botones cargados: ${this.buttons.size} botones`);
  }

  getCommandNameFromFile(filename) {
    const baseName = filename.replace("Command.js", "");

    return baseName
      .replace(/([a-z])([A-Z])/g, (match, p1, p2) => p1 + p2)
      .toLowerCase();
  }

  getButtonNameFromFile(filename) {
    const baseName = filename.replace("Button.js", "");
    return baseName.replace(/([a-z])([A-Z])/g, "$1$2").toLowerCase();
  }

  async handleCommand(interaction) {
    const commandName = interaction.commandName.toLowerCase();

    let command = this.commands.get(commandName);

    if (!command) {
      const variations = [
        commandName,
        commandName.replace(/-/g, ""),
        commandName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
      ];

      for (const variation of variations) {
        command = this.commands.get(variation);
        if (command) break;
      }

      if (!command) {
        for (const [name, cmd] of this.commands.entries()) {
          const normalizedName = name.replace(/-/g, "");
          const normalizedCmdName = commandName.replace(/-/g, "");
          if (
            normalizedName === normalizedCmdName ||
            name.includes(commandName) ||
            commandName.includes(name)
          ) {
            command = cmd;
            break;
          }
        }
      }
    }

    if (!command || !command.execute) {
      return false;
    }

    try {
      await command.execute(interaction);
      return true;
    } catch (error) {
      console.error(
        `❌ Error ejecutando comando ${commandName} en View:`,
        error
      );
      throw error;
    }
  }

  async handleMessage(message) {
    const content = message.content?.trim();
    if (!content || !content.startsWith("$")) {
      return false;
    }

    const args = content.slice(1).split(/\s+/);
    let commandName = args[0].toLowerCase();

    if (!commandName) {
      return false;
    }

    if (this.commandAliases.has(commandName)) {
      commandName = this.commandAliases.get(commandName);
    }

    const command = this.messageCommands.get(commandName);

    if (!command || !command.handleMessage) {
      return false;
    }

    if (
      commandName !== "ban" &&
      commandName !== "unban" &&
      commandName !== "restrict" &&
      commandName !== "unrestrict"
    ) {
      const Model = require("../model/Model");
      const model = Model.getInstance();
      const LanguageManager = require("../managers/LanguageManager");
      const langManager = LanguageManager.getInstance();
      const EmbedError = require("../extras/embedbuilder/embedcomponents/EmbedError");

      const guildId = message.guild?.id || null;
      const guildLocale = message.guild?.preferredLocale || null;
      const discordId = message.author.id;
      const discordServerId = guildId || "DM";

      try {
        const isBanned = await model.isUserBanned(discordId, discordServerId);
        if (isBanned) {
          const errorMessage = langManager.getString(
            guildId,
            "user_banned",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.reply({ embeds: [errorEmbed.build()] });
          return true;
        }
      } catch (banCheckError) {
        console.error("⚠️ Error verificando ban:", banCheckError);
      }
    }

    try {
      await command.handleMessage(message, args.slice(1));
      return true;
    } catch (error) {
      console.error(
        `❌ Error ejecutando comando de mensaje $${commandName} en View:`,
        error
      );
      throw error;
    }
  }

  async handleAutocomplete(interaction) {
    const commandName = interaction.commandName.toLowerCase();

    let command = this.commands.get(commandName);

    if (!command) {
      for (const [name, cmd] of this.commands.entries()) {
        if (name.includes(commandName) || commandName.includes(name)) {
          command = cmd;
          break;
        }
      }
    }

    if (!command || !command.autocomplete) {
      return false;
    }

    try {
      await command.autocomplete(interaction);
      return true;
    } catch (error) {
      console.error(
        `❌ Error en autocompletado de ${commandName} en View:`,
        error
      );
      throw error;
    }
  }

  async handleButton(interaction) {
    const customId = interaction.customId;

    if (!customId) {
      return false;
    }

    for (const [buttonName, button] of this.buttons.entries()) {
      try {
        const handled = await button.handleInteraction(interaction);
        if (handled) {
          return true;
        }
      } catch (error) {
        console.error(
          `❌ Error ejecutando botón ${buttonName} en View:`,
          error
        );
        throw error;
      }
    }

    return false;
  }
}

module.exports = View;
