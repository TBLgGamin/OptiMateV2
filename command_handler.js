const { playAudio, handleError, songQueue, playNextSong, getYouTubeUrlFromSpotify } = require('./audio_stream');
const { getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');

async function force(message, url) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection) {
    try {
      songQueue.length = 0; // Clear the queue
      const youtubeUrl = url.includes('spotify.com') ? await getYouTubeUrlFromSpotify(url) : url;
      await playAudio(connection, youtubeUrl); // Play the new song
      message.reply('Forcing song to play.');
    } catch (error) {
      console.error('Error forcing song to play:', error);
      await handleError(message, 'There was an error forcing the song to play.');
    }
  } else {
    message.reply('I am not in a voice channel.');
  }
}

function stop(message) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection && connection.state.subscription) {
    const player = connection.state.subscription.player;
    songQueue.length = 0;
    player.stop(true);
    message.reply('Stopped playing and cleared the queue.');
  } else {
    message.reply('I am not in a voice channel or no music is playing.');
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

module.exports = {
  stop,
  force,
  pauseOrResume,
};