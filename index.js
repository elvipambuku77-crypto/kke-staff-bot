const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_CHANNEL_ID = "1427692088614719628";

// Staff hierarchy keywords (low → high)
const STAFF_KEYWORDS = ["Staff", "Helper", "Mod", "Admin", "Manager", "Head", "Co Owner", "Owner"];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder()
    .setName("put")
    .setDescription("Create the staff team list"),
  new SlashCommandBuilder()
    .setName("update")
    .setDescription("Update the staff team list")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Staff Team slash commands registered");
})();

// ===== UTIL =====
function getStaffRoles(member) {
  return member.roles.cache.filter(r =>
    STAFF_KEYWORDS.some(k => r.name.toLowerCase().includes(k.toLowerCase()))
  );
}

function getStaffIndex(member) {
  const roles = getStaffRoles(member);
  if (!roles.size) return -1;

  let highestIndex = -1;
  roles.forEach(r => {
    const idx = STAFF_KEYWORDS.findIndex(k => r.name.toLowerCase().includes(k.toLowerCase()));
    if (idx > highestIndex) highestIndex = idx;
  });
  return highestIndex;
}

function generateStaffMessage(guild) {
  let msg = "**📋 Staff Team**\n\n";

  STAFF_KEYWORDS.forEach(keyword => {
    const role = guild.roles.cache.find(r => r.name.toLowerCase().includes(keyword.toLowerCase()));
    if (!role) return;

    const members = role.members.map(m => m.user.tag);
    if (!members.length) return;

    msg += `**${role.name}** (${members.length}):\n`;
    msg += members.join("\n") + "\n\n";
  });

  if (msg === "**📋 Staff Team**\n\n") msg += "_No staff members found_";

  return msg;
}

// ===== COMMAND HANDLER =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;
  const channel = guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!channel) return interaction.reply({ content: "❌ Staff channel not found", ephemeral: true });

  if (interaction.commandName === "put" || interaction.commandName === "update") {
    await guild.members.fetch(); // fetch all members to make sure nothing is missing
    const messageContent = generateStaffMessage(guild);

    // Try to find previous message by bot
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessage = messages.find(m => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit(messageContent);
      await interaction.reply({ content: "✅ Staff Team updated!", ephemeral: true });
    } else {
      await channel.send(messageContent);
      await interaction.reply({ content: "✅ Staff Team created!", ephemeral: true });
    }
  }
});

client.login(TOKEN);
