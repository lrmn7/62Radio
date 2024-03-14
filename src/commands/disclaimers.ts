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
  .setName("disclaimers")
  .setDescription("Shows some disclaimers!");

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
          url: "https://top.gg/user/361407102650109952",
        }),
      );

  interaction.reply({
    embeds: [
      ReplyEmbed.build({
        color: "Red",
        title: "DISCLAIMER!",
        message:
          "With the use of this bot you automatically agree that the developer of this bot is not responsible for any damage done to non NSFW channels or copyright rights.\nThe music is streamed from official radio stations around the world and the developer has no effect on what is streamed!",
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
