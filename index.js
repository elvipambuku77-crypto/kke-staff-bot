const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const TOKEN = process.env.TOKEN; // Your bot token from Railway
const PREFIX = "/"; // Command prefix

// Store giveaways in memory for this example
let giveaways = [];

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Listen for messages
client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore bots
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Show prefix usage
  if (command === "help") {
    return message.channel.send(
      `🎉 **Giveaway Commands**\n` +
      `\`${PREFIX}start <duration> <prize>\` → Start a giveaway\n` +
      `\`${PREFIX}list\` → Show active giveaways\n` +
      `\`${PREFIX}end <id>\` → End a giveaway`
    );
  }

  // Start giveaway
  if (command === "start") {
    const duration = args[0];
    const prize = args.slice(1).join(" ");
    if (!duration || !prize) return message.channel.send("Usage: /start <duration> <prize>");

    const giveaway = {
      id: giveaways.length + 1,
      prize,
      endsAt: Date.now() + parseInt(duration) * 1000, // duration in seconds
      channel: message.channel.id,
      participants: [],
    };
    giveaways.push(giveaway);

    message.channel.send(`🎉 Giveaway started! Prize: **${prize}** (ID: ${giveaway.id})`);
  }

  // List giveaways
  if (command === "list") {
    if (giveaways.length === 0) return message.channel.send("No active giveaways.");
    const list = giveaways.map(g => `ID: ${g.id} → Prize: ${g.prize}`).join("\n");
    message.channel.send(`🎉 **Active Giveaways:**\n${list}`);
  }

  // End giveaway
  if (command === "end") {
    const id = parseInt(args[0]);
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return message.channel.send("Giveaway not found.");

    // Pick a random winner
    const winner = giveaway.participants.length
      ? giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)]
      : "No participants";

    message.channel.send(`🏆 Giveaway ended! Prize: **${giveaway.prize}** → Winner: ${winner}`);
    giveaways = giveaways.filter(g => g.id !== id);
  }

  // Join giveaway
  if (command === "join") {
    const id = parseInt(args[0]);
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return message.channel.send("Giveaway not found.");

    if (giveaway.participants.includes(message.author.tag)) return message.channel.send("You already joined!");
    giveaway.participants.push(message.author.tag);
    message.channel.send(`${message.author.tag} joined the giveaway!`);
  }
});

client.login(TOKEN).catch(console.error);
