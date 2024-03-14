import { ColorResolvable, EmbedBuilder } from "discord.js";

interface BuildOptions {
  title?: string;
  message?: string;
  isError?: boolean;
  color?: ColorResolvable;
  timestamp?: boolean;
  imageURL?: string | null;
  footer?: string | null;
  thumbnailURL?: string | null;
}

function build(options: BuildOptions): EmbedBuilder {
  const embed = new EmbedBuilder();
  embed.setDescription(options.message || null);
  embed.setTitle(options.title || null);
  embed.setColor(
    options.color ? options.color : options.isError ? "DarkRed" : "DarkerGrey",
  );
  embed.setImage(options.imageURL || null);
  embed.setThumbnail(options.thumbnailURL || null);
  if (options.timestamp) embed.setTimestamp();

  if (options.footer) {
    embed.setFooter({ text: options.footer });
  }

  return embed;
}

export default {
  build: build,
};
