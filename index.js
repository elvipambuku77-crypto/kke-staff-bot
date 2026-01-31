const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const LOG_CHANNEL_ID = "1444683724112531540";

// KEYWORDS for staff roles (order = hierarchy)
const STAFF_KEYWORDS = ["Staff", "Helper", "Mod", "Admin", "Manager", "Head", "Co Owner", "Owner"];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promote a staff member")
    .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("demote")
    .setDescription("Demote a staff member")
    .addUserOption(o => o.setName("user").setDescription("Staff member").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("staffrank")
    .setDescription("Check staff rank")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("PD slash commands registered");
})();

// ===== UTIL =====
function getStaffRoles(member) {
  // Return all member roles that match the keywords
  return member.roles.cache.filter(r =>
    STAFF_KEYWORDS.some(k => r.name.toLowerCase().includes(k.toLowerCase()))
  );
}

function getStaffIndex(member) {
  const roles = getStaffRoles(member);
  if (!roles.size) return -1;

  // Return the **highest role index** based on STAFF_KEYWORDS order
  let highestIndex = -1;
  roles.forEach(r => {
    const idx = STAFF_KEYWORDS.findIndex(k => r.name.toLowerCase().includes(k.toLowerCase()));
    if (idx > highestIndex) highestIndex = idx;
  });
  return highestIndex;
}

// ===== INTERACTIONS =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;
  const executor = interaction.member;
  const target = await guild.members.fetch(interaction.options.getUser("user").id);

  const execRank = getStaffIndex(executor);
  const targetRank = getStaffIndex(target);

  if (interaction.commandName === "staffrank") {
    if (targetRank === -1)
      return interaction.reply({ content: "❌ User is not staff", ephemeral: true });

    return interaction.reply({
      content: `✅ ${target.user.tag} → **${STAFF_KEYWORDS[targetRank]}**`,
      ephemeral: true
    });
  }

  if (execRank === -1)
    return interaction.reply({ content: "❌ You are NOT staff", ephemeral: true });

  if (targetRank === -1)
    return interaction.reply({ content: "❌ Target is not staff", ephemeral: true });

  if (execRank <= targetRank)
    return interaction.reply({ content: "❌ You cannot manage someone equal or higher than you", ephemeral: true });

  const reason = interaction.options.getString("reason");

  // ===== PROMOTE =====
  if (interaction.commandName === "promote") {
    if (targetRank + 1 >= STAFF_KEYWORDS.length)
      return interaction.reply({ content: "❌ Already highest rank", ephemeral: true });

    // Remove all staff roles in keyword list and add new rank
    getStaffRoles(target).forEach(r => target.roles.remove(r.id));
    const newRoleName = STAFF_KEYWORDS[targetRank + 1];
    const newRole = guild.roles.cache.find(r => r.name.toLowerCase().includes(newRoleName.toLowerCase()));
    if (newRole) await target.roles.add(newRole.id);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("📈 Staff Promotion")
      .addFields(
        { name: "Staff", value: target.user.tag, inline: true },
        { name: "From", value: STAFF_KEYWORDS[targetRank], inline: true },
        { name: "To", value: STAFF_KEYWORDS[targetRank + 1], inline: true },
        { name: "By", value: executor.user.tag },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    guild.channels.cache.get(LOG_CHANNEL_ID)?.send({ embeds: [embed] });
  }

  // ===== DEMOTE =====
  if (interaction.commandName === "demote") {
    if (targetRank - 1 < 0)
      return interaction.reply({ content: "❌ Already lowest rank", ephemeral: true });

    getStaffRoles(target).forEach(r => target.roles.remove(r.id));
    const newRoleName = STAFF_KEYWORDS[targetRank - 1];
    const newRole = guild.roles.cache.find(r => r.name.toLowerCase().includes(newRoleName.toLowerCase()));
    if (newRole) await target.roles.add(newRole.id);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("📉 Staff Demotion")
      .addFields(
        { name: "Staff", value: target.user.tag, inline: true },
        { name: "From", value: STAFF_KEYWORDS[targetRank], inline: true },
        { name: "To", value: STAFF_KEYWORDS[targetRank - 1], inline: true },
        { name: "By", value: executor.user.tag },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    guild.channels.cache.get(LOG_CHANNEL_ID)?.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
