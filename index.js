const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔑 المتغيرات
const TOKEN = process.env.TOKEN;

const SUPPORT_ROLES = [
  process.env.SUPPORT_ROLE_1,
  process.env.SUPPORT_ROLE_2,
  process.env.SUPPORT_ROLE_3
];

const CATEGORY = {
  player: process.env.CATEGORY_PLAYER,
  admin: process.env.CATEGORY_ADMIN,
  faction: process.env.CATEGORY_FACTION
};

const LOG_CHANNEL = process.env.LOG_CHANNEL;

let tickets = new Map();

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 🎫 أمر فتح التذكرة
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!ticket") {
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 فتح شكوى")
        .setStyle(ButtonStyle.Primary)
    );

    msg.channel.send({ content: "اضغط لفتح شكوى:", components: [btn] });
  }
});

// ================= التفاعلات =================
client.on("interactionCreate", async (interaction) => {

  // فتح الشكوى
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_type")
        .setPlaceholder("اختر نوع الشكوى")
        .addOptions([
          { label: "👤 ضد لاعب", value: "player" },
          { label: "🛡️ ضد إداري", value: "admin" },
          { label: "🏴 ضد قائد فصيل", value: "faction" }
        ])
    );

    return interaction.reply({
      content: "اختر نوع الشكوى:",
      components: [menu],
      ephemeral: true
    });
  }

  // اختيار النوع
  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`ticket_${type}`)
      .setTitle("تف
