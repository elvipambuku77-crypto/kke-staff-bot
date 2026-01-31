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

// Staff roles in order
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

// Register slash commands
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
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("Error registering commands:", err);
  }
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

// Build staff embed + top line role pings
function buildStaffMessage(guild) {
  let rolePingLine = ""; // This pings roles at the top
  const embed = new EmbedBuilder()
    .setTitle("📜 Staff Team")
    .setColor(0x5865f2)
    .setTimestamp();

  ROLE_MAP.forEach(roleDef => {
    const role = guild.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleDef.key)
    );
    if (!role) return;

    // members whose highest role is this
    const members = guild.members.cache.filter(m => {
      const highest = getHighestStaff(m);
      return highest && highest.key === roleDef.key;
    });

    if (!members.size) return;

    // Add role ping to the top line
    rolePingLine += `<@&${role.id}> `;

    // Add members inside embed
    embed.addFields({
      name: `${roleDef.label} — ${role.name}`,
      value: members.map(m => `• ${m.user.tag}`).join("\n"),
      inline: false
    });
  });

  if (!rolePingLine) rolePingLine = "No staff roles found!";
  return { embed, rolePingLine };
}

// Handle slash commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply({ ephemeral: true });

    // Fetch all members
    try {
      await interaction.guild.members.fetch();
    } catch {
      console.warn("Could not fetch members, continuing anyway.");
    }

    const channel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
    if (!channel)
      return interaction.editReply({ content: "❌ Staff channel not found" });

    const { embed, rolePingLine } = buildStaffMessage(interaction.guild);

    // Edit last bot message if exists
    const msgs = await channel.messages.fetch({ limit: 10 });
    const old = msgs.find(m => m.author.id === client.user.id);

    const payload = {
      content: rolePingLine, // pings all roles at top
      embeds: [embed],
      allowedMentions: { parse: ["roles", "users"] } // ✅ roles & members ping
    };

    if (old) await old.edit(payload);
    else await channel.send(payload);

    await interaction.editReply("✅ Staff team updated");
  } catch (err) {
    console.error("INTERACTION ERROR >>>", err);
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
