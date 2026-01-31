const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_CHANNEL_ID = "1427692088614719628";

const ROLE_MAP = [
  { key: "main founder", label: "👑 Main Founder" },
  { key: "co founder", label: "💜 Founder" },
  { key: "own┇", label: "🖤 Owner" },
  { key: "co┇", label: "💙 Co Owner" },
  { key: "hos┇", label: "🔥 Head of Staff" },
  { key: "man┇", label: "💎 Manager" },
  { key: "adm┇", label: "🛡️ Admin" },
  { key: "mod┇", label: "⚔️ Moderator" },
  { key: "hel┇", label: "🌟 Helper" }
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Register slash commands
const commands = [
  new SlashCommandBuilder().setName("put").setDescription("Create staff team"),
  new SlashCommandBuilder().setName("update").setDescription("Update staff team")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash commands registered");
})();

// Get highest staff role for a member
function getHighestStaff(member) {
  for (const roleDef of ROLE_MAP) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleDef.key)
    );
    if (role) return roleDef;
  }
  return null;
}

// Build the staff embed with role pings
function buildEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📜 Staff Team")
    .setColor(0x5865f2)
    .setTimestamp();

  ROLE_MAP.forEach(roleDef => {
    const role = guild.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleDef.key)
    );
    if (!role) return;

    // Only members whose highest role is this role
    const members = guild.members.cache.filter(m => {
      const highest = getHighestStaff(m);
      return highest && highest.key === roleDef.key;
    });

    if (!members.size) return;

    // Field: role ping + member pings
    embed.addFields({
      name: `${roleDef.label} — <@&${role.id}>`, // role ping
      value: members.map(m => `• <@${m.id}>`).join("\n"), // member pings
      inline: false
    });
  });

  return embed;
}

// Handle slash commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply({ ephemeral: true });

    // Fetch members to ensure cache
    await interaction.guild.members.fetch();

    const channel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
    if (!channel)
      return interaction.editReply({ content: "❌ Staff channel not found" });

    const embed = buildEmbed(interaction.guild);

    // Edit previous message if exists
    const msgs = await channel.messages.fetch({ limit: 10 });
    const old = msgs.find(m => m.author.id === client.user.id);

    const payload = { embeds: [embed], allowedMentions: { roles: true, users: true } };

    if (old) await old.edit(payload);
    else await channel.send(payload);

    await interaction.editReply("✅ Staff team updated");
  } catch (err) {
    console.error("INTERACTION ERROR >>>", err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply("❌ Something went wrong, check console logs.");
      } else {
        await interaction.reply({ content: "❌ Something went wrong, check console logs.", ephemeral: true });
      }
    } catch {}
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag} ✅`);
});

client.login(TOKEN);
