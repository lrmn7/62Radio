import { Client, Message } from "discord.js";
import Controls from "./components/controls";
import DatabaseHandler from "./handler/databasehandler";

let lockedChannels: Map<string, boolean> = new Map<string, boolean>();

const streamMap = new Map<string, Map<string, Message>>();
export type NowPlayingData = {
  station_name?: string;
  station_id?: string;
  station_image_url?: string;
  station_audio_url?: string;
  country_name?: string;
  iso_string?: string;
  region_name?: string;
  region_image?: string;
  flag_string?: string;
};
const nowPlayingMap = new Map<string, NowPlayingData>();

async function update() {
  let lockedChannelsDBData = await DatabaseHandler.ControlsData.find({})
    .select("channel message -_id")
    .exec();
  const array = <string[]>(
    lockedChannelsDBData
      .filter((data) => data.channel != undefined && data.lock === true)
      .flatMap((data) => data.channel)
  );
  array.forEach((element) => lockedChannels.set(element, true));
}

async function updateNowPlaying(
  client: Client,
  guildId: string,
  nowPlayingData: NowPlayingData | undefined,
): Promise<boolean> {
  if (!nowPlayingData) {
    nowPlayingMap.delete(guildId);
  } else {
    nowPlayingMap.set(guildId, nowPlayingData);
  }
  return await Controls.update(client, guildId, nowPlayingMap.get(guildId));
}

function translateFlagCode(isoCode?: string) {
  if (!isoCode) return "undefined";
  return (
    ":flag_" +
    (isoCode.toLowerCase() === "uk" ? "gb" : isoCode.toLowerCase()) +
    ":"
  );
}
function translateContinent(continent?: string) {
  if (!continent) return "undefined";
  return continent.replaceAll("_", " ").replaceAll("-", " ");
}
function translateRegion(region?: string) {
  if (!region) return "undefined";

  const split = region.split(":");
  if (split.length === 1) {
    return split[0].toUpperCase();
  }

  const state = split[0];
  const city = split[1];
  return (state + ", " + city).toUpperCase();
}

function lockChannel(channel: string | undefined) {
  if (!channel) return;
  lockedChannels.set(channel, true);
}
function unlockChannel(channel: string | undefined) {
  if (!channel) return;
  lockedChannels.delete(channel);
}
function getLockedChannels(): string[] {
  const array: string[] = [];
  lockedChannels.forEach((value, key) => array.push(key));
  return array;
}

export default {
  lockChannel: lockChannel,
  unlockChannel: unlockChannel,
  getLockedChannels: getLockedChannels,
  nowPlayingMap: nowPlayingMap,
  update: update,
  translateFlagCode: translateFlagCode,
  translateContinent: translateContinent,
  translateRegion: translateRegion,
  updateNowPlaying: updateNowPlaying,
  streamMap: streamMap,
};
