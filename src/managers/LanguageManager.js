const fs = require("fs");
const path = require("path");

class LanguageManager {
  constructor() {
    if (LanguageManager.instance) {
      return LanguageManager.instance;
    }

    this.languages = ["es", "en", "fr"];
    this.defaultLanguage = "es";
    this.guildLanguages = new Map();
    this.guildLanguagesFromDB = new Map();
    this.loadLanguages();

    LanguageManager.instance = this;
  }

  static getInstance() {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  loadLanguages() {
    const stringsPath = path.join(__dirname, "../strings");
    const files = fs.readdirSync(stringsPath);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const lang = file.replace(".json", "");
        const content = fs.readFileSync(path.join(stringsPath, file), "utf8");
        this.languages[lang] = JSON.parse(content);
      }
    }

    console.log(
      `✅ Idiomas cargados: ${Object.keys(this.languages).join(", ")}`
    );
  }

  setGuildLanguage(guildId, language) {
    if (this.languages[language]) {
      this.guildLanguages.set(guildId, language);
      return true;
    }
    return false;
  }

  setGuildLanguageFromDB(guildId, language) {
    if (this.languages[language]) {
      this.guildLanguagesFromDB.set(guildId, language);
      return true;
    }
    return false;
  }

  getGuildLanguage(guildId, guildLocale = null) {
    if (guildLocale && ["es", "en", "fr"].includes(guildLocale)) {
      return guildLocale;
    }

    if (this.guildLanguagesFromDB.has(guildId)) {
      return this.guildLanguagesFromDB.get(guildId);
    }

    if (this.guildLanguages.has(guildId)) {
      return this.guildLanguages.get(guildId);
    }

    if (guildLocale) {
      const discordLangMap = {
        "es-ES": "es",
        "es-419": "es",
        "en-US": "en",
        "en-GB": "en",
        fr: "fr",
      };

      const detectedLang = discordLangMap[guildLocale] || this.defaultLanguage;
      return detectedLang;
    }

    return this.defaultLanguage;
  }

  getString(guildId, key, replacements = {}, guildLocale = null) {
    const lang = this.getGuildLanguage(guildId, guildLocale);
    let string =
      this.languages[lang]?.[key] ||
      this.languages[this.defaultLanguage]?.[key] ||
      key;

    for (const [placeholder, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{${placeholder}\\}`, "g");
      string = string.replace(regex, value);
    }

    return string;
  }
}

module.exports = LanguageManager;
