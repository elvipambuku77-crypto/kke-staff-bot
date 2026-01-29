const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

const STAFF_CHANNEL_ID = "1427692088614719628";
const STAFF_ROLE_ID = "1466495902452547832";

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

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
    message += `${member.user.tag}\n`;
  });

  channel.send(message);
});

client.login(TOKEN);
