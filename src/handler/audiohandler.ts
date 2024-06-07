import {
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayer,
  AudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import { Client, InternalDiscordGatewayAdapterCreator } from "discord.js";
import DatabaseHandler from "./databasehandler";

let client: Client; // Client declaration

const playerMap = new Map<
  string,
  {
    player: AudioPlayer;
    audioResource: AudioResource | undefined;
    resourceString: string | undefined;
  }
>();

function setClient(newClient: Client) {
  client = newClient;
}

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
  if (!client) {
    console.log("Client is not initialized.");
    return false;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.log(`Guild with ID ${guildId} was not found.`);
    return false;
  }

  if (!playerMap.has(guildId)) {
    addAudioPlayer(guildId);
    console.log(`Bot has joined the voice channel in guild ${guild?.name} / ${guildId}`);
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
  console.log(`Player Started in @ ${guild?.name} / ${guildId}`);
  return true;
}

function pause(guildId: string): boolean {
  if (!playerMap.has(guildId)) return false;

  const playerData = playerMap.get(guildId);
  if (!playerData) return false;

  playerData.player.pause();
  
  const guild = client.guilds.cache.get(guildId);
  console.log(`Player Pause in @ ${guild?.name} / ${guildId}`);
  
  return true;
}


function unpause(guildId: string): boolean {
  if (!playerMap.has(guildId)) return false;

  const playerData = playerMap.get(guildId);
  if (!playerData) return false;

  playerData?.player.unpause();
  
  const guild = client.guilds.cache.get(guildId);
  console.log(`Player Resume in @ ${guild?.name} / ${guildId}`);

  return true;
}


function stop(guildId: string): boolean {
  if (!playerMap.has(guildId)) return false;

  const playerData = playerMap.get(guildId);
  if (!playerData) return false;

  playerData?.player.stop();
  playerMap.delete(guildId);

  const guild = client.guilds.cache.get(guildId);
  console.log(`Player Stop in @ ${guild?.name} / ${guildId}`);

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
  setClient,
  play,
  stop,
  pause,
  unpause,
  getData,
  changeVolume,
  connectToVoiceChannel,
};
