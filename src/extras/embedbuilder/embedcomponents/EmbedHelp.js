const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedHelp extends IEmbed {
  constructor(guildId = null, guildLocale = null) {
    super();
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const commandCategories = [
      {
        name: lang.getString(
          this.guildId,
          "help_category_game",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "roll",
            alias: "r",
            desc: lang.getString(
              this.guildId,
              "help_roll_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "buy",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_buy_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "sell",
            alias: "sl",
            desc: lang.getString(
              this.guildId,
              "help_sell_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "trade",
            alias: "td",
            desc: lang.getString(
              this.guildId,
              "help_trade_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "gift",
            alias: "g",
            desc: lang.getString(
              this.guildId,
              "help_gift_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "buyelo",
            alias: "be",
            desc: lang.getString(
              this.guildId,
              "help_buyelo_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_info",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "roster",
            alias: "rt",
            desc: lang.getString(
              this.guildId,
              "help_roster_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "playerinfo",
            alias: "pi",
            desc: lang.getString(
              this.guildId,
              "help_playerinfo_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "playerstats",
            alias: "ps",
            desc: lang.getString(
              this.guildId,
              "help_playerstats_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "rosterstats",
            alias: "rs",
            desc: lang.getString(
              this.guildId,
              "help_rosterstats_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "userinfo",
            alias: "ui",
            desc: lang.getString(
              this.guildId,
              "help_userinfo_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "timerinfo",
            alias: "ti",
            desc: lang.getString(
              this.guildId,
              "help_timerinfo_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "trackinfo",
            alias: "tri",
            desc: lang.getString(
              this.guildId,
              "help_trackinfo_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "rankinfo",
            alias: "ri",
            desc: lang.getString(
              this.guildId,
              "help_rankinfo_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "loungeodds",
            alias: "lo",
            desc: lang.getString(
              this.guildId,
              "help_loungeodds_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "leaderboardmmr",
            alias: "lbm",
            desc: lang.getString(
              this.guildId,
              "help_leaderboardmmr_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "leaderboard",
            alias: "lb",
            desc: lang.getString(
              this.guildId,
              "help_leaderboard_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_wishlist",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "wishlist",
            alias: "wl",
            desc: lang.getString(
              this.guildId,
              "help_wishlist_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "wishlistadd",
            alias: "wla",
            desc: lang.getString(
              this.guildId,
              "help_wishlistadd_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "wishlistremove",
            alias: "wlr",
            desc: lang.getString(
              this.guildId,
              "help_wishlistremove_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_lineup",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "lineup",
            alias: "lu",
            desc: lang.getString(
              this.guildId,
              "help_lineup_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "lineupadd",
            alias: "lua",
            desc: lang.getString(
              this.guildId,
              "help_lineupadd_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "lineupremove",
            alias: "lur",
            desc: lang.getString(
              this.guildId,
              "help_lineupremove_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_team",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "teamname",
            alias: "tn",
            desc: lang.getString(
              this.guildId,
              "help_teamname_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "editteamname",
            alias: "etn",
            desc: lang.getString(
              this.guildId,
              "help_editteamname_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "tag",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_tag_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "edittag",
            alias: "etag",
            desc: lang.getString(
              this.guildId,
              "help_edittag_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "alias",
            alias: "a",
            desc: lang.getString(
              this.guildId,
              "help_alias_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "removealias",
            alias: "ra",
            desc: lang.getString(
              this.guildId,
              "help_removealias_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_tracks",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "trackpick",
            alias: "trp",
            desc: lang.getString(
              this.guildId,
              "help_trackpick_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "trackremove",
            alias: "trr",
            desc: lang.getString(
              this.guildId,
              "help_trackremove_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_training",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "train",
            alias: "t",
            desc: lang.getString(
              this.guildId,
              "help_train_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_war",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "war",
            alias: "w",
            desc: lang.getString(
              this.guildId,
              "help_war_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "scrim",
            alias: "s",
            desc: lang.getString(
              this.guildId,
              "help_scrim_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "tournamentwar",
            alias: "tw",
            desc: lang.getString(
              this.guildId,
              "help_tournamentwar_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "cpuwar",
            alias: "cw",
            desc: lang.getString(
              this.guildId,
              "help_cpuwar_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "accept",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_accept_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "stop",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_stop_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "deny",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_deny_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "calc",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_calc_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
      {
        name: lang.getString(
          this.guildId,
          "help_category_admin",
          {},
          this.guildLocale
        ),
        commands: [
          {
            name: "ban",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_ban_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "unban",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_unban_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "coinsadd",
            alias: "ca",
            desc: lang.getString(
              this.guildId,
              "help_coinsadd_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "coinsremove",
            alias: "cr",
            desc: lang.getString(
              this.guildId,
              "help_coinsremove_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "removeplayer",
            alias: "rp",
            desc: lang.getString(
              this.guildId,
              "help_removeplayer_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "removealiasuser",
            alias: "rau",
            desc: lang.getString(
              this.guildId,
              "help_removealiasuser_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "fullreset",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_fullreset_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "thanos",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_thanos_short",
              {},
              this.guildLocale
            ),
          },
          {
            name: "adminrole",
            alias: null,
            desc: lang.getString(
              this.guildId,
              "help_adminrole_short",
              {},
              this.guildLocale
            ),
          },
        ],
      },
    ];

    const fields = [];

    for (const category of commandCategories) {
      const commandsList = category.commands
        .map((cmd) => {
          const cmdName = cmd.alias
            ? `\`$${cmd.name}\` (\`$${cmd.alias}\`)`
            : `\`$${cmd.name}\``;
          return `${cmdName} - ${cmd.desc}`;
        })
        .join("\n");

      fields.push({
        name: category.name,
        value: commandsList,
        inline: false,
      });
    }

    fields.push({
      name: lang.getString(
        this.guildId,
        "help_more_info",
        {},
        this.guildLocale
      ),
      value: lang.getString(
        this.guildId,
        "help_more_info_description",
        {},
        this.guildLocale
      ),
      inline: false,
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        lang.getString(this.guildId, "help_title", {}, this.guildLocale)
      )
      .setDescription(
        lang.getString(this.guildId, "help_description", {}, this.guildLocale)
      )
      .addFields(fields)
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedHelp;
