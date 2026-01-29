const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Your bot application ID
const GUILD_ID = process.env.GUILD_ID; // Your server ID

// Store giveaways
let giveaways = [];

// Parse durations like "10s", "5m", "2h"
function parseDuration(input) {
  const match = input.match(/^(\d+)(s|m|h)$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return null;
}

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("start")
    .setDescription("Start a giveaway")
    .addStringOption(opt => opt.setName("duration").setDescription("10s, 5m, 2h").setRequired(true))
    .addStringOption(opt => opt.setName("prize").setDescription("Prize name").setRequired(true)),
  new SlashCommandBuilder().setName("help").setDescription("Show giveaway commands"),
  new SlashCommandBuilder().setName("list").setDescription("Show active giveaways")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Refreshing slash commands...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("Slash commands registered!");
  } catch (err) { console.error(err); }
})();

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Handle slash commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, channel, user } = interaction;

  // HELP COMMAND
  if (commandName === "help") {
    await interaction.reply({
      content: `🎉 **Giveaway Commands**\n/start <duration> <prize> → Start a giveaway\n/list → Show active giveaways\nDuration: 10s, 5m, 2h`,
      ephemeral: true
    });
  }

  // LIST COMMAND
  if (commandName === "list") {
    if (giveaways.length === 0) return interaction.reply({ content: "No active giveaways.", ephemeral: true });
    const list = giveaways.map(g => `ID: ${g.id} → Prize: **${g.prize}**`).join("\n");
    return interaction.reply({ content: `🎉 **Active Giveaways:**\n${list}`, ephemeral: true });
  }

  // START COMMAND
  if (commandName === "start") {
    const durationInput = options.getString("duration");
    const prize = options.getString("prize");

    const durationMs = parseDuration(durationInput);
    if (!durationMs) return interaction.reply({ content: "Invalid duration! Use 10s, 5m, 2h", ephemeral: true });

    const giveawayId = giveaways.length + 1;
    const giveaway = {
      id: giveawayId,
      prize,
      endsAt: Date.now() + durationMs,
      participants: [],
      messageId: null,
      channelId: channel.id
    };
    giveaways.push(giveaway);

    // Embed for giveaway
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Giveaway #${giveawayId}`)
      .setDescription(`Prize: **${prize}**\nDuration: **${durationInput}**\nClick **JOIN** to enter!`)
      .setColor("Random")
      .setTimestamp();

    // Join button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_${giveawayId}`)
        .setLabel("🎁 JOIN")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    giveaway.messageId = msg.id;

    await interaction.reply({ content: `✅ Giveaway started! Prize: **${prize}**`, ephemeral: true });

    // Auto-end giveaway
    setTimeout(async () => {
      const g = giveaways.find(g => g.id === giveawayId);
      if (!g) return;

      const winner = g.participants.length
        ? g.participants[Math.floor(Math.random() * g.participants.length)]
        : "No participants";

      const endEmbed = EmbedBuilder.from(embed)
        .setTitle(`🏆 Giveaway Ended!`)
        .setDescription(`Prize: **${g.prize}**\nWinner: **${winner}**`)
        .setColor("Gold");

      const message = await channel.messages.fetch(g.messageId);
      await message.edit({ embeds: [endEmbed], components: [] });

      giveaways = giveaways.filter(gw => gw.id !== giveawayId);
    }, durationMs);
  }
});

// Handle join button
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const [action, id] = interaction.customId.split("_");
  if (action !== "join") return;

  const giveaway = giveaways.find(g => g.id === parseInt(id));
  if (!giveaway) return interaction.reply({ content: "Giveaway not found.", ephemeral: true });

  if (giveaway.participants.includes(interaction.user.tag)) {
    return interaction.reply({ content: "You already joined!", ephemeral: true });
  }

  giveaway.participants.push(interaction.user.tag);
  await interaction.reply({ content: `🎉 ${interaction.user.tag} joined the giveaway!`, ephemeral: true });
});

client.login(TOKEN);
