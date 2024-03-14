import {
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayer,
  AudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import { InternalDiscordGatewayAdapterCreator } from "discord.js";
import DatabaseHandler from "./databasehandler";

const playerMap = new Map<
  string,
  {
    player: AudioPlayer;
    audioResource: AudioResource | undefined;
    resourceString: string | undefined;
  }
>();

function addAudioPlayer(guild: string) {
  if (playerMap.has(guild)) return;

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  playerMap.set(guild, {
    player: player,
    audioResource: undefined,
    resourceString: undefined,
  });
}

function setResourceString(guild: string, audioResource: string) {
  const playerData = playerMap.get(guild);
  if (!playerData) return;

  playerData.resourceString = audioResource;
  playerMap.set(guild, playerData);
}

function loadResource(url: string): AudioResource {
  return createAudioResource(url, { inlineVolume: true });
}

function getData(guild: string):
  | {
      player: AudioPlayer;
      audioResource: AudioResource | undefined;
      resourceString: string | undefined;
    }
  | undefined {
  if (!playerMap.has(guild)) return;

  const playerData = playerMap.get(guild);
  if (!playerData) return undefined;

  return playerData;
}

async function changeVolume(guildId: string, volume: number): Promise<boolean> {
  let playerData = playerMap.get(guildId);
  if (!playerData) return false;

  if (!playerData.audioResource?.volume) return false;
  playerData.audioResource.volume.setVolume(volume);

  await DatabaseHandler.ControlsData.findOneAndUpdate(
    { guild: guildId },
    { volume: volume },
    { upsert: true },
  ).exec();
  return true;
}

function play(guildId: string, resourceString: string): boolean {
  if (!playerMap.has(guildId)) {
    addAudioPlayer(guildId);
  }

  let playerData = playerMap.get(guildId);
  if (!playerData) return false;

  setResourceString(guildId, resourceString);
  playerData = playerMap.get(guildId);

  if (!playerData?.resourceString) return false;
  const resource = loadResource(playerData.resourceString);

  playerMap.set(guildId, {
    player: playerData.player,
    audioResource: resource,
    resourceString: playerData.resourceString,
  });
  playerData.player.play(resource);

  DatabaseHandler.ControlsData.findOne({ guild: guildId }).then(async (doc) => {
    await changeVolume(guildId, doc?.volume || 1);
  });
  return true;
}

function pause(guild: string): boolean {
  if (!playerMap.has(guild)) return false;

  const playerData = playerMap.get(guild);
  if (!playerData) return false;

  playerData.player.pause();

  return true;
}

function unpause(guild: string): boolean {
  if (!playerMap.has(guild)) return false;

  const playerData = playerMap.get(guild);
  if (!playerData) return false;

  playerData?.player.unpause();

  return true;
}

function stop(guild: string): boolean {
  if (!playerMap.has(guild)) return false;

  const playerData = playerMap.get(guild);
  if (!playerData) return false;

  playerData?.player.stop();
  playerMap.delete(guild);
  return true;
}

function connectToVoiceChannel(
  channelId: string,
  guildId: string,
  adapterCreator: InternalDiscordGatewayAdapterCreator,
  errorCallback?: (error: Error) => any,
): VoiceConnection {
  const connection = joinVoiceChannel({
    channelId: channelId,
    guildId: guildId,
    adapterCreator: adapterCreator,
  });

  if (errorCallback) connection.on("error", errorCallback);
  return connection;
}

export default {
  play: play,
  stop: stop,
  pause: pause,
  unpause: unpause,
  getData: getData,
  changeVolume: changeVolume,
  connectToVoiceChannel: connectToVoiceChannel,
};
