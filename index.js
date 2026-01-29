const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ✅ Put your token in Railway variables as TOKEN
const TOKEN = process.env.TOKEN;

// ✅ Your channel ID
const STAFF_CHANNEL_ID = "1427692088614719628";

// ✅ List all your staff role IDs
const STAFF_ROLES = [
  "1466495902452547832", // Staff
  "1466124328713195583", // Helper
  "1466124409763926041", // Moderator
  "1466124454399705255", // Admin
  "1466124732490584074", // Manager
  "1466124767659561073", // Head of Staff
  "1466124822424719391", // Co Owner
  "1466124847011598428", // Owner
];

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) return console.log("No guild found");

  const channel = guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!channel) return console.log("Channel not found");

  try {
    // 🔥 Fetch all members directly from Discord
    const members = await guild.members.fetch({ force: true });

    // Filter all members that have at least one staff role
    const staffMembers = members.filter(member =>
      member.roles.cache.some(r => STAFF_ROLES.includes(r.id))
    );

    if (staffMembers.size === 0) {
      console.log("No staff members found!");
      await channel.send("No staff members found!");
      return;
    }

    // Create an embed for a clean look
    const embed = new EmbedBuilder()
      .setTitle("Staff Team")
      .setColor("Blue")
      .setDescription(
        staffMembers
          .map(
            m =>
              `**${m.user.tag}** → ${m.roles.cache
                .filter(r => STAFF_ROLES.includes(r.id))
                .map(r => r.name)
                .join(", ")}`
          )
          .join("\n")
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Staff list sent successfully!");
  } catch (err) {
    console.error("Error fetching members:", err);
  }
});

client.login(TOKEN).catch(console.error);
