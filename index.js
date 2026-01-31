const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_CHANNEL_ID = "1427692088614719628";

// Staff hierarchy (lowest → highest)
const STAFF_HIERARCHY = [
  "Helper",
  "Mod",
  "Admin",
  "Manager",
  "Head of Staff",
  "Co Owner",
  "Owner",
  "Co Founder",
  "Main Founder"
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

// ===== UTILS =====
function getStaffIndex(member) {
  // Return highest role index
  let highestIndex = -1;
  member.roles.cache.forEach(r => {
    const idx = STAFF_HIERARCHY.findIndex(k => k.toLowerCase() === r.name.toLowerCase());
    if (idx > highestIndex) highestIndex = idx;
  });
  return highestIndex;
}

// Generate styled embed
function generateStaffEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📋 Staff Team")
    .setColor("Blue")
    .setFooter({ text: "Staff Team | Updated automatically" })
    .setTimestamp();

  STAFF_HIERARCHY.forEach((roleName, index) => {
    const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (!role) return;

    const members = role.members.filter(m => getStaffIndex(m) === index); // only highest role
    if (!members.size) return;

    const mentionString = members.map(m => m.user.tag).join("\n");
    embed.addFields({ name: `${role.name} (${members.size})`, value: mentionString });
  });

  return embed;
}

// Generate plain ping message
function generatePingMessage(guild) {
  let pingMessage = "";
  STAFF_HIERARCHY.forEach((roleName, index) => {
    const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (!role) return;

    const members = role.members.filter(m => getStaffIndex(m) === index);
    if (!members.size) return;

    // Mention role + members
    pingMessage += `**${role.name} (${members.size})**: ${role}\n`;
    pingMessage += members.map(m => `<@${m.id}>`).join(" ") + "\n\n";
  });
  return pingMessage || "_No staff members found_";
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

    // Check for previous bot message
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessage = messages.find(m => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit({ embeds: [embed] });
      await interaction.reply({ content: "✅ Staff Team updated!", ephemeral: true });
    } else {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: "✅ Staff Team created!", ephemeral: true });
    }

    // Send plain ping message to actually notify roles & members
    if (pingMessage) await channel.send({ content: pingMessage });
  }
});

client.login(TOKEN);
