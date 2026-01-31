const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_CHANNEL_ID = "1427692088614719628";

// STAFF ROLE NAMES IN ORDER (no IDs needed)
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

// REGISTER SLASH COMMANDS
const commands = [
  new SlashCommandBuilder().setName("put").setDescription("Create staff team"),
  new SlashCommandBuilder().setName("update").setDescription("Update staff team")
].map(cmd => cmd.toJSON());

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

// Get highest staff role for a member
function getHighestStaff(member) {
  for (const r of ROLE_MAP) {
    const role = member.roles.cache.find(role => role.name.toLowerCase().includes(r.key));
    if (role) return r;
  }
  return null;
}

// Build the staff embed
function buildEmbed(guild) {
  const embed = new EmbedBuilder()
    .setTitle("📜 Staff Team")
    .setColor(0x5865f2)
    .setTimestamp();

  ROLE_MAP.forEach(roleDef => {
    const role = guild.roles.cache.find(r => r.name.toLowerCase().includes(roleDef.key));
    if (!role) return;

    const members = guild.members.cache.filter(m => {
      const highest = getHighestStaff(m);
      return highest && highest.key === roleDef.key;
    });

    if (!members.size) return;

    // Add field with role ping + members ping
    embed.addFields({
      name: `${roleDef.label} — <@&${role.id}>`,
      value: members.map(m => `• <@${m.id}>`).join("\n"),
      inline: false
    });
  });

  return embed;
}

// HANDLE SLASH COMMANDS
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // DEFER IMMEDIATELY to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    // FETCH MEMBERS TO ENSURE CACHE
    await interaction.guild.members.fetch();

    const channel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
    if (!channel) return await interaction.editReply("❌ Staff channel not found");

    const embed = buildEmbed(interaction.guild);

    const payload = {
      embeds: [embed],
      allowedMentions: { roles: true, users: true } // 🔥 THIS MAKES ROLES + MEMBERS PING
    };

    // EDIT last bot message if exists
    const messages = await channel.messages.fetch({ limit: 10 });
    const last = messages.find(m => m.author.id === client.user.id);

    if (last) await last.edit(payload);
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
