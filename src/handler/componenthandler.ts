import { Client, GuildMember, Interaction } from "discord.js";

import AudioHandler from "./audiohandler";
import ReplyEmbed from "../components/replyembed";
import Controls from "../components/controls";
import { getVoiceConnection } from "@discordjs/voice";
import Data from "../data";
import FetchHandler from "./fetchhandler";

async function handle(client: Client, interaction: Interaction) {
  if (!interaction.guild || !interaction.guildId) {
    return;
  }

  const guildId = interaction.guildId;

  if (interaction.isButton()) {
    if (interaction.customId === "stream_cancel_button") {
      const streamMap = Data.streamMap
        .get(interaction.user.id)
        ?.get(interaction.channelId);
      if (!streamMap) return;

      Data.streamMap.get(interaction.user.id)?.delete(interaction.channelId);

      interaction.message.delete().catch(() => {});
      await interaction
        .reply({ embeds: [ReplyEmbed.build({ title: "Canceled selection!" })] })
        .then((message) =>
          setTimeout(() => message.delete().catch(() => {}), 5000),
        )
        .catch(() => {});
      return;
    }

    const voiceConnection = (<GuildMember>interaction.member).voice;
    const voiceChannel = voiceConnection.channel;
    if (
      !voiceChannel ||
      !voiceChannel.id ||
      !voiceChannel.members.get(client.user?.id || "")
    ) {
      if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
      interaction
        .reply({
          embeds: [
            ReplyEmbed.build({
              title: "You have to be in the same voicechannel as I am!",
              isError: true,
            }),
          ],
        })
        .then((message) =>
          setTimeout(() => message.delete().catch(() => {}), 5000),
        );
      return;
    }

    if (interaction.customId === "play_button") {
      const audioData = AudioHandler.getData(guildId);
      if (!audioData || !audioData.resourceString) {
        interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title: "There's no station selected yet!",
                message: "Issue /stream to start streaming!",
                isError: true,
              }),
            ],
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 5000),
          )
          .catch(() => {});
        return;
      }

      await interaction.reply({ embeds: [ReplyEmbed.build({ title: "•••" })] });

      const connection = AudioHandler.connectToVoiceChannel(
        voiceChannel.id,
        guildId,
        interaction.guild.voiceAdapterCreator,
      );
      const playing = AudioHandler.play(guildId, audioData.resourceString);

      if (!connection || !playing) {
        await interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title: "OOPS, an error occurred!",
                isError: true,
              }),
            ],
            ephemeral: true,
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 5000),
          )
          .catch(() => {});
        return;
      }

      connection.subscribe(audioData.player);

      await Controls.update(client, guildId, undefined, "playing");

      interaction
        .editReply({
          embeds: [ReplyEmbed.build({ title: "▶", color: "Green" })],
        })
        .then((message) =>
          setTimeout(() => message.delete().catch(() => {}), 5000),
        )
        .catch(() => {});
      return;
    }
    if (interaction.customId === "pause_button") {
      const paused = AudioHandler.pause(guildId);
      if (!paused) {
        await interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title: "OOPS, an error occurred!",
                isError: true,
              }),
            ],
            ephemeral: true,
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 5000),
          )
          .catch(() => {});
        return;
      }

      await Controls.update(client, guildId, undefined, "paused");

      interaction
        .reply({
          embeds: [ReplyEmbed.build({ title: "⏸", color: "DarkerGrey" })],
        })
        .then((message) =>
          setTimeout(() => message.delete().catch(() => {}), 5000),
        )
        .catch(() => {});
      return;
    }
    if (interaction.customId === "stop_button") {
      const stopped = AudioHandler.stop(guildId);
      if (stopped) {
        await Controls.reset(client, guildId);

        await interaction
          .reply({
            embeds: [
              ReplyEmbed.build({ title: "Stopped Playing!", color: "Red" }),
            ],
            ephemeral: true,
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 5000),
          )
          .catch(() => {});
        return;
      }

      await interaction
        .reply({
          embeds: [
            ReplyEmbed.build({
              title: "OOPS, an error occurred!",
              isError: true,
            }),
          ],
          ephemeral: true,
        })
        .then((message) =>
          setTimeout(() => message.delete().catch(() => {}), 5000),
        )
        .catch(() => {});

      return;
    }
    if (interaction.customId === "leave_button") {
      const voiceConnection = getVoiceConnection(guildId);
      if (!voiceConnection) {
        interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title: "I am currently in no voicechannel!",
                isError: true,
              }),
            ],
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 5000),
          )
          .catch(() => {});
        return;
      }

      const stopped = AudioHandler.stop(guildId);
      if (!stopped) {
        await interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title: "OOPS, an error occurred!",
                isError: true,
              }),
            ],
            ephemeral: true,
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 5000),
          )
          .catch(() => {});

        return;
      }

      await Controls.reset(client, guildId);

      voiceConnection.disconnect();
      voiceConnection.destroy();

      interaction
        .reply({ embeds: [ReplyEmbed.build({ title: ":wave:" })] })
        .then((message) =>
          setTimeout(() => message.delete().catch(() => {}), 5000),
        )
        .catch(() => {});
      return;
    }
  }
}

export default {
  handle: handle,
};
