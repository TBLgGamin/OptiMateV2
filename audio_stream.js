const ytdl = require('ytdl-core-discord');
const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  NoSubscriberBehavior, 
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const spdl = require('spotify-url-info');
const playdl = require('play-dl');
const { getData } = require('spotify-url-info')(fetch);

let songQueue = [];
let player;

async function playAudio(connection, url, videoInfo) {
  const stream = await ytdl(url, { 
    filter: 'audioonly', 
    highWaterMark: 1 << 25,
    quality: 'highestaudio',
    liveBuffer: 30000
  });

  const duration = videoInfo.video_details.durationInSec || parseInt(videoInfo.video_details.lengthSeconds, 10) || 0;

  const resource = createAudioResource(stream, { 
    inlineVolume: true,
    metadata: { 
      title: videoInfo.video_details.title, 
      duration: duration
    }
  });

  player.play(resource);
}

async function getYouTubeUrlFromSpotify(spotifyUrl) {
  const spotifyInfo = await getData(spotifyUrl);
  const searchQuery = `${spotifyInfo.name} ${spotifyInfo.artists[0].name}`;
  const searchResults = await playdl.search(searchQuery, { limit: 1 });
  return searchResults[0].url;
}

async function addSongToQueue(message, connection, url) {
  try {
    let youtubeUrl = url;
    if (url.includes('spotify.com')) {
      youtubeUrl = await getYouTubeUrlFromSpotify(url);
    }

    const videoInfo = await playdl.video_info(youtubeUrl);
    songQueue.push({ url: youtubeUrl, title: videoInfo.video_details.title });

    if (player.state.status === AudioPlayerStatus.Idle) {
      await playNextSong(connection);
      const nowPlayingEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Now Playing')
        .setDescription(`**${videoInfo.video_details.title}**`);
      await message.reply({ embeds: [nowPlayingEmbed] });
    } else {
      const addedToQueueEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Song Added to Queue')
        .setDescription(`Your song has been added to the queue at position ${songQueue.length}.`);
      await message.reply({ embeds: [addedToQueueEmbed] });
    }
  } catch (error) {
    console.error('Error fetching video info:', error);
    await handleError(message, 'There was an error playing the song.');
  }
}

function displayQueue(message) {
  if (songQueue.length === 0) {
    const emptyQueueEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Current Queue')
      .setDescription('The queue is currently empty.');
    message.reply({ embeds: [emptyQueueEmbed] });
  } else {
    const queueMessage = songQueue.map((song, index) => `${index + 1}. **${song.title}**`).join('\n');
    const queueEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Current Queue')
      .setDescription(queueMessage);
    message.reply({ embeds: [queueEmbed] });
  }
}

async function playNextSong(connection) {
  if (songQueue.length > 0) {
    const nextSong = songQueue.shift();
    const videoInfo = await playdl.video_info(nextSong.url);
    await playAudio(connection, nextSong.url, videoInfo).catch(error => {
      console.error('Error playing next song:', error);
      handleError(message, 'An error occurred while playing the next song.');
    });
  } else {
    connection.destroy();
  }
}

function createAudioPlayerAndSubscribe(connection) {
  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log('Audio player is idle.');
    playNextSong(connection);
  });

  player.on('error', (error) => {
    console.error('Player error:', error.message);
    handleError(message, 'An error occurred during playback.');
    player.stop(true);
    connection.destroy();
  });

  connection.subscribe(player);
}

async function handleError(message, errorMessage) {
  const errorEmbed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('Error')
    .setDescription(errorMessage);
  await message.reply({ embeds: [errorEmbed] });
}

module.exports = {
  addSongToQueue,
  playNextSong,
  handleError,
  songQueue,
  playAudio,
  getYouTubeUrlFromSpotify,
  displayQueue,
  createAudioPlayerAndSubscribe,
};
