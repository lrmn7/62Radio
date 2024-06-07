import {
  Client,
  REST,
  GatewayIntentBits,
  Routes,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { config } from "dotenv";
import audioHandler from "./handler/audiohandler";
console.log("Loading database handler...");
import DatabaseHandler from "./handler/databasehandler";

console.log("Loading data handler...");
import Data from "./data";

console.log("Loading components and component handlers...");
import ComponentHandler from "./handler/componenthandler";

console.log("Loading commands and command handler...");
import CommandHandler from "./handler/commandhandler";

console.log("Loading environment variables...");
config({ path: "../.env" });

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_BOT_CLIENT_ID = process.env.DISCORD_BOT_CLIENT_ID || "";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const CHANNEL_LOGS_ID = process.env.CHANNEL_LOGS_ID || "";

console.log();

const rest = new REST().setToken(DISCORD_BOT_TOKEN);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
audioHandler.setClient(client);
async function main() {
  console.log("Connecting to database...");
  await DatabaseHandler.connectToDB(client)
    .then(() => console.log("Connected to database!"))
    .catch(() => {
      console.log("Could not connect to database!");
      process.exit();
    });
  console.log();

  console.log("Loading database data...");
  await Data.update();
  console.log("Loading finished!");

  console.log();

  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(DISCORD_BOT_CLIENT_ID), {
      body: CommandHandler.jsonFormat,
    });

    console.log("Logging in...");
    client.login(DISCORD_BOT_TOKEN);
  } catch (err) {
    console.log(err);
  }
}

async function updatePresence() {
  const names = ["radio stations", "24/7 radio", "world radio"];
  setInterval(() => {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomType = [1, 2, 3][Math.floor(Math.random() * 3)];

    client.user?.setPresence({
      status: "idle",
      activities: [
        {
          name: randomName,
          type: 1,
          url: "https://www.youtube.com/watch?v=cpKL1AXaiFc",
        },
      ],
    });
  }, 10000);
}

client.on("ready", (client) => {
  console.log(`\x1b[32m${client.user.tag} is now running!\x1b[0m\n`);
  updatePresence();
});
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    CommandHandler.handle(client, interaction);
  } else {
    ComponentHandler.handle(client, interaction);
  }
});
client.on("messageCreate", async (message) => {
  if (!message.guild) return;
  if (message.author.id === client.user?.id) return;
  if (!Data.getLockedChannels()) return;
  if (!Data.getLockedChannels().includes(message.channel.id)) return;
  if (!message.deletable) return;
  await message.delete();
});

client.on("guildCreate", async (guild) => {
  try {
    if (!CHANNEL_LOGS_ID) return;
    const eventChannel = await client.channels.fetch(CHANNEL_LOGS_ID);
    if (!eventChannel || !eventChannel.isTextBased()) return;
    const owner = await client.users.fetch(guild.ownerId);

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setAuthor({
        name: `📥 Joined a Guild!`,
      })
      .setThumbnail(guild.iconURL({ extension: "jpeg" }))
      .addFields(
        {
          name: "Guild Name",
          value: `${guild.name} \n ${guild.id}`,
          inline: true,
        },
        { name: "Owner", value: owner.displayName, inline: true },
        { name: "Members", value: guild.memberCount.toString(), inline: true },
        {
          name: "Created At",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: true,
        },
        {
          name: "Joined At",
          value: `<t:${Math.floor(guild.joinedTimestamp / 1000)}:F>`,
          inline: true,
        },
        {
          name: `Current Server`,
          value: `\`${client.guilds.cache.size}\` Servers`,
          inline: true,
        },
      )
      .setTimestamp();
    const channel = eventChannel as TextChannel;
    await channel.send({ embeds: [embed] });
    console.log(`Sent join message to event channel for guild ${guild.name}`);
  } catch (error) {
    console.error("Error handling guildCreate event:", error);
  }
});

client.on("guildDelete", async (guild) => {
  try {
    if (!CHANNEL_LOGS_ID) return;
    const eventChannel = await client.channels.fetch(CHANNEL_LOGS_ID);
    if (!eventChannel || !eventChannel.isTextBased()) return;
    const owner = await client.users.fetch(guild.ownerId);

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setAuthor({
        name: `📥 Left a Guild!`,
      })
      .setThumbnail(guild.iconURL({ extension: "jpeg" }))
      .addFields(
        {
          name: "Guild Name",
          value: `${guild.name} \n ${guild.id}`,
          inline: true,
        },
        { name: "Owner", value: owner.displayName, inline: true },
        { name: "Members", value: guild.memberCount.toString(), inline: true },
        {
          name: "Created At",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: true,
        },
        {
          name: "Joined At",
          value: `<t:${Math.floor(guild.joinedTimestamp / 1000)}:F>`,
          inline: true,
        },
        {
          name: `Current Server`,
          value: `\`${client.guilds.cache.size}\` Servers`,
          inline: true,
        },
      )
      .setTimestamp();
    const channel = eventChannel as TextChannel;
    await channel.send({ embeds: [embed] });
    console.log(`Sent leave message to event channel for guild ${guild.name}`);
  } catch (error) {
    console.error("Error handling guildCreate event:", error);
  }
});

main();
