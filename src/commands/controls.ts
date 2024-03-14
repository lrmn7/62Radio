import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

import Controls from "../components/controls";
import ReplyEmbed from "../components/replyembed";
import DatabaseHandler from "../handler/databasehandler";
import Data from "../data";

const command = new SlashCommandBuilder()
  .setName("controls")
  .setDescription("Display the controls in the specified channel!")
  .addChannelOption((channel) =>
    channel
      .addChannelTypes(ChannelType.GuildText)
      .setName("channel")
      .setDescription("The channel to display the controls in")
      .setRequired(false),
  )
  .addBooleanOption((boolean) =>
    boolean
      .setRequired(false)
      .setName("lock")
      .setDescription("Lock the channel for messages after the controls"),
  );

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  const guildId = interaction.guildId;
  if (!guildId) {
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

  const channel = interaction.options.getChannel("channel");
  const lockChannel = interaction.options.getBoolean("lock");

  const doc = await DatabaseHandler.ControlsData.findOne({
    guild: guildId,
  }).exec();

  //If channel is not specified
  if (!channel) {
    if (doc) {
      const messageChannel = <TextChannel>(
        await client.channels.fetch(doc.channel || "")
      );
      if (!messageChannel) {
        interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title: "Could not send controls to <#" + doc.channel + ">!",
                isError: true,
              }),
            ],
          })
          .then((message) =>
            setTimeout(() => message.delete().catch(() => {}), 3000),
          );
        return;
      }
      const message = await messageChannel.messages
        .fetch(doc.message || "")
        .catch(() => {});
      if (message) await message.delete().catch(() => {});

      const newMessage = await messageChannel.send({
        embeds: [Controls.getDefaultEmbed()],
        components: [Controls.buttons],
      });
      const lock = lockChannel === undefined ? doc.lock : lockChannel;

      await DatabaseHandler.ControlsData.updateOne(
        { guild: guildId },
        { channel: messageChannel.id, message: newMessage.id, lock: lock },
        { upsert: true },
      )
        .exec()
        .then(async () => {
          if (lock) {
            Data.lockChannel(messageChannel.id);
          } else {
            Data.unlockChannel(messageChannel.id);
          }

          await Controls.update(client, guildId, undefined, undefined);

          interaction
            .reply({
              embeds: [
                ReplyEmbed.build({
                  title:
                    "Controls are now shown inside of <#" +
                    messageChannel.id +
                    ">!",
                }),
              ],
            })
            .then((message) =>
              setTimeout(() => message.delete().catch(() => {}), 3000),
            );
        })
        .catch((err) => {
          console.log(err);
          interaction
            .reply({
              embeds: [
                ReplyEmbed.build({
                  title:
                    "Error whilst trying to save to database. Please try again.",
                  isError: true,
                }),
              ],
            })
            .then((message) =>
              setTimeout(() => message.delete().catch(() => {}), 3000),
            );
        });
      return;
    } else {
      interaction
        .reply({
          embeds: [
            ReplyEmbed.build({
              title: "Please specify a channel first!",
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

  //If channel is specified
  if (doc) {
    if (doc.message) {
      const prevChannel = await client.channels
        .fetch(doc.channel || "")
        .catch(() => {});
      if (prevChannel?.type === ChannelType.GuildText) {
        await prevChannel.messages
          .delete(doc.message)
          .catch(() => {})
          .catch(() => {});
      }
    }
  }

  const newChannel = <TextChannel>await client.channels.fetch(channel.id);
  const message = await newChannel.send({
    embeds: [Controls.getDefaultEmbed()],
    components: [Controls.buttons],
  });

  if (!message) {
    if (interaction.replied) {
      await interaction
        .editReply({
          embeds: [
            ReplyEmbed.build({
              title:
                "Could not display controls inside of <#" +
                newChannel.id +
                ">!",
              isError: true,
            }),
          ],
        })
        .then((message) => setTimeout(() => message.delete(), 3000));
    } else {
      await interaction
        .reply({
          embeds: [
            ReplyEmbed.build({
              title:
                "Could not display controls inside of <#" +
                newChannel.id +
                ">!",
              isError: true,
            }),
          ],
        })
        .then((message) => setTimeout(() => message.delete(), 3000));
    }
  }

  const locked =
    lockChannel === undefined ? (!doc?.lock ? false : doc.lock) : lockChannel;
  await DatabaseHandler.ControlsData.updateOne(
    { guild: guildId },
    { channel: channel.id, message: message.id, lock: locked },
    { upsert: true },
  )
    .exec()
    .then(async () => {
      if (locked) {
        Data.lockChannel(channel.id);
      } else {
        Data.unlockChannel(channel.id);
      }

      await Controls.update(client, guildId, undefined, undefined);

      if (interaction.replied) {
        await interaction
          .editReply({
            embeds: [
              ReplyEmbed.build({
                title:
                  "Controls are now shown inside of <#" + newChannel.id + ">!",
              }),
            ],
          })
          .then((message) => setTimeout(() => message.delete(), 3000));
      } else {
        await interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title:
                  "Controls are now shown inside of <#" + newChannel.id + ">!",
              }),
            ],
          })
          .then((message) => setTimeout(() => message.delete(), 3000));
      }
    })
    .catch(() => {
      if (interaction.replied) {
        interaction
          .editReply({
            embeds: [
              ReplyEmbed.build({
                title:
                  "Error whilst trying to save to database. Please try again.",
                isError: true,
              }),
            ],
          })
          .then((message) => setTimeout(() => message.delete(), 3000));
      } else {
        interaction
          .reply({
            embeds: [
              ReplyEmbed.build({
                title:
                  "Error whilst trying to save to database. Please try again.",
                isError: true,
              }),
            ],
          })
          .then((message) => setTimeout(() => message.delete(), 3000));
      }
    });
}

export default {
  command: command,
  execute: execute,
};
