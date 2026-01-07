const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const EmbedTrainMenu = require("../../extras/embedbuilder/embedcomponents/EmbedTrainMenu");
const EmbedTrainFocusMenu = require("../../extras/embedbuilder/embedcomponents/EmbedTrainFocusMenu");
const PlayerDAO = require("../../dao/PlayerDAO");
const TrainingManager = require("../../managers/TrainingManager");
const Utils = require("../../extras/Utils");
const DecoratorTrainingSummary = require("../../extras/embedbuilder/decorators/DecoratorTrainingSummary");
const DecoratorTrainingsLeft = require("../../extras/embedbuilder/decorators/DecoratorTrainingsLeft");
const UserDAO = require("../../dao/UserDAO");

const MAX_TOTAL_STATS = 8000;
const MIN_STAT_MMR = -990;
const MAX_STAT_MMR = 2310;
const ALL_ATTRIBUTES = [
  "Lines",
  "Consistency",
  "ItemUsage",
  "Precision",
  "Communication",
  "Mental",
  "GameSense",
  "Shockfinding",
];

function adjustStatsToLimit(currentStats, newValues, trainedPositively) {
  const finalStats = { ...currentStats };
  for (const attr of ALL_ATTRIBUTES) {
    if (newValues[attr] !== undefined) {
      finalStats[attr] = newValues[attr];
    } else {
      finalStats[attr] = Number(currentStats[attr] || 0);
    }
  }

  let totalStats = 0;
  for (const attr of ALL_ATTRIBUTES) {
    totalStats += Number(finalStats[attr] || 0);
  }

  if (totalStats <= MAX_TOTAL_STATS) {
    return { adjustedValues: newValues, additionalChanges: {} };
  }

  const excess = totalStats - MAX_TOTAL_STATS;

  const eligibleForReduction = ALL_ATTRIBUTES.filter(
    (attr) => !trainedPositively.includes(attr)
  );

  if (eligibleForReduction.length === 0) {
    return { adjustedValues: newValues, additionalChanges: {} };
  }

  const additionalChanges = {};
  for (let i = 0; i < excess; i++) {
    const randomIndex = Math.floor(Math.random() * eligibleForReduction.length);
    const attrToReduce = eligibleForReduction[randomIndex];

    if (newValues[attrToReduce] !== undefined) {
      newValues[attrToReduce] -= 1;
    } else {
      newValues[attrToReduce] = Number(currentStats[attrToReduce] || 0) - 1;
    }

    if (!additionalChanges[attrToReduce]) {
      additionalChanges[attrToReduce] = {
        before: Number(currentStats[attrToReduce] || 0),
        reductions: 0,
      };
    }
    additionalChanges[attrToReduce].reductions += 1;
  }

  return { adjustedValues: newValues, additionalChanges };
}

module.exports = {
  async handleMessage(message, args) {
    const model = Model.getInstance();
    const langManager = LanguageManager.getInstance();
    const guildId = message.guild?.id || null;
    const guildLocale = message.guild?.preferredLocale || null;

    try {
      const fullText = message.content || "";
      const matchQuotes = fullText.match(/\"([^"]+)\"/);
      let playerInput = matchQuotes ? matchQuotes[1].trim() : null;

      if (!playerInput) {
        const withoutCommand = fullText
          .replace(/^\s*\$(train|t)\s*/i, "")
          .trim();
        playerInput = withoutCommand.length > 0 ? withoutCommand : null;
      }

      if (!playerInput) {
        const errorMessage = langManager.getString(
          guildId,
          "train_no_player_name",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const discordId = message.author.id;
      const discordServerId = guildId || "DM";
      const userName = message.author.username;

      const userRecord = await model.getUser(
        discordId,
        discordServerId,
        userName,
        guildLocale
      );

      if (!userRecord) {
        const errorMessage = langManager.getString(
          guildId,
          "userinfo_not_found",
          { name: userName },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const ownedPlayers = await model.getUserOwnedPlayers(userRecord.UserID);

      let bestMatch = null;
      let bestIsAlias = false;

      for (const player of ownedPlayers) {
        const alias = (player.OwnershipAlias || "").trim().toLowerCase();
        const name = (player.Alias || player.Name || player.LoungeName || "")
          .trim()
          .toLowerCase();
        const input = playerInput.toLowerCase();

        const aliasMatches = alias && alias === input;
        const nameMatches = name && name === input;

        if (aliasMatches) {
          bestMatch = player;
          bestIsAlias = true;
          break;
        }

        if (!bestMatch && nameMatches) {
          bestMatch = player;
          bestIsAlias = false;
        }
      }

      if (!bestMatch) {
        const errorMessage = langManager.getString(
          guildId,
          "train_player_not_owned",
          { name: playerInput },
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const displayName =
        (bestIsAlias && bestMatch.OwnershipAlias) ||
        bestMatch.Alias ||
        bestMatch.Name ||
        bestMatch.LoungeName ||
        playerInput;

      try {
        const playerIdCheck = Number(
          bestMatch.IDPlayer || bestMatch.IdPlayer || bestMatch.idplayer
        );
        if (Number.isInteger(playerIdCheck)) {
          const daoCheck = new PlayerDAO();
          const config = Utils.getConfig();
          const tableKey =
            daoCheck.tableName === "PlayerTest" ? "PlayerTest" : "Player";
          const trainedList =
            config?.trainedPlayers?.[tableKey] &&
            Array.isArray(config.trainedPlayers[tableKey])
              ? config.trainedPlayers[tableKey]
              : [];
          if (trainedList.includes(playerIdCheck)) {
            const alreadyMsg = langManager.getString(
              guildId,
              "train_already_trained",
              {},
              guildLocale
            );
            const alreadyEmbed = new EmbedError(
              alreadyMsg,
              guildId,
              guildLocale
            );
            await message.reply({ embeds: [alreadyEmbed.build()] });
            return;
          }
        }
      } catch (e) {}

      if (userRecord.TrainingsLeft <= 0) {
        const errorMessage = langManager.getString(
          guildId,
          "train_no_trainings_left",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.reply({ embeds: [errorEmbed.build()] });
        return;
      }

      const embed = new EmbedTrainMenu(displayName, guildId, guildLocale);
      await message.reply({ embeds: [embed.build()] });

      const filter = (m) =>
        m.author.id === message.author.id &&
        m.channel.id === message.channel.id;

      const firstCollected = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 120000,
      });

      if (firstCollected.size === 0) {
        const timeoutMessage = langManager.getString(
          guildId,
          "train_timeout",
          {},
          guildLocale
        );
        const timeoutEmbed = new EmbedError(
          timeoutMessage,
          guildId,
          guildLocale
        );
        await message.channel.send({ embeds: [timeoutEmbed.build()] });
        return;
      }

      const firstResponse = firstCollected.first().content.trim();

      if (
        firstResponse.length === 0 ||
        firstResponse.length > 1 ||
        !/^\d+$/.test(firstResponse)
      ) {
        const errorMessage = langManager.getString(
          guildId,
          "train_invalid_choice",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.channel.send({ embeds: [errorEmbed.build()] });
        return;
      }

      const trainingChoice = parseInt(firstResponse, 10);

      if (trainingChoice < 1 || trainingChoice > 8) {
        const errorMessage = langManager.getString(
          guildId,
          "train_invalid_choice",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.channel.send({ embeds: [errorEmbed.build()] });
        return;
      }

      const userDao = new UserDAO();
      const trainingSlotValue = await userDao.getTrainingSlotValue(
        userRecord.UserID,
        trainingChoice
      );

      if (trainingSlotValue !== null && trainingSlotValue <= 0) {
        const errorMessage = langManager.getString(
          guildId,
          "train_limit_reached",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.channel.send({ embeds: [errorEmbed.build()] });
        return;
      }

      if (trainingChoice === 8) {
        const focusEmbed = new EmbedTrainFocusMenu(
          displayName,
          guildId,
          guildLocale
        );
        await message.channel.send({ embeds: [focusEmbed.build()] });

        const secondCollected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
        });

        if (secondCollected.size === 0) {
          const timeoutMessage = langManager.getString(
            guildId,
            "train_timeout",
            {},
            guildLocale
          );
          const timeoutEmbed = new EmbedError(
            timeoutMessage,
            guildId,
            guildLocale
          );
          await message.channel.send({ embeds: [timeoutEmbed.build()] });
          return;
        }

        const secondResponse = secondCollected.first().content.trim();

        if (
          secondResponse.length === 0 ||
          secondResponse.length > 1 ||
          !/^\d+$/.test(secondResponse)
        ) {
          const errorMessage = langManager.getString(
            guildId,
            "train_invalid_attribute",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.channel.send({ embeds: [errorEmbed.build()] });
          return;
        }

        const attributeChoice = parseInt(secondResponse, 10);

        if (attributeChoice < 1 || attributeChoice > 8) {
          const errorMessage = langManager.getString(
            guildId,
            "train_invalid_attribute",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await message.channel.send({ embeds: [errorEmbed.build()] });
          return;
        }

        const attrNames = [
          "playerinfo_role_lines",
          "playerinfo_role_consistency",
          "playerinfo_role_item_usage",
          "playerinfo_role_precision",
          "playerinfo_role_communication",
          "playerinfo_role_mental",
          "playerinfo_role_game_sense",
          "playerinfo_role_shockfinding",
        ];

        const attrKey = attrNames[attributeChoice - 1];
        const attrLabel = langManager.getString(
          guildId,
          attrKey,
          {},
          guildLocale
        );

        const attrColumnMap = [
          "Lines",
          "Consistency",
          "ItemUsage",
          "Precision",
          "Communication",
          "Mental",
          "GameSense",
          "Shockfinding",
        ];
        const column = attrColumnMap[attributeChoice - 1];

        const playerId = Number(
          bestMatch.IDPlayer || bestMatch.IdPlayer || bestMatch.idplayer
        );
        if (Number.isInteger(playerId)) {
          const dao = new PlayerDAO();
          const current = await dao.getPlayerByIdInServer(
            playerId,
            discordServerId
          );
          if (current) {
            const newVal = Number(current[column] || 0) + 33;
            let newValues = { [column]: newVal };

            const { adjustedValues, additionalChanges } = adjustStatsToLimit(
              current,
              newValues,
              [column]
            );
            newValues = adjustedValues;

            for (const attr in newValues) {
              if (newValues.hasOwnProperty(attr)) {
                newValues[attr] = Math.max(
                  MIN_STAT_MMR,
                  Math.min(MAX_STAT_MMR, Number(newValues[attr] || 0))
                );
              }
            }

            await dao.updatePlayerAttributes(playerId, newValues);

            try {
              Utils.addTrainedPlayer(playerId, dao.tableName);
            } catch (e) {}

            let oldPct = Utils.getStatfromMMR(Number(current[column] || 0));
            let newPct = Utils.getStatfromMMR(newValues[column]);
            oldPct = Math.max(0, Math.min(100, oldPct));
            newPct = Math.max(0, Math.min(100, newPct));
            const changes = { [column]: { old: oldPct, new: newPct } };

            for (const [attr, info] of Object.entries(additionalChanges)) {
              const finalValue = newValues[attr];
              let oldChangePct = Utils.getStatfromMMR(info.before);
              let newChangePct = Utils.getStatfromMMR(finalValue);
              oldChangePct = Math.max(0, Math.min(100, oldChangePct));
              newChangePct = Math.max(0, Math.min(100, newChangePct));
              changes[attr] = {
                old: oldChangePct,
                new: newChangePct,
              };
            }

            let remaining = null;
            try {
              const userDao = new UserDAO();
              const updatedUser = await userDao.decrementTrainingsLeftBy1(
                userRecord.UserID
              );
              remaining = updatedUser?.TrainingsLeft ?? null;
            } catch (e) {
              console.warn(
                "⚠️ No se pudo decrementar TrainingsLeft:",
                e?.message
              );
            }

            try {
              const userDao = new UserDAO();
              await userDao.decrementTrainingSlot(userRecord.UserID, 8);
            } catch (e) {
              console.warn(
                "⚠️ No se pudo decrementar trainingsleft8:",
                e?.message
              );
            }

            const successMessage = langManager.getString(
              guildId,
              "train_completed_focus_description",
              { name: displayName, attr: attrLabel },
              guildLocale
            );
            let successEmbed = new EmbedSuccess(
              successMessage,
              guildId,
              guildLocale
            );
            successEmbed = new DecoratorTrainingSummary(
              successEmbed,
              changes,
              guildId,
              guildLocale
            );
            if (remaining !== null) {
              successEmbed = new DecoratorTrainingsLeft(
                successEmbed,
                remaining,
                guildId,
                guildLocale
              );
            }
            await message.channel.send({ embeds: [successEmbed.build()] });
            return;
          }
        }

        const successMessage = langManager.getString(
          guildId,
          "train_completed_focus_description",
          { name: displayName, attr: attrLabel },
          guildLocale
        );
        const successEmbed = new EmbedSuccess(
          successMessage,
          guildId,
          guildLocale
        );
        await message.channel.send({ embeds: [successEmbed.build()] });
        return;
      }

      const training = TrainingManager.getTraining(trainingChoice);
      if (!training || !training.effects) {
        const errorMessage = langManager.getString(
          guildId,
          "error_processing_command",
          {},
          guildLocale
        );
        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        await message.channel.send({ embeds: [errorEmbed.build()] });
        return;
      }

      const playerId = Number(
        bestMatch.IDPlayer || bestMatch.IdPlayer || bestMatch.idplayer
      );
      if (Number.isInteger(playerId)) {
        const dao = new PlayerDAO();
        const current = await dao.getPlayerByIdInServer(
          playerId,
          discordServerId
        );
        if (current) {
          let newValues = {};
          const changes = {};
          const trainedPositively = [];

          for (const [attr, sym] of Object.entries(training.effects)) {
            const delta = TrainingManager.rollDelta(sym);
            const currVal = Number(current[attr] || 0);
            newValues[attr] = currVal + delta;
            let oldPct = Utils.getStatfromMMR(currVal);
            let newPct = Utils.getStatfromMMR(newValues[attr]);
            oldPct = Math.max(0, Math.min(100, oldPct));
            newPct = Math.max(0, Math.min(100, newPct));
            changes[attr] = { old: oldPct, new: newPct };

            if (delta > 0) {
              trainedPositively.push(attr);
            }
          }

          if (Object.keys(newValues).length > 0) {
            const { adjustedValues, additionalChanges } = adjustStatsToLimit(
              current,
              newValues,
              trainedPositively
            );
            newValues = adjustedValues;

            for (const attr in newValues) {
              if (newValues.hasOwnProperty(attr)) {
                newValues[attr] = Math.max(
                  MIN_STAT_MMR,
                  Math.min(MAX_STAT_MMR, Number(newValues[attr] || 0))
                );
              }
            }

            for (const [attr, info] of Object.entries(additionalChanges)) {
              const finalValue = newValues[attr];
              let oldChangePct = Utils.getStatfromMMR(info.before);
              let newChangePct = Utils.getStatfromMMR(finalValue);
              oldChangePct = Math.max(0, Math.min(100, oldChangePct));
              newChangePct = Math.max(0, Math.min(100, newChangePct));
              changes[attr] = {
                old: oldChangePct,
                new: newChangePct,
              };
            }

            await dao.updatePlayerAttributes(playerId, newValues);

            try {
              Utils.addTrainedPlayer(playerId, dao.tableName);
            } catch (e) {}

            let remaining = null;
            try {
              const userDao = new UserDAO();
              const updatedUser = await userDao.decrementTrainingsLeftBy1(
                userRecord.UserID
              );
              remaining = updatedUser?.TrainingsLeft ?? null;
            } catch (e) {
              console.warn(
                "⚠️ No se pudo decrementar TrainingsLeft:",
                e?.message
              );
            }

            try {
              const userDao = new UserDAO();
              await userDao.decrementTrainingSlot(
                userRecord.UserID,
                trainingChoice
              );
            } catch (e) {
              console.warn(
                `⚠️ No se pudo decrementar trainingsleft${trainingChoice}:`,
                e?.message
              );
            }

            const trainingNameKey = `train_${trainingChoice}_name`;
            const trainingName =
              langManager.getString(
                guildId,
                trainingNameKey,
                {},
                guildLocale
              ) || `Entrenamiento ${trainingChoice}`;

            const successMessage = langManager.getString(
              guildId,
              "train_completed_description",
              { name: displayName, trainingName: trainingName },
              guildLocale
            );
            let successEmbed = new EmbedSuccess(
              successMessage,
              guildId,
              guildLocale
            );
            successEmbed = new DecoratorTrainingSummary(
              successEmbed,
              changes,
              guildId,
              guildLocale
            );
            if (remaining !== null) {
              successEmbed = new DecoratorTrainingsLeft(
                successEmbed,
                remaining,
                guildId,
                guildLocale
              );
            }
            await message.channel.send({ embeds: [successEmbed.build()] });
            return;
          }
        }
      }

      const trainingNameKey = `train_${trainingChoice}_name`;
      const trainingName =
        langManager.getString(guildId, trainingNameKey, {}, guildLocale) ||
        `Entrenamiento ${trainingChoice}`;

      const successMessage = langManager.getString(
        guildId,
        "train_completed_description",
        { name: displayName, trainingName: trainingName },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      await message.channel.send({ embeds: [successEmbed.build()] });
    } catch (error) {
      console.error("❌ Error en TrainCommand:", error);
      const errorMessage = langManager.getString(
        guildId,
        "error_processing_command",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      await message.reply({ embeds: [errorEmbed.build()] });
    }
  },
};
