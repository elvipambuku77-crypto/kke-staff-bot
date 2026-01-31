const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_CHANNEL_ID = "1427692088614719628";

// Hierarchy keywords, lowest -> highest
const STAFF_HIERARCHY = [
  "helper",
  "mod",
  "admin",
  "manager",
  "head",
  "co owner",
  "owner",
  "co founder",
  "main founder"
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder().setName("put").setDescription("Create the staff team list"),
  new SlashCommandBuilder().setName("update").setDescription("Update the staff team list")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Staff Team slash commands registered");
})();

// ===== UTIL =====

// Return highest staff role index of a member
function getHighestStaffRoleIndex(member) {
  let highestIndex = -1;
  member.roles.cache.forEach(r => {
    const idx = STAFF_HIERARCHY.findIndex(k => r.name.toLowerCase().includes(k));
    if (idx > highestIndex) highestIndex = idx;
  });
  return highestIndex;
}

// Generate embed
function generateStaffEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📋 Staff Team")
    .setColor("Blue")
    .setFooter({ text: "Staff Team | Updated automatically" })
    .setTimestamp();

  STAFF_HIERARCHY.forEach((keyword, index) => {
    const members = guild.members.cache.filter(m => getHighestStaffRoleIndex(m) === index);
    if (!members.size) return;

    const memberNames = members.map(m => m.user.tag).join("\n");
    embed.addFields({ name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} (${members.size})`, value: memberNames });
  });

  return embed;
}

// Generate plain ping message
function generatePingMessage(guild) {
  let pingMsg = "";
  STAFF_HIERARCHY.forEach((keyword, index) => {
    const members = guild.members.cache.filter(m => getHighestStaffRoleIndex(m) === index);
    if (!members.size) return;

    pingMsg += `**${keyword.charAt(0).toUpperCase() + keyword.slice(1)} (${members.size})**:\n`;
    pingMsg += members.map(m => `<@${m.id}>`).join(" ") + "\n\n";
  });

  return pingMsg || "_No staff members found_";
}

// ===== COMMAND HANDLER =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;
  const channel = guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!channel) return interaction.reply({ content: "❌ Staff channel not found", ephemeral: true });

  if (interaction.commandName === "put" || interaction.commandName === "update") {
    await guild.members.fetch(); // fetch all members

    const embed = generateStaffEmbed(guild);
    const pingMessage = generatePingMessage(guild);

    // Edit existing bot message or send new
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessage = messages.find(m => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit({ embeds: [embed] });
      await interaction.reply({ content: "✅ Staff Team updated!", ephemeral: true });
    } else {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: "✅ Staff Team created!", ephemeral: true });
    }

    // Send ping message separately to notify
    if (pingMessage) await channel.send({ content: pingMessage });
  }
});

client.login(TOKEN);
