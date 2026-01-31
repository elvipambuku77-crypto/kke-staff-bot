const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_ROLES = [
  { name: "Staff", id: "1467162751167238165" }, // your real staff role
  { name: "Helper", id: "1466124328713195583" },
  { name: "Mod", id: "1466124409763926041" },
  { name: "Admin", id: "1466124454399705255" },
  { name: "Manager", id: "1466124732490584074" },
  { name: "Head Of Staff", id: "1466124767659561073" },
  { name: "Co Owner", id: "1466124822424719391" },
  { name: "Owner", id: "1466124847011598428" }
];

const LOG_CHANNEL_ID = "1444683724112531540";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promote a staff member")
    .addUserOption(o =>
      o.setName("user").setDescription("Staff member").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("demote")
    .setDescription("Demote a staff member")
    .addUserOption(o =>
      o.setName("user").setDescription("Staff member").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("staffrank")
    .setDescription("Check staff rank")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("PD slash commands registered");
})();

function getStaffIndex(member) {
  return STAFF_ROLES.findIndex(r => member.roles.cache.has(r.id));
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;
  const executor = interaction.member;
  const target = await guild.members.fetch(
    interaction.options.getUser("user").id
  );

  const execRank = getStaffIndex(executor);
  const targetRank = getStaffIndex(target);

  if (interaction.commandName === "staffrank") {
    if (targetRank === -1)
      return interaction.reply({ content: "❌ User is not staff", ephemeral: true });

    return interaction.reply({
      content: `✅ ${target.user.tag} → **${STAFF_ROLES[targetRank].name}**`,
      ephemeral: true
    });
  }

  if (execRank === -1)
    return interaction.reply({ content: "❌ You are NOT staff", ephemeral: true });

  if (targetRank === -1)
    return interaction.reply({ content: "❌ Target is not staff", ephemeral: true });

  if (execRank <= targetRank)
    return interaction.reply({
      content: "❌ You cannot manage someone equal or higher than you",
      ephemeral: true
    });

  const reason = interaction.options.getString("reason");

  /* ===== PROMOTE ===== */
  if (interaction.commandName === "promote") {
    if (targetRank + 1 >= STAFF_ROLES.length)
      return interaction.reply({ content: "❌ Already highest rank", ephemeral: true });

    const oldRole = STAFF_ROLES[targetRank];
    const newRole = STAFF_ROLES[targetRank + 1];

    await target.roles.remove(oldRole.id);
    await target.roles.add(newRole.id);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("📈 Staff Promotion")
      .addFields(
        { name: "Staff", value: target.user.tag, inline: true },
        { name: "From", value: oldRole.name, inline: true },
        { name: "To", value: newRole.name, inline: true },
        { name: "By", value: executor.user.tag },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    guild.channels.cache.get(LOG_CHANNEL_ID)?.send({ embeds: [embed] });
  }

  /* ===== DEMOTE ===== */
  if (interaction.commandName === "demote") {
    if (targetRank - 1 < 0)
      return interaction.reply({ content: "❌ Already lowest rank", ephemeral: true });

    const oldRole = STAFF_ROLES[targetRank];
    const newRole = STAFF_ROLES[targetRank - 1];

    await target.roles.remove(oldRole.id);
    await target.roles.add(newRole.id);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("📉 Staff Demotion")
      .addFields(
        { name: "Staff", value: target.user.tag, inline: true },
        { name: "From", value: oldRole.name, inline: true },
        { name: "To", value: newRole.name, inline: true },
        { name: "By", value: executor.user.tag },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    guild.channels.cache.get(LOG_CHANNEL_ID)?.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
