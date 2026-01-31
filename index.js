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
  { key: "main founder", label: "👑 Main Founder", ping: "@👑 Main Founder" },
  { key: "co founder", label: "💜 Founder", ping: "@💜 Founder" },
  { key: "own┇", label: "🖤 Owner", ping: "@🖤 Owner" },
  { key: "co┇", label: "💙 Co Owner", ping: "@💙 Co Owner" },
  { key: "hos┇", label: "🔥 Head of Staff", ping: "@🔥 Head of Staff" },
  { key: "man┇", label: "💎 Manager", ping: "@💎 Manager" },
  { key: "adm┇", label: "🛡️ Admin", ping: "@🛡️ Admin" },
  { key: "mod┇", label: "⚔️ Moderator", ping: "@⚔️ Moderator" },
  { key: "hel┇", label: "🌟 Helper", ping: "@🌟 Helper" }
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Slash commands
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
})();

// Get highest staff role
function getHighestStaff(member) {
  for (const roleDef of ROLE_MAP) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleDef.key)
    );
    if (role) return roleDef;
  }
  return null;
}

// Build embed
function buildEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📜 Staff Team")
    .setColor(0x5865f2)
    .setTimestamp();

  ROLE_MAP.forEach(roleDef => {
    const members = guild.members.cache.filter(m => {
      const highest = getHighestStaff(m);
      return highest && highest.key === roleDef.key;
    });

    if (!members.size) return;

    embed.addFields({
      name: `${roleDef.label} — ${roleDef.ping}`,
      value: members.map(m => `• <@${m.id}>`).join("\n"),
      inline: false
    });
  });

  return embed;
}

// Commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.guild.members.fetch();

  const channel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!channel)
    return interaction.reply({ content: "Staff channel not found", ephemeral: true });

  const embed = buildEmbed(interaction.guild);

  const msgs = await channel.messages.fetch({ limit: 10 });
  const old = msgs.find(m => m.author.id === client.user.id);

  if (old) await old.edit({ embeds: [embed] });
  else await channel.send({ embeds: [embed] });

  await interaction.reply({ content: "✅ Staff team updated", ephemeral: true });
});

client.login(TOKEN);
