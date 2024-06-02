const { playAudio, handleError, songQueue, getYouTubeUrlFromSpotify } = require('./audio_stream');
const { getVoiceConnection, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const playdl = require('play-dl');
const { autodj } = require('./autodj');
const { stopAutoDJ } = require('./autodj');

async function force(message, url) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection) {
    try {
      songQueue.length = 0;

      if (url.includes('spotify.com/playlist')) {
        await addSpotifyPlaylistToQueue(message, connection, url);
      } else {
        const youtubeUrl = url.includes('spotify.com') ? await getYouTubeUrlFromSpotify(url) : url;
        const videoInfo = await playdl.video_info(youtubeUrl);

        const player = connection.state.subscription ? connection.state.subscription.player : createAudioPlayer();
        connection.subscribe(player);

        await playAudio(connection, youtubeUrl, videoInfo, player);
        message.reply('Forcing song to play.');
      }
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
    stopAutoDJ();
    message.reply('Stopped playing and cleared the queue.');
  } else {
    message.reply('I am not in a voice channel or no music is playing.');
  }
}

async function skip(message) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection && connection.state.subscription) {
    const player = connection.state.subscription.player;
    if (songQueue.length > 0) {
      player.stop(true);
      message.reply('Skipped to the next song.');
    } else {
      message.reply('No more songs in the queue to skip to.');
    }
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

async function nowPlaying(message) {
  const connection = getVoiceConnection(message.guild.id);
  if (connection && connection.state.subscription) {
    const player = connection.state.subscription.player;
    if (player.state.status === AudioPlayerStatus.Playing) {
      const currentResource = player.state.resource;
      const currentTime = currentResource.playbackDuration / 1000;
      const totalDuration = currentResource.metadata.duration || 1;

      const progress = `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')} / ${Math.floor(totalDuration / 60)}:${Math.floor(totalDuration % 60).toString().padStart(2, '0')}`;

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Now Playing')
        .setDescription(`**${currentResource.metadata.title}**`)
        .addFields({ name: 'Progress', value: progress, inline: true });

      message.reply({ embeds: [embed] });
    } else {
      message.reply('No music is currently playing.');
    }
  } else {
    message.reply('I am not in a voice channel.');
  }
}

module.exports = {
  stop,
  force,
  pauseOrResume,
  nowPlaying,
  skip,
};