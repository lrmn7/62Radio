import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";

import ReplyEmbed from "../components/replyembed";
import AudioHandler from "../handler/audiohandler";
import Controls from "../components/controls";

const command = new SlashCommandBuilder()
  .setName("volume")
  .setDescription("Change the playback volume!")
  .addNumberOption((volume) => {
    volume
      .setName("percentage")
      .setDescription("Enter a volume percentage between 0 and 100")
      .setRequired(true);
    return volume;
  });

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild || !interaction.guildId) {
    interaction
      .reply({
        embeds: [
          ReplyEmbed.build({
            title: "This command can only be used inside of servers!",
            isError: true,
          }),
        ],
      })
      .then((message) =>
        setTimeout(() => message.delete().catch(() => {}), 3000),
      );
    return;
  }

  const volume: number = interaction.options.getNumber("percentage", true);

  if (volume < 0 || volume > 500) {
    interaction
      .reply({
        embeds: [
          ReplyEmbed.build({
            title: "Please enter a valid input",
            message: "The volume can only be between 0 and 500!",
            isError: true,
          }),
        ],
      })
      .then((message) =>
        setTimeout(() => message.delete().catch(() => {}), 3000),
      );
    return;
  }

  const volumeChangeSuccess = await AudioHandler.changeVolume(
    interaction.guildId,
    volume / 100,
  );
  if (volumeChangeSuccess) {
    await Controls.update(client, interaction.guildId, undefined, "playing");
    interaction
      .reply({
        embeds: [
          ReplyEmbed.build({
            title: "Volume",
            message: `Changed to volume to \`\`${volume}%\`\`!`,
          }),
        ],
      })
      .then((message) =>
        setTimeout(() => message.delete().catch(() => {}), 3000),
      );
    return;
  } else {
    interaction
      .reply({
        embeds: [
          ReplyEmbed.build({
            title: "Volume",
            message: "Could not change the volume!",
            isError: true,
          }),
        ],
      })
      .then((message) =>
        setTimeout(() => message.delete().catch(() => {}), 3000),
      );
    return;
  }
}

export default {
  command: command,
  execute: execute,
};
