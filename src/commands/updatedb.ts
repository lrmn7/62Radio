import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord.js";

import ReplyEmbed from "../components/replyembed";
import DatabaseHandler from "../handler/databasehandler";
import FetchHandler from "../handler/fetchhandler";
import ProgressBar from "../components/progressbar";
import fetchhandler from "../handler/fetchhandler";

const command = new SlashCommandBuilder()
  .setName("updatedb")
  .setDescription("Update the database")
  .addStringOption((option) =>
    option
      .setName("countryname")
      .setDescription("Enter the name of the country")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("isocode")
      .setDescription(
        "Enter the ISO Code of the country (e.g. ID, US, GB, CA)",
      )
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("continent")
      .setDescription("Enter the continent of the country")
      .addChoices(
        { name: "Europe", value: "europe" },
        { name: "North America", value: "north_america" },
        { name: "South America", value: "south_america" },
        { name: "Asia", value: "asia" },
        { name: "Africa", value: "africa" },
        { name: "Oceania", value: "oceania" },
      )
      .setRequired(true),
  )
  .addBooleanOption((option) =>
    option
      .setName("skipexisting")
      .setDescription("Skip the regions that are already set?"),
  );

async function execute(
  client: Client,
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.guild) return;

  const countryName = interaction.options
    .getString("countryname", true)
    .toLowerCase();
  const isoCode =
    interaction.options.getString("isocode", true).toLowerCase() || "";
  const continent = interaction.options
    .getString("continent", true)
    .toLowerCase()
    .replaceAll(" ", "_");
  const skipExisting = interaction.options.getBoolean("skipexisting") || false;
  const isEuropean = continent === "europe";
  const flag =
    isoCode !== "uk" ? `:flag_${isoCode.split("/")[0]}:` : ":flag_gb:";

  await interaction.reply({
    embeds: [
      ReplyEmbed.build({
        title: `${flag} Fetching information for ${countryName?.toUpperCase()} (${isoCode.toUpperCase()})...`,
        message: "This might take a while!",
      }),
    ],
  });
  const message = await interaction.fetchReply();

  const prepIsoCode = isoCode.split("/")[0];

  let countryID = 1;

  const fetchedData = await FetchHandler.fetchData(
    countryName,
    isoCode,
    isEuropean,
    skipExisting,
    async (
      countryId,
      percentage,
      time_seconds,
      current_region,
      current_dataset,
      flag_color_average,
    ) => {
      countryID = countryId;

      let timeString = "calculating...";
      if (!Number.isNaN(time_seconds)) {
        const time_minutes = time_seconds / 60;
        timeString =
          time_minutes <= 1
            ? `${Math.floor(time_seconds)} sec.`
            : time_minutes >= 60
            ? `${Math.floor(time_minutes / 60)}h., ${Math.floor(
                time_minutes % 60,
              )}m., ${Math.floor(time_seconds % 60)}s.`
            : `${time_minutes.toFixed(2)} min.`;
      }

      if (current_dataset && current_dataset.length > 0) {
        await DatabaseHandler.StationsData.findOneAndReplace(
          { iso_string: isoCode.split("/")[0] },
          {
            country: countryName,
            iso_string: prepIsoCode,
            country_id: countryID,
            continent: continent,
            regions: current_dataset,
          },
          { upsert: true },
        ).exec();
      }

      let prepCurrentRegion = current_region?.startsWith("st-")
        ? current_region.replace("st-", "st.")
        : current_region;
      prepCurrentRegion = prepCurrentRegion
        ?.replaceAll(":", ", ")
        .replaceAll("-", " ")
        .toUpperCase();

      await message.edit({
        embeds: [
          ReplyEmbed.build({
            title: `${flag}  ${countryName?.toUpperCase()}, ${isoCode.toUpperCase()}`,
            message: `${
              !current_region
                ? ""
                : `Current region\n**${prepCurrentRegion}**\n\n`
            }Progress\n**${ProgressBar.getString(
              percentage,
            )} (${percentage}%)**\n\nEstimated time\n**${timeString}**`,
            color: flag_color_average ? flag_color_average : "DarkerGrey",
            footer: `Last update`,
            timestamp: true,
          }),
        ],
      });
    },
  );

  if (!fetchedData) {
    if (!interaction.replied) return;
    await message.edit({
      embeds: [
        ReplyEmbed.build({
          title: `${flag}  ${countryName?.toUpperCase()}, ${isoCode.toUpperCase()}`,
          message: "Oops, an error occurred!\nIf the issue persists, please visit our [support server](https://discord.gg/6EXgrmtkPX) to report the problem.",
          isError: true,
        }),
      ],
      components: [],
    });
    return;
  }

  await DatabaseHandler.StationsData.findOneAndReplace(
    { iso_string: prepIsoCode },
    {
      country: countryName,
      iso_string: prepIsoCode,
      country_id: countryID,
      continent: continent,
      regions: fetchedData,
    },
    { upsert: true },
  ).exec();

  await message
    .edit({
      embeds: [
        ReplyEmbed.build({
          title: `${flag}  ${countryName?.toUpperCase()}, ${isoCode.toUpperCase()} is done!`,
          color: "Green",
        }),
      ],
      content: `<@${interaction.user.id}>`,
    })
    .then((message) =>
      setTimeout(() => message.delete().catch(() => {}), 5500),
    );
}
export default {
  command: command,
  execute: execute,
};
