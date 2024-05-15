const { playAudio, handleError, songQueue, playNextSong } = require('./audio_stream');
const { getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');

function stop(message) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection) {
    songQueue.length = 0; // Clear the queue
    connection.destroy(); // Leave the voice channel
    message.reply('Stopped playing and cleared the queue.');
  } else {
    message.reply('I am not in a voice channel.');
  }
}

async function force(message, url) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection) {
    try {
      songQueue.length = 0; // Clear the queue
      await playAudio(connection, url); // Play the new song
      message.reply('Forcing song to play.');
    } catch (error) {
      console.error('Error forcing song to play:', error);
      await handleError(message, 'There was an error forcing the song to play.');
    }
  } else {
    message.reply('I am not in a voice channel.');
  }
}

function pauseOrResume(message) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection && connection.state.subscription) {
    const player = connection.state.subscription.player;
    if (player.state.status === AudioPlayerStatus.Playing) {
      player.pause();
      message.reply('Paused the music.');
    } else if (player.state.status === AudioPlayerStatus.Paused) {
      player.unpause();
      message.reply('Resumed the music.');
    } else {
      message.reply('No music is playing.');
    }
  } else {
    message.reply('I am not in a voice channel.');
  }
}

module.exports = { stop, force, pauseOrResume };
