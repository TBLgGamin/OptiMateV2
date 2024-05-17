const ytdl = require('ytdl-core-discord');
const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  NoSubscriberBehavior, 
  VoiceConnectionStatus 
} = require('@discordjs/voice');
const prism = require('prism-media');
const spdl = require('spotify-url-info');
const playdl = require('play-dl');
const { getData } = require('spotify-url-info')(fetch);

let songQueue = [];

async function playAudio(connection, url) {
  const stream = await ytdl(url, { 
    filter: 'audioonly', 
    highWaterMark: 1 << 25,
    quality: 'highestaudio',
    liveBuffer: 30000
  });

  const resource = createAudioResource(stream, { inlineVolume: true });

  const player = createAudioPlayer({
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

  connection.on('error', (error) => {
    console.error('Connection error:', error.message);
    handleError(message, 'An error occurred with the voice connection.');
    player.stop(true);
    connection.destroy();
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    console.log('Connection destroyed. Cleaning up player.');
    if (player.state.status !== AudioPlayerStatus.Idle) {
      player.stop(true);
    }
  });

  connection.subscribe(player);
  player.play(resource);

  return player;
}

async function getYouTubeUrlFromSpotify(spotifyUrl) {
  const spotifyInfo = await getData(spotifyUrl);
  const searchQuery = `${spotifyInfo.name} ${spotifyInfo.artists[0].name}`;
  const searchResults = await playdl.search(searchQuery, { limit: 1 });
  return searchResults[0].url;
}

async function addSongToQueue(message, connection, url, isFirstSong = false) {
  try {
    let youtubeUrl = url;
    if (url.includes('spotify.com')) {
      youtubeUrl = await getYouTubeUrlFromSpotify(url);
    }
    
    const videoInfo = await playdl.video_info(youtubeUrl);
    if (isFirstSong) {
      await playAudio(connection, youtubeUrl);
      await message.reply(`Playing your song: **${videoInfo.video_details.title}**!`);
    } else {
      songQueue.push({ url: youtubeUrl, title: videoInfo.video_details.title });
      if (songQueue.length === 1) {
        await playAudio(connection, youtubeUrl);
        await message.reply(`Playing your song: **${videoInfo.video_details.title}**!`);
      } else {
        await message.reply(`Your song has been added to the queue at position ${songQueue.length - 1}.`);
      }
    }
  } catch (error) {
    console.error('Error fetching video info:', error);
    await handleError(message, 'There was an error playing the song.');
  }
}

function playNextSong(connection) {
  if (songQueue.length > 0) {
    const nextSong = songQueue.shift();
    playAudio(connection, nextSong.url).catch(error => {
      console.error('Error playing next song:', error);
      handleError(message, 'An error occurred while playing the next song.');
    });
  } else {
    connection.destroy();
  }
}

async function handleError(message, errorMessage) {
  await message.reply(errorMessage);
}

module.exports = {
  addSongToQueue,
  playNextSong,
  handleError,
  songQueue,
  playAudio,
  getYouTubeUrlFromSpotify,
};