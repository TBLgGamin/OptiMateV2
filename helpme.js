const { EmbedBuilder } = require('discord.js');

function helpme(message) {
  const helpEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Bot Commands')
    .setDescription('Here are the commands you can use with OptiMate:')
    .addFields(
      { name: '!play <URL>', value: 'Plays the audio from the provided YouTube URL. If there is a queue, it adds the song to the queue.' },
      { name: '!q', value: 'Displays the current song queue.' },
      { name: '!stop', value: 'Stops the current playback and clears the song queue.' },
      { name: '!force <URL>', value: 'Forces a new song to play immediately, stopping the current playback and clearing the queue.' },
      { name: '!pause', value: 'Pauses the current playback.' },
      { name: '!play', value: 'Resumes the paused playback.' },
      { name: '!helpme', value: 'Displays this help message with all available commands.' }
    );

  message.reply({ embeds: [helpEmbed] });
}

module.exports = { helpme };