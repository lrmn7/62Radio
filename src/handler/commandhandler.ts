import { Client, Interaction } from "discord.js";
import fs from "fs";
import path from "path";

const commandDir = path.dirname(__dirname) + path.sep + "commands" + path.sep;
const commandMap = new Map();

fs.readdirSync(commandDir)
  .filter((element) => element.endsWith(".js"))
  .forEach((file) => {
    const Command = require(commandDir + file.toString());
    commandMap.set(Command.default.command.name, Command.default);
  });

const jsonFormat: any[] = [];
commandMap.forEach((value) => jsonFormat.push(value.command.toJSON()));

async function handle(client: Client, interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const execute = commandMap.get(interaction.commandName)?.execute;
  if (!execute) {
    console.log(
      `\x1b[31mCould not execute command for ${interaction.commandName}!\x1b[0m\n`,
    );
    return;
  }

  execute(client, interaction);
}

export default {
  handle: handle,
  jsonFormat: jsonFormat,
};
