import {
  Client,
  REST,
  GatewayIntentBits,
  Routes,
  ActivityType,
} from "discord.js";
import { config } from "dotenv";

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
        { name: randomName, type: 1, url: "https://www.youtube.com/watch?v=cpKL1AXaiFc" },
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

main();
