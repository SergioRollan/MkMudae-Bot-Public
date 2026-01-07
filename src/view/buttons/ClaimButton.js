const Model = require("../../model/Model");
const LanguageManager = require("../../managers/LanguageManager");
const EmbedError = require("../../extras/embedbuilder/embedcomponents/EmbedError");
const EmbedSuccess = require("../../extras/embedbuilder/embedcomponents/EmbedSuccess");
const Utils = require("../../extras/Utils");
const { ActionRowBuilder, ButtonBuilder } = require("discord.js");

module.exports = {
  async handleInteraction(interaction) {
    const langManager = LanguageManager.getInstance();
    const guildId = interaction.guild?.id || null;
    const guildLocale = interaction.guild?.preferredLocale || null;
    const customId = interaction.customId;

    if (!customId.startsWith("claim_")) {
      return false;
    }

    let deferred = false;
    try {
      await interaction.deferReply({ ephemeral: false });
      deferred = true;
    } catch (error) {
      if (error.code === 10062) {
        console.warn("⚠️ Interacción expirada antes de poder responder");
        return true;
      }
      throw error;
    }

    const parts = customId.split("_");
    if (parts.length < 3) {
      const errorMessage = langManager.getString(
        guildId,
        "error_button_invalid",
        {},
        guildLocale
      );
      try {
        await interaction.editReply({
          content: errorMessage,
        });
      } catch (error) {
        if (error.code !== 10062) {
          console.error("❌ Error editando respuesta:", error);
        }
      }
      return true;
    }

    const loungePlayerId = parts.slice(1, -1).join("_");
    const discordId = parts[parts.length - 1];

    const config = Utils.getConfig();
    const allowSteal = config.allowSteal || {};
    const isAllowStealEnabled = allowSteal[guildId] === true;

    if (!isAllowStealEnabled && interaction.user.id !== discordId) {
      const errorMessage = langManager.getString(
        guildId,
        "error_only_own_claim",
        {},
        guildLocale
      );
      try {
        await interaction.editReply({
          content: errorMessage,
        });
      } catch (error) {
        if (error.code !== 10062) {
          console.error("❌ Error editando respuesta:", error);
        }
      }
      return true;
    }

    const messageId = interaction.message.id;
    if (!Utils.isClaimable(messageId)) {
      const errorMessage = langManager.getString(
        guildId,
        "error_claim_expired",
        {},
        guildLocale
      );
      const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
      try {
        await interaction.editReply({
          embeds: [errorEmbed.build()],
        });
      } catch (error) {
        if (error.code !== 10062) {
          console.error("❌ Error editando respuesta:", error);
        }
      }
      return true;
    }

    const model = Model.getInstance();
    const userName = interaction.user.username;

    try {
      const originalMessage = interaction.message;
      let loungePlayer = null;

      if (originalMessage.embeds && originalMessage.embeds.length > 0) {
        const embed = originalMessage.embeds[0];
        const playerName = embed.fields?.find(
          (f) => f.name.includes("Nombre") || f.name.includes("Name")
        )?.value;
        if (playerName) {
          loungePlayer = await model.getLoungePlayerByName(playerName);
        }
      }

      const result = await model.claimPlayer(
        discordId,
        guildId || "DM",
        userName,
        loungePlayerId,
        loungePlayer
      );

      if (!result.success) {
        if (result.error === "already_owned") {
          try {
            let playerRecord = null;
            const loungeId =
              typeof loungePlayerId === "string"
                ? parseInt(loungePlayerId) || loungePlayerId
                : loungePlayerId;

            if (typeof loungeId === "number" || !isNaN(parseInt(loungeId))) {
              playerRecord = await model.getPlayerByLoungeIdInServer(
                loungeId,
                guildId || "DM"
              );
            }

            if (
              !playerRecord &&
              originalMessage.embeds &&
              originalMessage.embeds.length > 0
            ) {
              const embed = originalMessage.embeds[0];
              const playerName =
                embed.fields?.find(
                  (f) => f.name.includes("Nombre") || f.name.includes("Name")
                )?.value || embed.title;

              if (playerName) {
                const loungePlayer = await model.getLoungePlayerByName(
                  playerName
                );
                if (loungePlayer) {
                  const loungeIdFromName =
                    loungePlayer.lounge_id ||
                    loungePlayer.LoungeID ||
                    loungePlayer.id ||
                    loungePlayer.loungeId;
                  if (loungeIdFromName) {
                    playerRecord = await model.getPlayerByLoungeIdInServer(
                      loungeIdFromName,
                      guildId || "DM"
                    );
                  }
                }
              }
            }

            if (!playerRecord) {
              throw new Error(
                "No se pudo obtener el jugador de la base de datos"
              );
            }

            const attributes = {
              Lines: playerRecord.Lines || 0,
              Consistency: playerRecord.Consistency || 0,
              ItemUsage: playerRecord.ItemUsage || 0,
              Precision: playerRecord.Precision || 0,
              Communication: playerRecord.Communication || 0,
              Mental: playerRecord.Mental || 0,
              GameSense: playerRecord.GameSense || 0,
              Shockfinding: playerRecord.Shockfinding || 0,
            };

            const allZero = Object.values(attributes).every((val) => val === 0);
            if (allZero) {
              const PlayerDAO = require("../../dao/PlayerDAO");
              const playerDAO = new PlayerDAO();
              const initialStats = await playerDAO.getInitialStatsByLoungeId(
                playerRecord.LoungeID || loungeId
              );
              if (initialStats) {
                Object.assign(attributes, initialStats);
              }
            }

            const loungeData = await model.loungeDAO.getPlayerByLoungeIdOrName(
              playerRecord.LoungeID || loungeId,
              null
            );

            const mmr = loungeData?.mmr || 0;
            const peakMmr = loungeData?.peak_mmr || 0;
            const events = loungeData?.events_played || 0;

            const marketValue = Utils.getMarketValue(
              mmr,
              peakMmr,
              events,
              attributes
            );

            const user = await model.userDAO.getUserByIds(
              discordId,
              guildId || "DM",
              userName,
              guildLocale
            );

            const userRank = await model.getUserRankData(
              discordId,
              guildId || "DM",
              userName,
              guildLocale
            );

            const discount = userRank?.discount || 0;
            const sellPercentage = (discount === 0 ? 50 : discount) / 100;
            const coinsToGive = Math.round(marketValue * sellPercentage * 2);

            if (!user.CanClaim) {
              const errorMessage = langManager.getString(
                guildId,
                "error_no_can_claim",
                {},
                guildLocale
              );
              const errorEmbed = new EmbedError(
                errorMessage,
                guildId,
                guildLocale
              );
              try {
                await interaction.editReply({ embeds: [errorEmbed.build()] });
              } catch (error) {
                if (error.code !== 10062) {
                  console.error("❌ Error editando respuesta:", error);
                }
              }
              return true;
            }

            const currentCoins = user.Coins || 0;
            const newCoins = currentCoins + coinsToGive;
            await model.updateUserCoins(user.UserID, newCoins);

            await model.userDAO.updateCanClaim(user.UserID, false);

            let playerName =
              playerRecord.Alias ||
              playerRecord.Name ||
              playerRecord.PlayerName ||
              "jugador";
            if (originalMessage.embeds && originalMessage.embeds.length > 0) {
              const embed = originalMessage.embeds[0];
              const playerNameField = embed.fields?.find(
                (f) => f.name.includes("Nombre") || f.name.includes("Name")
              );
              if (playerNameField?.value) {
                playerName = playerNameField.value;
              } else if (embed.title) {
                playerName = embed.title;
              }
            }

            const successMessage = langManager.getString(
              guildId,
              "claim_owned_success",
              {
                name: playerName,
                amount: Utils.formatAmount(coinsToGive),
                balance: Utils.formatAmount(newCoins),
              },
              guildLocale
            );
            const successEmbed = new EmbedSuccess(
              successMessage,
              guildId,
              guildLocale
            );
            try {
              await interaction.editReply({ embeds: [successEmbed.build()] });
            } catch (error) {
              if (error.code !== 10062) {
                console.error("❌ Error editando respuesta:", error);
              }
            }

            Utils.removeClaimableRoll(messageId);

            try {
              const row = interaction.message.components[0];
              const button = row.components[0];
              const disabledButton =
                ButtonBuilder.from(button).setDisabled(true);
              const newRow = new ActionRowBuilder().addComponents(
                disabledButton
              );
              await interaction.message.edit({
                components: [newRow],
              });
            } catch (error) {
              console.warn(
                "⚠️ No se pudo deshabilitar el botón:",
                error.message
              );
            }

            return true;
          } catch (ownedError) {
            console.error(
              "❌ Error otorgando coins por jugador ya propiedad:",
              ownedError
            );

            const errorMessage = langManager.getString(
              guildId,
              "error_already_owned",
              {},
              guildLocale
            );
            const errorEmbed = new EmbedError(
              errorMessage,
              guildId,
              guildLocale
            );
            try {
              await interaction.editReply({ embeds: [errorEmbed.build()] });
            } catch (error) {
              if (error.code !== 10062) {
                console.error("❌ Error editando respuesta:", error);
              }
            }
            return true;
          }
        }

        let errorMessage = "";

        if (result.error === "no_can_claim") {
          errorMessage = langManager.getString(
            guildId,
            "error_no_can_claim",
            {},
            guildLocale
          );
        } else if (result.error === "player_not_found") {
          errorMessage = langManager.getString(
            guildId,
            "error_player_not_found",
            {},
            guildLocale
          );
        } else if (result.error === "max_roster_reached") {
          errorMessage = langManager.getString(
            guildId,
            "error_max_roster_reached",
            { current: result.currentCount, max: result.maxRoster },
            guildLocale
          );
        } else {
          errorMessage = langManager.getString(
            guildId,
            "error_unknown",
            {},
            guildLocale
          );
        }

        const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
        try {
          await interaction.editReply({ embeds: [errorEmbed.build()] });
        } catch (error) {
          if (error.code !== 10062) {
            console.error("❌ Error editando respuesta:", error);
          }
        }
        return true;
      }

      const defaultPlayerName = langManager.getString(
        guildId,
        "collection_player",
        {},
        guildLocale
      );
      const playerName =
        result.player.Alias ||
        result.player.Name ||
        result.player.name ||
        defaultPlayerName;

      const successMessage = langManager.getString(
        guildId,
        "claim_success",
        { name: playerName },
        guildLocale
      );
      const successEmbed = new EmbedSuccess(
        successMessage,
        guildId,
        guildLocale
      );
      try {
        await interaction.editReply({ embeds: [successEmbed.build()] });
      } catch (error) {
        if (error.code !== 10062) {
          console.error("❌ Error editando respuesta:", error);
        }
      }

      Utils.removeClaimableRoll(messageId);

      try {
        const row = interaction.message.components[0];
        const button = row.components[0];
        const disabledButton = ButtonBuilder.from(button).setDisabled(true);
        const newRow = new ActionRowBuilder().addComponents(disabledButton);
        await interaction.message.edit({
          components: [newRow],
        });
      } catch (error) {
        console.warn("⚠️ No se pudo deshabilitar el botón:", error.message);
      }

      return true;
    } catch (error) {
      if (error.code === 10062) {
        console.warn("⚠️ Interacción expirada durante el procesamiento");
        return true;
      }

      console.error("❌ Error en ClaimButton:", error);

      if (deferred && !interaction.replied) {
        try {
          const errorMessage = langManager.getString(
            guildId,
            "error_processing_command",
            {},
            guildLocale
          );
          const errorEmbed = new EmbedError(errorMessage, guildId, guildLocale);
          await interaction.editReply({ embeds: [errorEmbed.build()] });
        } catch (replyError) {
          if (replyError.code !== 10062) {
            console.error("❌ Error editando respuesta de error:", replyError);
          }
        }
      }
      return true;
    }
  },
};
