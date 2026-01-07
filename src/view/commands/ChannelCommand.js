const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const LanguageManager = require("../../managers/LanguageManager");
const Utils = require("../../extras/Utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Manages allowed channels for bot commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Adds an allowed channel")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Select the channel to enable")
            .setRequired(true)
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.GuildForum,
              ChannelType.PublicThread,
              ChannelType.PrivateThread,
              ChannelType.AnnouncementThread
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Removes an allowed channel")
        .addChannelOption((option) =>
          option
            .setName("canal")
            .setDescription("Select the channel to remove")
            .setRequired(true)
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.GuildForum,
              ChannelType.PublicThread,
              ChannelType.PrivateThread,
              ChannelType.AnnouncementThread
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Shows allowed channels")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clear")
        .setDescription("Removes all channel restrictions")
    ),
  async execute(interaction) {
    const guildId = interaction.guild?.id || null;
    const langManager = LanguageManager.getInstance();
    let guildLocale = interaction.guild?.preferredLocale || null;

    if (interaction.guild) {
      const dbLocale = await Utils.getGuildLocaleFromDB({
        guild: interaction.guild,
      });
      if (dbLocale) {
        guildLocale = dbLocale;
      }
    }

    if (!guildId) {
      const message = langManager.getString(
        null,
        "channel_only_server",
        {},
        guildLocale
      );
      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      await handleAdd(interaction, guildId, langManager, guildLocale);
      return;
    }

    if (subcommand === "remove") {
      await handleRemove(interaction, guildId, langManager, guildLocale);
      return;
    }

    if (subcommand === "list") {
      await handleList(interaction, guildId, langManager, guildLocale);
      return;
    }

    if (subcommand === "clear") {
      await handleClear(interaction, guildId, langManager, guildLocale);
      return;
    }
  },
  async autocomplete(interaction) {},
};

async function handleAdd(interaction, guildId, langManager, guildLocale) {
  const channel = interaction.options.getChannel("canal");
  const result = await Utils.addAllowedChannel(guildId, channel?.id);
  const status = await getStatusText(
    langManager,
    guildId,
    guildLocale,
    result.channels
  );
  const key = result.added ? "channel_added" : "channel_add_exists";

  const message = langManager.getString(
    guildId,
    key,
    {
      channel: formatChannelMention(channel?.id),
      status,
    },
    guildLocale
  );

  await interaction.reply({ content: message, ephemeral: true });
}

async function handleRemove(interaction, guildId, langManager, guildLocale) {
  const channel = interaction.options.getChannel("canal");
  const result = await Utils.removeAllowedChannel(guildId, channel?.id);

  if (!result.removed) {
    const message = langManager.getString(
      guildId,
      "channel_remove_missing",
      {
        channel: formatChannelMention(channel?.id),
      },
      guildLocale
    );
    await interaction.reply({ content: message, ephemeral: true });
    return;
  }

  const status = await getStatusText(
    langManager,
    guildId,
    guildLocale,
    result.channels
  );
  const message = langManager.getString(
    guildId,
    "channel_removed",
    {
      channel: formatChannelMention(channel?.id),
      status,
    },
    guildLocale
  );
  await interaction.reply({ content: message, ephemeral: true });
}

async function handleList(interaction, guildId, langManager, guildLocale) {
  const allowedChannels = await Utils.getAllowedChannelsForGuild(guildId);

  const message =
    allowedChannels.length === 0
      ? langManager.getString(guildId, "channel_list_all", {}, guildLocale)
      : langManager.getString(
          guildId,
          "channel_list_limited",
          { channels: formatChannelsList(allowedChannels) },
          guildLocale
        );

  await interaction.reply({ content: message, ephemeral: true });
}

async function handleClear(interaction, guildId, langManager, guildLocale) {
  await Utils.clearAllowedChannelsForGuild(guildId);
  const status = langManager.getString(
    guildId,
    "channel_status_all",
    {},
    guildLocale
  );
  const message = langManager.getString(
    guildId,
    "channel_cleared",
    { status },
    guildLocale
  );
  await interaction.reply({ content: message, ephemeral: true });
}

async function getStatusText(langManager, guildId, guildLocale, channels) {
  if (!channels || channels.length === 0) {
    return langManager.getString(
      guildId,
      "channel_status_all",
      {},
      guildLocale
    );
  }

  return langManager.getString(
    guildId,
    "channel_status_limited",
    { channels: formatChannelsList(channels) },
    guildLocale
  );
}

function formatChannelsList(channels) {
  if (!channels || channels.length === 0) {
    return "";
  }
  return channels.map((id) => formatChannelMention(id)).join(", ");
}

function formatChannelMention(channelId) {
  if (!channelId) {
    return "—";
  }
  return `<#${channelId}>`;
}
