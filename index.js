const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Your bot’s application ID
const GUILD_ID = process.env.GUILD_ID; // Your server ID

// Giveaway storage
let giveaways = [];

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show giveaway commands'),

  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start a giveaway')
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in seconds').setRequired(true))
    .addStringOption(option => option.setName('prize').setDescription('Prize name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a giveaway')
    .addIntegerOption(option => option.setName('id').setDescription('Giveaway ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('Show active giveaways'),

  new SlashCommandBuilder()
    .setName('end')
    .setDescription('End a giveaway')
    .addIntegerOption(option => option.setName('id').setDescription('Giveaway ID').setRequired(true))
].map(cmd => cmd.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;

  if (commandName === 'help') {
    await interaction.reply({
      content: `🎉 **Giveaway Commands**\n
/start <duration> <prize> → Start a giveaway
/join <id> → Join a giveaway
/list → Show active giveaways
/end <id> → End a giveaway`,
      ephemeral: true
    });
  }

  if (commandName === 'start') {
    const duration = options.getInteger('duration');
    const prize = options.getString('prize');

    const giveaway = {
      id: giveaways.length + 1,
      prize,
      endsAt: Date.now() + duration * 1000,
      participants: [],
    };
    giveaways.push(giveaway);

    await interaction.reply(`🎉 Giveaway started! Prize: **${prize}** (ID: ${giveaway.id})`);
  }

  if (commandName === 'join') {
    const id = options.getInteger('id');
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return interaction.reply({ content: "Giveaway not found.", ephemeral: true });

    if (giveaway.participants.includes(user.tag))
      return interaction.reply({ content: "You already joined!", ephemeral: true });

    giveaway.participants.push(user.tag);
    await interaction.reply({ content: `${user.tag} joined the giveaway!` });
  }

  if (commandName === 'list') {
    if (giveaways.length === 0) return interaction.reply({ content: "No active giveaways.", ephemeral: true });

    const list = giveaways.map(g => `ID: ${g.id} → Prize: ${g.prize}`).join("\n");
    await interaction.reply({ content: `🎉 **Active Giveaways:**\n${list}`, ephemeral: true });
  }

  if (commandName === 'end') {
    const id = options.getInteger('id');
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return interaction.reply({ content: "Giveaway not found.", ephemeral: true });

    const winner = giveaway.participants.length
      ? giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)]
      : "No participants";

    await interaction.reply(`🏆 Giveaway ended! Prize: **${giveaway.prize}** → Winner: ${winner}`);
    giveaways = giveaways.filter(g => g.id !== id);
  }
});

client.login(TOKEN);
