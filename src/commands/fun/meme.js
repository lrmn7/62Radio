const { MessageActionRow, MessageButton } = require('discord.js');
const fetch = require('node-fetch');
const { getRandomInt } = require('@helpers/Utils');

module.exports = {
  name: 'meme',
  description: 'Get a random meme',
  category: 'FUN',
  permissions: ['EMBED_LINKS'],
  cooldown: 20,

  async execute(message) {
    if (!message.channel.permissionsFor(message.guild.me).has('EMBED_LINKS')) {
      return message.reply('I need the "Embed Links" permission to run this command.');
    }

    const buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('regenMemeBtn')
        .setStyle('SECONDARY')
        .setLabel('Regenerate')
        .setEmoji('🔁')
    );

    const embed = await getRandomMemeEmbed();

    const sentMsg = await message.reply({ embeds: [embed], components: [buttonRow] });

    const collector = sentMsg.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: this.cooldown * 1000,
      max: 3,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId !== 'regenMemeBtn') return;

      const newEmbed = await getRandomMemeEmbed();
      await interaction.update({ embeds: [newEmbed] });
    });

    collector.on('end', () => {
      buttonRow.components.forEach((button) => button.setDisabled(true));
      sentMsg.edit({ components: [buttonRow] });
    });
  },
};

async function getRandomMemeEmbed() {
  try {
    const response = await fetch('https://api.imgflip.com/get_memes');
    const data = await response.json();

    if (data.success !== true) {
      throw new Error('Failed to fetch memes.');
    }

    const memes = data.data.memes;
    if (!Array.isArray(memes) || memes.length === 0) {
      throw new Error('No memes found.');
    }

    const randomIndex = getRandomInt(memes.length);
    const randomMeme = memes[randomIndex];

    return {
      color: 'RANDOM',
      title: randomMeme.name,
      url: randomMeme.url,
      image: {
        url: randomMeme.url,
      },
      footer: {
        text: `👍 ${randomMeme.upvotes} | 💬 ${randomMeme.comments_count}`,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      color: 'RED',
      description: 'Failed to fetch a random meme. Please try again later.',
    };
  }
}
