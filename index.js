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
  { key: "co founder", label: "💜 Co Founder" },
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

// Register commands
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

function getHighestStaff(member) {
  for (const r of ROLE_MAP) {
    const role = member.roles.cache.find(x =>
      x.name.toLowerCase().includes(r.key)
    );
    if (role) return r;
  }
  return null;
}

function buildEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📜 Staff Team")
    .setColor(0x5865f2)
    .setTimestamp();

  ROLE_MAP.forEach(r => {
    const role = guild.roles.cache.find(x =>
      x.name.toLowerCase().includes(r.key)
    );
    if (!role) return;

    const members = guild.members.cache.filter(m => {
      const highest = getHighestStaff(m);
      return highest && highest.key === r.key;
    });

    if (!members.size) return;

    embed.addFields({
      name: `${r.label} — <@&${role.id}>`,
      value: members.map(m => `• <@${m.id}>`).join("\n"),
      inline: false
    });
  });

  return embed;
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // INSTANT reply so Discord never times out
    await interaction.reply({ content: "⏳ Updating staff team...", ephemeral: true });

    await interaction.guild.members.fetch();

    const channel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
    if (!channel) {
      return interaction.editReply("❌ Staff channel not found");
    }

    const embed = buildEmbed(interaction.guild);

    const payload = {
      embeds: [embed],
      allowedMentions: { roles: true, users: true }
    };

    const messages = await channel.messages.fetch({ limit: 10 });
    const old = messages.find(m => m.author.id === client.user.id);

    if (old) await old.edit(payload);
    else await channel.send(payload);

    await interaction.editReply("✅ Staff team updated");
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("❌ Something broke. Check logs.");
    }
  }
});

client.login(TOKEN);
