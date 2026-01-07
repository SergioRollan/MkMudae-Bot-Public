require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { syncLoungeData } = require("./timetriggers/syncLoungeData");
const { resetCanClaim } = require("./timetriggers/resetCanClaim");
const { resetRolls } = require("./timetriggers/resetRolls");
const { resetCanWarCPU } = require("./timetriggers/resetCanWarCPU");
const { rechargeEnergy } = require("./timetriggers/rechargeEnergy");
const View = require("./view/View");
const LanguageManager = require("./managers/LanguageManager");
const Utils = require("./extras/Utils");
const LangDAO = require("./dao/LangDAO");

global.DEBUG = process.env.RAILWAY_ENVIRONMENT && process.env.TEST_CHANNEL_ID;

let pg;
try {
  pg = require("pg");
} catch (err) {
  console.warn(
    "Dependencia 'pg' no instalada. Ejecuta: npm i pg — se omitirá la conexión a la base de datos."
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const view = new View();

client.once("ready", () => {
  console.log(`Bot listo como ${client.user.tag}`);
  console.log(`Servidores conectados: ${client.guilds.cache.size}`);

  const config = Utils.getConfig();

  config.rollsClaimable = {};
  Utils.saveConfig(config);

  setupLoungeSync();
  setupCanClaimReset();
  setupRollReset();
  setupCanWarCPUReset();
  setupEnergyRecharge();
});

function setupLoungeSync() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const now = new Date();
  const nextMidnightUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );

  const msUntilMidnight = nextMidnightUTC.getTime() - now.getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  const delay = Math.max(msUntilMidnight, 1000);

  console.log(
    `🕐 Sincronización de Lounge programada para medianoche UTC: ${nextMidnightUTC.toISOString()}`
  );
  console.log(`   (en ${Math.round(delay / 1000 / 60)} minutos)`);

  setTimeout(() => {
    console.log(
      "🔄 Iniciando sincronización de datos de Lounge (medianoche UTC)..."
    );
    syncLoungeData().catch((error) => {
      console.error("❌ Error en sincronización automática de Lounge:", error);
    });

    setInterval(() => {
      console.log(
        "🔄 Iniciando sincronización de datos de Lounge (medianoche UTC)..."
      );
      syncLoungeData().catch((error) => {
        console.error(
          "❌ Error en sincronización automática de Lounge:",
          error
        );
      });
    }, oneDayInMs);
  }, delay);
}

function setupCanClaimReset() {
  const resetHours = [0, 3, 6, 9, 12, 15, 18, 21];

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentSecond = now.getUTCSeconds();
  const currentMillisecond = now.getUTCMilliseconds();

  let nextResetHour = null;
  let nextResetDate = null;

  for (const resetHour of resetHours) {
    if (resetHour > currentHour) {
      nextResetHour = resetHour;
      nextResetDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          resetHour,
          0,
          0,
          0
        )
      );
      break;
    }
    if (
      resetHour === currentHour &&
      currentMinute === 0 &&
      currentSecond === 0 &&
      currentMillisecond === 0
    ) {
      nextResetHour = resetHour;
      nextResetDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          resetHour,
          0,
          0,
          0
        )
      );
      break;
    }
  }

  if (!nextResetDate) {
    nextResetDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
  }

  const msUntilReset = nextResetDate.getTime() - now.getTime();
  const threeHoursInMs = 3 * 60 * 60 * 1000;

  const delay = Math.max(msUntilReset, 1000);

  console.log(
    `🕐 Reset de canClaim programado para: ${nextResetDate.toISOString()}`
  );
  console.log(`   (en ${Math.round(delay / 1000 / 60)} minutos)`);
  console.log(`   Hora actual (UTC): ${now.toISOString()}`);

  const executeReset = () => {
    console.log(
      "🔄 Iniciando reset de canClaim (horas: 00, 03, 06, 09, 12, 15, 18, 21 UTC)..."
    );
    console.log(`   Hora de ejecución (UTC): ${new Date().toISOString()}`);
    resetCanClaim().catch((error) => {
      console.error("❌ Error en reset automático de canClaim:", error);
    });
  };

  setTimeout(() => {
    executeReset();

    setInterval(() => {
      executeReset();
    }, threeHoursInMs);
  }, delay);
}

function setupRollReset() {
  const now = new Date();
  const currentMinute = now.getUTCMinutes();
  const currentSecond = now.getUTCSeconds();
  const currentMillisecond = now.getUTCMilliseconds();

  let nextResetDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours() + 1,
      0,
      0,
      0
    )
  );

  if (currentMinute === 0 && currentSecond === 0 && currentMillisecond === 0) {
    nextResetDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        0,
        0,
        0
      )
    );
  }

  const msUntilReset = nextResetDate.getTime() - now.getTime();
  const oneHourInMs = 60 * 60 * 1000;

  const delay = Math.max(msUntilReset, 1000);

  console.log(
    `🕐 Reset de rolls programado para: ${nextResetDate.toISOString()}`
  );
  console.log(`   (en ${Math.round(delay / 1000 / 60)} minutos)`);
  console.log(`   Hora actual (UTC): ${now.toISOString()}`);

  const executeReset = () => {
    console.log("🔄 Iniciando reset de rolls (cada 1 hora UTC)...");
    console.log(`   Hora de ejecución (UTC): ${new Date().toISOString()}`);
    resetRolls().catch((error) => {
      console.error("❌ Error en reset automático de rolls:", error);
    });
  };

  setTimeout(() => {
    executeReset();

    setInterval(() => {
      executeReset();
    }, oneHourInMs);
  }, delay);
}

function setupCanWarCPUReset() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const resetHours = [0, 12];

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentSecond = now.getUTCSeconds();
  const currentMillisecond = now.getUTCMilliseconds();

  let nextResetHour = null;
  let nextResetDate = null;

  for (const resetHour of resetHours) {
    if (
      resetHour > currentHour ||
      (resetHour === currentHour &&
        currentMinute === 0 &&
        currentSecond === 0 &&
        currentMillisecond === 0)
    ) {
      nextResetHour = resetHour;
      nextResetDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          resetHour,
          0,
          0,
          0
        )
      );
      break;
    }
  }

  if (!nextResetDate) {
    nextResetDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
  }

  const msUntilReset = nextResetDate.getTime() - now.getTime();
  const twelveHoursInMs = 12 * 60 * 60 * 1000;

  const delay = Math.max(msUntilReset, 1000);

  console.log(
    `🕐 Reset de canWarCPU programado para: ${nextResetDate.toISOString()}`
  );
  console.log(`   (en ${Math.round(delay / 1000 / 60)} minutos)`);
  console.log(`   Hora actual (UTC): ${now.toISOString()}`);

  const executeReset = () => {
    console.log(
      "🔄 Iniciando reset de canWarCPU (horas: 00:00 y 12:00 UTC)..."
    );
    console.log(`   Hora de ejecución (UTC): ${new Date().toISOString()}`);
    resetCanWarCPU().catch((error) => {
      console.error("❌ Error en reset automático de canWarCPU:", error);
    });
  };

  setTimeout(() => {
    executeReset();

    setInterval(() => {
      executeReset();
    }, twelveHoursInMs);
  }, delay);
}

function setupEnergyRecharge() {
  if (!process.env.RAILWAY_ENVIRONMENT) return;

  const now = new Date();
  const currentMinute = now.getUTCMinutes();
  const currentSecond = now.getUTCSeconds();
  const currentMillisecond = now.getUTCMilliseconds();

  let nextResetMinute = 30;
  if (currentMinute < 30) {
    nextResetMinute = 30;
  } else {
    nextResetMinute = 60;
  }

  let nextResetDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      nextResetMinute,
      0,
      0
    )
  );

  if (nextResetMinute === 60) {
    nextResetDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours() + 1,
        0,
        0,
        0
      )
    );
  }

  if (
    (currentMinute === 0 || currentMinute === 30) &&
    currentSecond === 0 &&
    currentMillisecond === 0
  ) {
    nextResetDate = now;
  }

  const msUntilReset = nextResetDate.getTime() - now.getTime();
  const thirtyMinutesInMs = 30 * 60 * 1000;

  const delay = Math.max(msUntilReset, 1000);

  console.log(
    `🕐 Recarga de energía programada para: ${nextResetDate.toISOString()}`
  );
  console.log(`   (en ${Math.round(delay / 1000 / 60)} minutos)`);
  console.log(`   Hora actual (UTC): ${now.toISOString()}`);

  const executeRecharge = () => {
    console.log("🔄 Iniciando recarga de energía (cada 30 minutos UTC)...");
    console.log(`   Hora de ejecución (UTC): ${new Date().toISOString()}`);
    rechargeEnergy().catch((error) => {
      console.error("❌ Error en recarga automática de energía:", error);
    });
  };

  setTimeout(() => {
    executeRecharge();

    setInterval(() => {
      executeRecharge();
    }, thirtyMinutesInMs);
  }, delay);
}

client.on("interactionCreate", async (interaction) => {
  if (global.DEBUG && interaction.channel?.id === process.env.TEST_CHANNEL_ID) {
    return;
  }

  await checkBdLangIfNeeded(interaction);

  const langManager = LanguageManager.getInstance();
  const guildId = interaction.guild?.id || null;
  let guildLocale = interaction.guild?.preferredLocale || null;

  if (interaction.guild) {
    const dbLocale = await Utils.getGuildLocaleFromDB({
      guild: interaction.guild,
    });
    if (dbLocale) {
      guildLocale = dbLocale;
    }
  }

  if (interaction.isChatInputCommand()) {
    const bypassChannelRestriction = interaction.commandName === "channel";
    if (
      guildId &&
      !bypassChannelRestriction &&
      !(await Utils.isChannelAllowed(
        guildId,
        interaction.channel || interaction.channelId
      ))
    ) {
      return;
    }

    try {
      await view.handleCommand(interaction);
    } catch (error) {
      console.error(
        `Error ejecutando comando ${interaction.commandName}:`,
        error
      );
      if (!interaction.replied && !interaction.deferred) {
        const errorMessage = langManager.getString(
          guildId,
          "error_executing_command",
          {},
          guildLocale
        );
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }
    }
  } else if (interaction.isAutocomplete()) {
    try {
      await view.handleAutocomplete(interaction);
    } catch (error) {
      console.error(
        `Error en autocompletado del comando ${interaction.commandName}:`,
        error
      );
    }
  } else if (interaction.isButton()) {
    try {
      await view.handleButton(interaction);
    } catch (error) {
      if (error.code === 10062) {
        console.warn(
          "⚠️ Interacción de botón expirada antes de poder responder"
        );
        return;
      }

      console.error("Error manejando interacción de botón:", error);
      if (!interaction.replied && !interaction.deferred) {
        try {
          const errorMessage = langManager.getString(
            guildId,
            "error_processing_button",
            {},
            guildLocale
          );
          await interaction.reply({
            content: errorMessage,
            ephemeral: true,
          });
        } catch (replyError) {
          if (replyError.code !== 10062) {
            console.error(
              "❌ Error respondiendo a interacción de botón:",
              replyError
            );
          }
        }
      }
    }
  }
});

async function queryToDatabase() {
  if (!pg) return;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn(
      "DATABASE_URL no está definido. Saltando inicialización de BD."
    );
    return;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
  const isTestChannel = message.channel?.id === process.env.TEST_CHANNEL_ID;

  if (!isRailway && !isTestChannel) {
    return;
  }

  if (global.DEBUG && message.channel.id === process.env.TEST_CHANNEL_ID) {
    return;
  }

  await checkBdLangIfNeeded(message);

  const trimmedContent = message.content?.trim();
  if (
    message.guild &&
    typeof trimmedContent === "string" &&
    trimmedContent.startsWith("$") &&
    !(await Utils.isChannelAllowed(message.guild.id, message.channel))
  ) {
    return;
  }

  try {
    await view.handleMessage(message);
  } catch (error) {
    console.error("Error manejando mensaje en View:", error);
  }
});

const hasCheckedBdLang = new Map();

async function checkBdLangIfNeeded(interactionOrMessage) {
  if (!process.env.DATABASE_URL || !interactionOrMessage?.guild) {
    return;
  }

  const guildId = interactionOrMessage.guild.id;

  if (hasCheckedBdLang.has(guildId)) {
    return;
  }

  hasCheckedBdLang.set(guildId, true);

  try {
    const langDAO = new LangDAO();

    const langData = await langDAO.getByGuildId(guildId);

    if (langData && langData.lang_code) {
      const langCode = langData.lang_code;
      const langManager = LanguageManager.getInstance();
      langManager.setGuildLanguageFromDB(guildId, langCode);
    }
  } catch (error) {
    console.error("⚠️ Error verificando idioma de BD:", error);
  }
}

async function deployCommands() {
  try {
    if (!process.env.CLIENT_ID) {
      throw new Error("CLIENT_ID no está definido en el archivo .env");
    }
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("DISCORD_TOKEN no está definido en el archivo .env");
    }

    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN
    );
    const commands = [];
    const viewCommandsPath = path.join(__dirname, "view/commands");

    if (fs.existsSync(viewCommandsPath)) {
      const commandFiles = fs.readdirSync(viewCommandsPath);
      for (const file of commandFiles) {
        try {
          const command = require(path.join(viewCommandsPath, file));
          if (command.data) {
            commands.push(command.data.toJSON());
            console.log(`✅ Comando slash cargado: ${command.data.name}`);
          }
        } catch (err) {
          console.error(`⚠️  Error cargando ${file}:`, err.message);
        }
      }
    }

    console.log(`📋 Total de comandos slash a registrar: ${commands.length}`);

    if (process.env.GUILD_ID) {
      console.log(
        `🗑️  Eliminando comandos de guild ${process.env.GUILD_ID}...`
      );
      const guildRoute = Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      );
      await rest.put(guildRoute, { body: [] });
      console.log("✅ Comandos de guild eliminados.");
    }

    const globalRoute = Routes.applicationCommands(process.env.CLIENT_ID);

    console.log("🌍 Actualizando comandos slash (scope: global)...");

    await rest.put(globalRoute, { body: commands });

    console.log(
      "✅ Comandos globales registrados (pueden tardar hasta 1h en propagarse)."
    );
  } catch (error) {
    console.error("❌ Error desplegando comandos:", error);
  }
}

async function startBot() {
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log("🚀 Ejecutando deploy de comandos antes de iniciar el bot...");
    await deployCommands();
  }

  queryToDatabase().finally(() => {
    client.login(process.env.DISCORD_TOKEN);
  });
}

startBot();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});
