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

// 🔑 المتغيرات من Render
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

// 🎫 زر فتح الشكوى
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
      .setTitle("تفاصيل الشكوى");

    const name = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("اسمك")
      .setStyle(TextInputStyle.Short);

    const target = new TextInputBuilder()
      .setCustomId("target")
      .setLabel("اسم الشخص")
      .setStyle(TextInputStyle.Short);

    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("شرح المشكلة")
      .setStyle(TextInputStyle.Paragraph);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(target),
      new ActionRowBuilder().addComponents(reason)
    );

    return interaction.showModal(modal);
  }

  // إنشاء التذكرة
  if (interaction.isModalSubmit()) {

    const type = interaction.customId.split("_")[1];

    const name = interaction.fields.getTextInputValue("name");
    const target = interaction.fields.getTextInputValue("target");
    const reason = interaction.fields.getTextInputValue("reason");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY[type],
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        ...SUPPORT_ROLES.map(r => ({
          id: r,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }))
      ]
    });

    tickets.set(interaction.user.id, channel.id);

    const roles = SUPPORT_ROLES.map(r => `<@&${r}>`).join(" ");

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 إغلاق")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("📩 تذكرة جديدة")
      .addFields(
        { name: "الاسم", value: name },
        { name: "الهدف", value: target },
        { name: "السبب", value: reason }
      )
      .setColor("Blue");

    await channel.send({
      content: `${roles}\n👋 أهلاً بك ${interaction.user}`,
      embeds: [embed],
      components: [closeBtn]
    });

    return interaction.reply({ content: "✅ تم فتح الشكوى", ephemeral: true });
  }

  // إغلاق
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    const modal = new ModalBuilder()
      .setCustomId("close_reason")
      .setTitle("سبب الإغلاق");

    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("اكتب السبب")
      .setStyle(TextInputStyle.Paragraph);

    modal.addComponents(new ActionRowBuilder().addComponents(reason));

    return interaction.showModal(modal);
  }

  // التقييم
  if (interaction.isModalSubmit() && interaction.customId === "close_reason") {

    const reason = interaction.fields.getTextInputValue("reason");

    const row = new ActionRowBuilder().addComponents(
      [1,2,3,4,5].map(i =>
        new ButtonBuilder()
          .setCustomId(`rate_${i}_${reason}`)
          .setLabel(`${i}⭐`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    return interaction.reply({
      content: "قيّم الخدمة:",
      components: [row]
    });
  }

  // إنهاء التذكرة
  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {

    const parts = interaction.customId.split("_");
    const rating = parts[1];
    const reason = parts.slice(2).join("_");

    const userId = interaction.channel.topic;

    const log = client.channels.cache.get(LOG_CHANNEL);

    const embed = new EmbedBuilder()
      .setTitle("📁 سجل شكوى")
      .addFields(
        { name: "المستخدم", value: `<@${userId}>` },
        { name: "التقييم", value: `${rating}⭐` },
        { name: "السبب", value: reason }
      )
      .setColor("Green");

    if (log) log.send({ embeds: [embed] });

    try {
      const user = await client.users.fetch(userId);
      await user.send(`تم إغلاق شكواك\n⭐ التقييم: ${rating}`);
    } catch {}

    await interaction.reply("⏳ سيتم حذف التذكرة خلال 5 ثواني...");

    setTimeout(() => {
      interaction.channel.delete();
    }, 5000);
  }
});

client.login(TOKEN);
