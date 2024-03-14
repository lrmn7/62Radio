import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  Client,
  APIEmbed,
  Embed,
} from "discord.js";

import Data from "../data";
import type { NowPlayingData } from "../data";

import DatabaseHandler from "../handler/databasehandler";
import ProgressBar from "./progressbar";
import AudioHandler from "../handler/audiohandler";
import { AudioPlayerStatus } from "@discordjs/voice";

const buttonActionRow = new ActionRowBuilder<ButtonBuilder>();
const playButton = new ButtonBuilder();
playButton.setStyle(ButtonStyle.Success);
playButton.setLabel("Play");
playButton.setCustomId("play_button");

const pauseButton = new ButtonBuilder();
pauseButton.setStyle(ButtonStyle.Secondary);
pauseButton.setLabel("Pause");
pauseButton.setCustomId("pause_button");

const stopButton = new ButtonBuilder();
stopButton.setStyle(ButtonStyle.Danger);
stopButton.setLabel("Stop");
stopButton.setCustomId("stop_button");

const leaveButton = new ButtonBuilder();
leaveButton.setStyle(ButtonStyle.Primary);
leaveButton.setLabel("Leave");
leaveButton.setCustomId("leave_button");

buttonActionRow.setComponents(playButton, pauseButton, stopButton, leaveButton);

const nowPlayingMap = new Map<string, NowPlayingData>();
type ControlsState = "playing" | "paused" | "stopped";

function resetEmbed(embed: EmbedBuilder) {
  embed.setTitle(null);
  embed.setDescription(
    "I am currently not streaming a station\nUse ``/stream`` to start streaming!",
  );
  embed.setColor("DarkRed");
  embed.setThumbnail(null);
  embed.setImage(null);
  embed.setFooter(null);
}

async function update(
  client: Client,
  guildId: string,
  nowPlaying?: NowPlayingData,
  controlsState?: ControlsState,
): Promise<boolean> {
  if (!controlsState) {
    const playerState = AudioHandler.getData(guildId)?.player.state.status;
    if (!playerState) {
      controlsState = "stopped";
    } else if (playerState === AudioPlayerStatus.Playing) {
      controlsState = "playing";
    } else {
      controlsState = "paused";
    }
  }

  if (controlsState === "stopped") {
    return await reset(client, guildId);
  }

  if (!nowPlaying) {
    const nowPlayingData = nowPlayingMap.get(guildId);
    if (!nowPlayingData) return false;

    return await update(client, guildId, nowPlayingData, controlsState);
  }

  const doc = await DatabaseHandler.ControlsData.findOne({
    guild: guildId,
  }).exec();
  if (!doc || !doc.channel || !doc.message) return false;

  const controlsChannel = <TextChannel>await client.channels.fetch(doc.channel);
  if (!controlsChannel) return false;

  let description =
    nowPlaying.flag_string +
    " " +
    (nowPlaying.country_name || "").toUpperCase() +
    ", " +
    Data.translateRegion(nowPlaying.region_name || "").toUpperCase();
  description += "\n\n";
  if (doc.volume) {
    description +=
      "Volume: " +
      ProgressBar.getString(doc.volume * 100) +
      " " +
      doc.volume * 100 +
      "%";
  }

  const embed = new EmbedBuilder();
  embed.setTitle(nowPlaying.station_name || "");
  embed.setDescription(description);
  embed.setThumbnail(
    (nowPlaying.station_image_url || "")
      .replaceAll(".svg", ".gif")
      .replace("..", ""),
  );
  embed.setFooter({ text: "ID: " + nowPlaying.station_id });
  embed.setColor(controlsState === "playing" ? "Green" : "DarkerGrey");
  embed.setImage(nowPlaying.region_image || null);

  nowPlayingMap.set(guildId, nowPlaying);

  const message = await controlsChannel.messages
    .fetch(doc.message)
    .catch(() => {});
  if (!message) return false;

  await message
    .edit({ embeds: [embed.toJSON()], components: [buttonActionRow.toJSON()] })
    .catch(() => {});
  return true;
}

async function reset(client: Client, guildId: string): Promise<boolean> {
  const doc = await DatabaseHandler.ControlsData.findOne({
    guild: guildId,
  }).exec();
  if (!doc || !doc.channel || !doc.message) return false;

  const controlsChannel = <TextChannel>await client.channels.fetch(doc.channel);
  if (!controlsChannel) return false;

  const message = await controlsChannel.messages
    .fetch(doc.message)
    .catch(() => {});
  if (!message) return false;

  const embed = new EmbedBuilder();
  resetEmbed(embed);
  nowPlayingMap.delete(guildId);

  await message
    .edit({ embeds: [embed.toJSON()], components: [buttonActionRow.toJSON()] })
    .catch(() => {});
  return true;
}

function getDefaultEmbed() {
  const embed = new EmbedBuilder();
  resetEmbed(embed);
  return embed.toJSON();
}

export default {
  getDefaultEmbed: getDefaultEmbed,
  buttons: buttonActionRow.toJSON(),
  update: update,
  reset: reset,
};
