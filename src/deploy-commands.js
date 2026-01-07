require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

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

(async () => {
  try {
    if (!process.env.CLIENT_ID) {
      throw new Error("CLIENT_ID no está definido en el archivo .env");
    }
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("DISCORD_TOKEN no está definido en el archivo .env");
    }

    
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

    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();


process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});
