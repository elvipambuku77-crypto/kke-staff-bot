const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_CHANNEL_ID = "1427692088614719628";

// STAFF ROLES DETECT BY NAME
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
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands registered ✅");
  } catch (err) {
    console.error("Error registering commands:", err);
  }
})();

// Get highest staff role only
function getHighestStaff(member) {
  for (const r of ROLE_MAP) {
    const role = member.roles.cache.find(x =>
      x.name.toLowerCase().includes(r.key)
    );
    if (role) return r;
  }
  return null;
}

// Build embed safely
function buildEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📜 Staff Team")
    .setColor(0x5865f2)
    .setTimestamp();

  ROLE_MAP.forEach(r => {
    const role = guild.roles.cache.find(x =>
      x.name.toLowerCase().includes(r.key)
    );
    if (!role) return; // skip missing roles

    const members = guild.members.cache.filter(m => {
      const highest = getHighestStaff(m);
      return highest && highest.key === r.key;
    });

    if (!members.size) return; // skip if no members

    embed.addFields({
      name: `${r.label} — <@&${role.id}>`,
      value: members.map(m => `• <@${m.id}>`).join("\n"),
      inline: false
    });
  });

  return embed;
}

// Handle slash commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // Immediately defer so Discord doesn't timeout
    await interaction.deferReply({ ephemeral: true });

    // Fetch all members to ensure cache
    await interaction.guild.members.fetch();

    const channel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
    if (!channel) return await interaction.editReply("❌ Staff channel not found");

    const embed = buildEmbed(interaction.guild);

    const payload = {
      embeds: [embed],
      allowedMentions: { roles: true, users: true }
    };

    // Fetch last 10 messages to edit instead of spamming
    const msgs = await channel.messages.fetch({ limit: 10 });
    const oldMsg = msgs.find(m => m.author.id === client.user.id);

    if (oldMsg) await oldMsg.edit(payload);
    else await channel.send(payload);

    await interaction.editReply("✅ Staff team updated");
  } catch (err) {
    console.error("Interaction error:", err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply("❌ Something went wrong, check logs.");
      } else {
        await interaction.reply({ content: "❌ Something went wrong, check logs.", ephemeral: true });
      }
    } catch {}
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag} ✅`);
});

client.login(TOKEN);
