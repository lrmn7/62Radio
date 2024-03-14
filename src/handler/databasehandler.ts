import { Client } from "discord.js";
import { configDotenv } from "dotenv";
import * as mongoose from "mongoose";
configDotenv();
async function connectToDB(client: Client) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI not provided. Unable to connect to the database.",
    );
    return;
  }

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    connection.connection.on("disconnected", () => {
      console.log(
        `\x1b[31mDISCONNECTED FROM DATABASE!\nSHUTTING DOWN...\x1b[0m\n`,
      );
      client.destroy();
      process.exit();
    });

    return connection;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    // Handle the error, e.g., retrying, logging, or shutting down the bot.
  }
}

function isConnected(): boolean {
  return mongoose.connection != undefined;
}

const controlsData = mongoose.model(
  "Control",
  new mongoose.Schema({
    guild: {
      type: String,
    },
    channel: {
      type: String,
    },
    message: {
      type: String,
    },
    lock: {
      type: Boolean,
      default: false,
    },
    volume: {
      type: Number,
      default: 0.5,
    },
  }),
);

const Station = new mongoose.Schema({
  station_name: {
    type: String,
  },
  station_id: {
    type: Number,
  },
  image_url: {
    type: String,
  },
  audio_url: {
    type: String,
  },
});
const RegionsSchema = new mongoose.Schema({
  region_name: {
    type: String,
  },
  region_id: {
    type: Number,
  },
  region_image: {
    type: String,
  },
  stations: [Station],
});
const StationsData = mongoose.model(
  "Station",
  new mongoose.Schema({
    country: {
      type: String,
    },
    iso_string: {
      type: String,
    },
    continent: {
      type: String,
    },
    country_id: {
      type: Number,
      unique: true,
    },
    regions: [RegionsSchema],
  }),
);

export default {
  connectToDB: connectToDB,
  isConnected: isConnected,
  connection: mongoose.connection,
  StationsData: StationsData,
  ControlsData: controlsData,
};
