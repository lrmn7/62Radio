import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";

import ReplyEmbed from "../components/replyembed";

const command = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Shows information about the bot!");

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  const actionRowBuilder = new ActionRowBuilder<ButtonBuilder>();

  // Button for Invite
  actionRowBuilder.addComponents(
    new ButtonBuilder({
      label: "Invite",
      style: ButtonStyle.Link,
      url: `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`,
    }),
  );

  // Button for Server Support
  actionRowBuilder.addComponents(
    new ButtonBuilder({
      label: `Server Support`,
      style: ButtonStyle.Link,
      url: "https://discord.gg/6EXgrmtkPX",
    }),
  );

  // Button for Vote
  actionRowBuilder.addComponents(
    new ButtonBuilder({
      label: `Vote`,
      style: ButtonStyle.Link,
      url: "https://top.gg/bot/1090120136167538748/vote",
    }),
  );

  await interaction.reply({
    embeds: [
      ReplyEmbed.build({
        title: `About of ${client.user?.username}`,
        message: `**${client.user?.username} is a Discord radio bot that brings official radio stations from around the world into your voice channels.**
    **How to Use:**
    - Type </stream:1217855267975331953> to play a radio station in your voice channel.\n- Type </controls:1217855267501244469> to display the controls in the specified channel.\n- Type </disclaimers:1217855267975331952> for important disclaimers!\nFeel free to explore the features and enjoy the music! If you need assistance, join our [Support Server](https://discord.gg/6EXgrmtkPX).`,
      }),
    ],
    components: [actionRowBuilder],
    ephemeral: false,
  });
}

export default {
  command: command,
  execute: execute,
};
