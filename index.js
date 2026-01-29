const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = "MTQ2NDY0NTM3ODk2Mjg4NjY2Nw.G-btL5.E1RO9tduUP6m2bBWJn6AmR3x0r94jdyNMGxNUk";

const STAFF_CHANNEL_ID = "1427692088614719628";
const STAFF_ROLE_ID = "1466481220551704587";

client.once("ready", async () => {
  console.log("Bot is online");

  const guild = client.guilds.cache.first();
  if (!guild) return;

  const channel = guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!channel) return;

  await guild.members.fetch();

  const staffMembers = guild.members.cache.filter(m =>
    m.roles.cache.has(STAFF_ROLE_ID)
  );

  let message = "**Staff Team**\n\n";

  staffMembers.forEach(member => {
    const roles = member.roles.cache
      .filter(r => r.id !== guild.id)
      .map(r => r.name)
      .join(", ");

    message += `${member.user.tag} → ${roles}\n`;
  });

  channel.send(message);
});

client.login(TOKEN);