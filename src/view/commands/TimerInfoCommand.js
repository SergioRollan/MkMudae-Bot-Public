const EmbedTimerInfo = require("../../extras/embedbuilder/embedcomponents/EmbedTimerInfo");
const LanguageManager = require("../../managers/LanguageManager");
const Model = require("../../model/Model");

function formatTimeRemaining(ms, guildId = null, guildLocale = null) {
  const lang = LanguageManager.getInstance();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (days > 0) {
    const label =
      days !== 1
        ? lang.getString(guildId, "time_days_plural", {}, guildLocale)
        : lang.getString(guildId, "time_days", {}, guildLocale);
    parts.push(`${days} ${label}`);
  }
  if (remainingHours > 0) {
    const label =
      remainingHours !== 1
        ? lang.getString(guildId, "time_hours_plural", {}, guildLocale)
        : lang.getString(guildId, "time_hours", {}, guildLocale);
    parts.push(`${remainingHours} ${label}`);
  }
  if (remainingMinutes > 0 && days === 0) {
    const label =
      remainingMinutes !== 1
        ? lang.getString(guildId, "time_minutes_plural", {}, guildLocale)
        : lang.getString(guildId, "time_minutes", {}, guildLocale);
    parts.push(`${remainingMinutes} ${label}`);
  }
  if (remainingSeconds > 0 && days === 0 && remainingHours === 0) {
    const label =
      remainingSeconds !== 1
        ? lang.getString(guildId, "time_seconds_plural", {}, guildLocale)
        : lang.getString(guildId, "time_seconds", {}, guildLocale);
    parts.push(`${remainingSeconds} ${label}`);
  }

  return parts.length > 0
    ? parts.join(", ")
    : lang.getString(guildId, "time_less_than_second", {}, guildLocale);
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;
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
    const timeRemaining = formatTimeRemaining(
      msUntilMidnight,
      guildId,
      guildLocale
    );

    let canClaim = true;
    let timeUntilClaimReset = null;
    let nextClaimResetDate = null;
    let rollsLeft = 0;
    let timeUntilRollReset = null;
    let nextRollResetDate = null;
    let trainsLeft = 0;
    let canWarCPU = true;
    let timeUntilCpuWarReset = null;
    let nextCpuWarResetDate = null;

    try {
      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const user = await model.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );
      canClaim = user.CanClaim !== false;
      rollsLeft = user.RollsLeft || 0;
      trainsLeft = user.TrainingsLeft || 0;
      canWarCPU = user.canwarcpu === true;

      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      const currentSecond = now.getUTCSeconds();
      const currentMillisecond = now.getUTCMilliseconds();

      const resetHours = [0, 3, 6, 9, 12, 15, 18, 21];

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

      const msUntilClaimReset = nextResetDate.getTime() - now.getTime();

      if (msUntilClaimReset > 0) {
        timeUntilClaimReset = formatTimeRemaining(
          msUntilClaimReset,
          guildId,
          guildLocale
        );
        nextClaimResetDate = nextResetDate;
      } else {
        timeUntilClaimReset = langManager.getString(
          guildId,
          "timer_claim_ready",
          {},
          guildLocale
        );
      }

      let nextRollReset = new Date(
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

      if (
        currentMinute === 0 &&
        currentSecond === 0 &&
        currentMillisecond === 0
      ) {
        nextRollReset = new Date(
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

      const msUntilRollReset = nextRollReset.getTime() - now.getTime();

      if (msUntilRollReset > 0) {
        timeUntilRollReset = formatTimeRemaining(
          msUntilRollReset,
          guildId,
          guildLocale
        );
        nextRollResetDate = nextRollReset;
      } else {
        timeUntilRollReset = langManager.getString(
          guildId,
          "timer_roll_ready",
          {},
          guildLocale
        );
      }

      const cpuWarResetHours = [0, 12];
      let nextCpuWarReset = null;

      for (const resetHour of cpuWarResetHours) {
        if (
          resetHour > currentHour ||
          (resetHour === currentHour &&
            currentMinute === 0 &&
            currentSecond === 0 &&
            currentMillisecond === 0)
        ) {
          nextCpuWarReset = new Date(
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

      if (!nextCpuWarReset) {
        nextCpuWarReset = new Date(
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

      const msUntilCpuWarReset = nextCpuWarReset.getTime() - now.getTime();

      if (msUntilCpuWarReset > 0) {
        timeUntilCpuWarReset = formatTimeRemaining(
          msUntilCpuWarReset,
          guildId,
          guildLocale
        );
        nextCpuWarResetDate = nextCpuWarReset;
      } else {
        timeUntilCpuWarReset = langManager.getString(
          guildId,
          "timer_cpuwar_ready",
          {},
          guildLocale
        );
      }
    } catch (error) {
      console.error(
        "❌ Error obteniendo información de claim, rolls y CPU War:",
        error
      );
    }

    const timerEmbed = new EmbedTimerInfo(
      timeRemaining,
      nextMidnightUTC,
      canClaim,
      timeUntilClaimReset,
      nextClaimResetDate,
      rollsLeft,
      timeUntilRollReset,
      nextRollResetDate,
      trainsLeft,
      canWarCPU,
      timeUntilCpuWarReset,
      nextCpuWarResetDate,
      guildId,
      guildLocale
    );
    const finalEmbed = timerEmbed.build();

    await message.reply({ embeds: [finalEmbed] });
  },
  async autocomplete(interaction) {},
};
