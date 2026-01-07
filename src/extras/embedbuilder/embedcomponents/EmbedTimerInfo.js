const { EmbedBuilder } = require("discord.js");
const IEmbed = require("../IEmbed");
const LanguageManager = require("../../../managers/LanguageManager");

class EmbedTimerInfo extends IEmbed {
  constructor(
    timeRemaining,
    nextMidnightUTC,
    canClaim = true,
    timeUntilClaimReset = null,
    nextClaimResetDate = null,
    rollsLeft = 0,
    timeUntilRollReset = null,
    nextRollResetDate = null,
    trainsLeft = 0,
    canWarCPU = true,
    timeUntilCpuWarReset = null,
    nextCpuWarResetDate = null,
    guildId = null,
    guildLocale = null
  ) {
    super();
    this.timeRemaining = timeRemaining;
    this.nextMidnightUTC = nextMidnightUTC;
    this.canClaim = canClaim !== false;
    this.timeUntilClaimReset = timeUntilClaimReset;
    this.nextClaimResetDate = nextClaimResetDate;
    this.rollsLeft = rollsLeft;
    this.timeUntilRollReset = timeUntilRollReset;
    this.nextRollResetDate = nextRollResetDate;
    this.trainsLeft = trainsLeft;
    this.canWarCPU = canWarCPU === true;
    this.timeUntilCpuWarReset = timeUntilCpuWarReset;
    this.nextCpuWarResetDate = nextCpuWarResetDate;
    this.guildId = guildId;
    this.guildLocale = guildLocale;
  }

  build() {
    const lang = LanguageManager.getInstance();

    const fields = [];

    const mmrGroupTitle = lang.getString(
      this.guildId,
      "timer_mmr_group_title",
      {},
      this.guildLocale
    );
    let mmrGroupValue = `**${lang.getString(
      this.guildId,
      "timer_time_remaining_field",
      {},
      this.guildLocale
    )}:** \`${this.timeRemaining}\`\n`;
    mmrGroupValue += `**${lang.getString(
      this.guildId,
      "timer_next_update_field",
      {},
      this.guildLocale
    )}:** <t:${Math.floor(this.nextMidnightUTC.getTime() / 1000)}:F>`;

    fields.push({
      name: mmrGroupTitle,
      value: mmrGroupValue,
      inline: false,
    });

    fields.push({
      name: "\u200b",
      value: "\u200b",
      inline: true,
    });

    const claimGroupTitle = lang.getString(
      this.guildId,
      "timer_claim_group_title",
      {},
      this.guildLocale
    );
    const claimStatus = this.canClaim
      ? lang.getString(
          this.guildId,
          "timer_claim_available",
          {},
          this.guildLocale
        )
      : lang.getString(
          this.guildId,
          "timer_claim_unavailable",
          {},
          this.guildLocale
        );

    let claimGroupValue = `**${lang.getString(
      this.guildId,
      "timer_claim_status_field",
      {},
      this.guildLocale
    )}:** ${claimStatus}`;

    if (this.timeUntilClaimReset) {
      claimGroupValue += `\n**${lang.getString(
        this.guildId,
        "timer_claim_reset_field",
        {},
        this.guildLocale
      )}:** `;
      if (this.nextClaimResetDate) {
        claimGroupValue += `\`${this.timeUntilClaimReset}\`\n<t:${Math.floor(
          this.nextClaimResetDate.getTime() / 1000
        )}:F>`;
      } else {
        claimGroupValue += `\`${this.timeUntilClaimReset}\``;
      }
    }

    fields.push({
      name: claimGroupTitle,
      value: claimGroupValue,
      inline: false,
    });

    fields.push({
      name: "\u200b",
      value: "\u200b",
      inline: true,
    });

    const rollsGroupTitle = lang.getString(
      this.guildId,
      "timer_rolls_group_title",
      {},
      this.guildLocale
    );
    const rollsStatusField = lang.getString(
      this.guildId,
      "timer_rolls_status_field",
      {},
      this.guildLocale
    );
    const trainsStatusField = lang.getString(
      this.guildId,
      "timer_trains_status_field",
      {},
      this.guildLocale
    );

    let rollsGroupValue = `**${rollsStatusField}:** **${this.rollsLeft}**\n`;
    rollsGroupValue += `**${trainsStatusField}:** **${this.trainsLeft}**`;

    if (this.timeUntilRollReset) {
      rollsGroupValue += `\n**${lang.getString(
        this.guildId,
        "timer_roll_reset_field",
        {},
        this.guildLocale
      )}:** `;
      if (this.nextRollResetDate) {
        rollsGroupValue += `\`${this.timeUntilRollReset}\`\n<t:${Math.floor(
          this.nextRollResetDate.getTime() / 1000
        )}:F>`;
      } else {
        rollsGroupValue += `\`${this.timeUntilRollReset}\``;
      }
    }

    fields.push({
      name: rollsGroupTitle,
      value: rollsGroupValue,
      inline: false,
    });

    fields.push({
      name: "\u200b",
      value: "\u200b",
      inline: true,
    });

    const cpuWarGroupTitle = lang.getString(
      this.guildId,
      "timer_cpuwar_group_title",
      {},
      this.guildLocale
    );
    const cpuWarStatus = this.canWarCPU
      ? lang.getString(
          this.guildId,
          "timer_cpuwar_available",
          {},
          this.guildLocale
        )
      : lang.getString(
          this.guildId,
          "timer_cpuwar_unavailable",
          {},
          this.guildLocale
        );

    let cpuWarGroupValue = `**${lang.getString(
      this.guildId,
      "timer_cpuwar_status_field",
      {},
      this.guildLocale
    )}:** ${cpuWarStatus}`;

    if (this.timeUntilCpuWarReset) {
      cpuWarGroupValue += `\n**${lang.getString(
        this.guildId,
        "timer_cpuwar_reset_field",
        {},
        this.guildLocale
      )}:** `;
      if (this.nextCpuWarResetDate) {
        cpuWarGroupValue += `\`${this.timeUntilCpuWarReset}\`\n<t:${Math.floor(
          this.nextCpuWarResetDate.getTime() / 1000
        )}:F>`;
      } else {
        cpuWarGroupValue += `\`${this.timeUntilCpuWarReset}\``;
      }
    }

    fields.push({
      name: cpuWarGroupTitle,
      value: cpuWarGroupValue,
      inline: false,
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(
        lang.getString(this.guildId, "timer_title", {}, this.guildLocale)
      )
      .setDescription(
        lang.getString(this.guildId, "timer_description", {}, this.guildLocale)
      )
      .addFields(...fields)
      .setFooter({
        text: lang.getString(
          this.guildId,
          "timer_footer",
          {},
          this.guildLocale
        ),
      })
      .setTimestamp();

    return embed;
  }
}

module.exports = EmbedTimerInfo;
