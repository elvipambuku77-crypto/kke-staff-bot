const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Your bot application ID
const GUILD_ID = process.env.GUILD_ID; // Your server ID

let giveaways = [];

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

// Slash commands
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

client.once("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.on("interactionCreate", async interaction => {
  if (interaction.isCommand()) {
    const { commandName, options, channel, user } = interaction;

    if (commandName === "help") {
      await interaction.reply({
        content: `🎉 **Giveaway Commands**\n/start <duration> <prize> → Start a giveaway\n/list → Show active giveaways\nDuration: 10s, 5m, 2h`,
        ephemeral: true
      });
    }

    if (commandName === "list") {
      if (giveaways.length === 0) return interaction.reply({ content: "No active giveaways.", ephemeral: true });
      const list = giveaways.map(g => `ID: ${g.id} → Prize: **${g.prize}** → Participants: ${g.participants.length}`).join("\n");
      return interaction.reply({ content: `🎉 **Active Giveaways:**\n${list}`, ephemeral: true });
    }

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

      const embed = new EmbedBuilder()
        .setTitle(`🎉 Giveaway #${giveawayId} ✨`)
        .setDescription(`Prize: **${prize}**\nDuration: **${durationInput}**\nParticipants: 0 🎁\nClick JOIN to enter!`)
        .setColor("Random")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`join_${giveawayId}`)
          .setLabel("🎁 JOIN")
          .setStyle(ButtonStyle.Primary)
      );

      const msg = await channel.send({ embeds: [embed], components: [row] });
      giveaway.messageId = msg.id;

      await interaction.reply({ content: `✅ Giveaway started! Prize: **${prize}**`, ephemeral: true });

      // Auto-update countdown every second
      const interval = setInterval(async () => {
        const g = giveaways.find(g => g.id === giveawayId);
        if (!g) return clearInterval(interval);

        const now = Date.now();
        const remainingMs = g.endsAt - now;
        if (remainingMs <= 0) {
          clearInterval(interval);
          const winner = g.participants.length
            ? g.participants[Math.floor(Math.random() * g.participants.length)]
            : "No participants";

          const endEmbed = EmbedBuilder.from(embed)
            .setTitle(`🏆 Giveaway Ended! 🎉`)
            .setDescription(`Prize: **${g.prize}**\nWinner: **${winner}**\nParticipants: ${g.participants.length} 🎁`)
            .setColor("Gold");

          const message = await channel.messages.fetch(g.messageId);
          await message.edit({ embeds: [endEmbed], components: [] });
          giveaways = giveaways.filter(gw => gw.id !== giveawayId);
          return
