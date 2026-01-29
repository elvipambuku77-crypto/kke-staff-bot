const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// Bot token from Railway variable
const TOKEN = process.env.TOKEN;

// Channel to send staff list
const STAFF_CHANNEL_ID = "1427692088614719628";

// All staff role IDs
const STAFF_ROLES = [
  "1466124274334040325", // Staff
  "1466124328713195583", // Helper
  "1466124409763926041", // Mod
  "1466124454399705255", // Admin
  "1466124732490584074", // Manager
  "1466124767659561073", // Head of staff
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
    // Fetch all members (force ensures none are skipped)
    await guild.members.fetch({ force: true });

    // Filter members who have any staff role
    const staffMembers = guild.members.cache.filter(member =>
      member.roles.cache.some(role => STAFF_ROLES.includes(role.id))
    );

    if (staffMembers.size === 0) {
      console.log("No staff members found!");
      await channel.send("No staff members found!");
      return;
    }

    // Build a clean embed
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
