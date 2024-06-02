const { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const playdl = require('play-dl');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
require('dotenv').config();
const { Readable } = require('stream');


const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
let songQueue = [];
let votes = {};
let player;
let prefetching = false;

function logDebug(message, ...args) {
  if (process.env.LOGGING === 'DEBUG') {
    console.log(message, ...args);
  }
}

async function playAudio(connection, url, videoInfo) {
  try {
    logDebug('playAudio: Starting audio playback', url);
    const cachedStreamData = cache.get(url);
    let stream;
    let resource;

    if (cachedStreamData) {
      stream = Readable.from(cachedStreamData.buffer);
      logDebug('playAudio: Using cached stream');
      resource = createAudioResource(stream, {
        inputType: cachedStreamData.type,
        inlineVolume: true,
        metadata: { title: videoInfo.video_details.title, duration: cachedStreamData.duration }
      });
    } else {
      const freshStream = await playdl.stream(url, { quality: 2, highWaterMark: 1 << 25 });
      const chunks = [];
      freshStream.stream.on('data', (chunk) => chunks.push(chunk));
      freshStream.stream.on('end', () => {
        cache.set(url, { buffer: Buffer.concat(chunks), type: freshStream.type, duration: videoInfo.video_details.durationInSec || parseInt(videoInfo.video_details.lengthSeconds, 10) || 0 });
        logDebug('playAudio: Stream cached');
      });
      resource = createAudioResource(freshStream.stream, {
        inputType: freshStream.type,
        inlineVolume: true,
        metadata: { title: videoInfo.video_details.title, duration: videoInfo.video_details.durationInSec || parseInt(videoInfo.video_details.lengthSeconds, 10) || 0 }
      });
    }

    player.play(resource);
    logDebug('playAudio: Audio playback started successfully');
  } catch (error) {
    console.error('Error playing audio:', error);
    handleError(null, 'An error occurred during playback.');
  }
}

async function prefetchNextSong() {
  if (!prefetching && songQueue.length > 1) {
    prefetching = true;
    const nextSong = songQueue[1];
    logDebug('prefetchNextSong: Prefetching next song', nextSong);
    try {
      await playdl.video_info(nextSong.url);
      logDebug('prefetchNextSong: Prefetching successful');
    } catch (error) {
      console.error('Error prefetching next song:', error);
    }
    prefetching = false;
  }
}

async function getYouTubeUrlFromSpotify(spotifyUrl) {
  logDebug('getYouTubeUrlFromSpotify: Fetching YouTube URL for', spotifyUrl);
  try {
    const cachedUrl = cache.get(spotifyUrl);
    if (cachedUrl) {
      logDebug('getYouTubeUrlFromSpotify: Using cached URL');
      return cachedUrl;
    }

    const { data } = await axios.get(spotifyUrl);
    const $ = cheerio.load(data);
    const trackName = $('meta[property="og:title"]').attr('content');
    const artistName = $('meta[property="og:description"]').attr('content').split(' • ')[0];

    if (trackName && artistName) {
      const searchQuery = `${trackName} ${artistName}`;
      logDebug(`getYouTubeUrlFromSpotify: Search query: ${searchQuery}`);
      const searchResults = await playdl.search(searchQuery, { limit: 1 });
      if (searchResults.length > 0) {
        const youtubeUrl = searchResults[0].url;
        cache.set(spotifyUrl, youtubeUrl);
        logDebug('getYouTubeUrlFromSpotify: Found and cached YouTube URL', youtubeUrl);
        return youtubeUrl;
      }
      throw new Error('No video found for the provided Spotify track.');
    }
    throw new Error('Spotify track does not have complete information.');
  } catch (error) {
    console.error('Error in getYouTubeUrlFromSpotify:', error);
    throw error;
  }
}

async function getRelatedSongs(currentSongId) {
  logDebug('getRelatedSongs: Fetching related songs for', currentSongId);
  try {
    const videoInfo = await playdl.video_info(`https://www.youtube.com/watch?v=${currentSongId}`);
    const searchQuery = `${videoInfo.video_details.title} ${videoInfo.video_details.channel.name} -${videoInfo.video_details.title}`;
    const searchResults = await playdl.search(searchQuery, { limit: 5 });

    return searchResults.map(result => ({
      url: result.url,
      title: result.title,
      id: result.id
    }));
  } catch (error) {
    console.error('Error fetching related songs:', error);
    return [];
  }
}

async function addSongToQueue(message, connection, url) {
  logDebug('addSongToQueue: Adding song to queue', url);
  try {
    let youtubeUrl = url.includes('spotify.com') ? await getYouTubeUrlFromSpotify(url) : url;
    logDebug('addSongToQueue: YouTube URL resolved to', youtubeUrl);
    const videoInfo = await playdl.video_info(youtubeUrl);
    songQueue.push({ url: youtubeUrl, title: videoInfo.video_details.title });

    if (player.state.status === AudioPlayerStatus.Idle) {
      await playNextSong(connection, message);
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
    await prefetchNextSong();
  } catch (error) {
    console.error('Error fetching video info:', error);
    await handleError(message, 'There was an error playing the song.');
  }
}

function displayQueue(message) {
  logDebug('displayQueue: Displaying current queue');
  const description = songQueue.length === 0 
    ? 'The queue is currently empty.' 
    : songQueue.map((song, index) => `${index + 1}. **${song.title}**`).join('\n');

  const queueEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Current Queue')
    .setDescription(description);

  message.reply({ embeds: [queueEmbed] });
}

function voteForNextSong(message, songIndex) {
  logDebug('voteForNextSong: Voting for song', songIndex);
  const index = parseInt(songIndex, 10) - 1;
  const userId = message.author.id;

  if (!votes[userId]) {
    votes[userId] = index;
    message.reply(`You voted for song ${index + 1}.`);
  } else {
    message.reply('You have already voted.');
  }
}

function getNextSongIndexByVotes() {
  const voteCounts = songQueue.map((_, index) => Object.values(votes).filter(vote => vote === index).length);
  logDebug('getNextSongIndexByVotes: Vote counts', voteCounts);
  return voteCounts.indexOf(Math.max(...voteCounts));
}

async function playNextSong(connection, message) {
  logDebug('playNextSong: Playing next song');
  if (songQueue.length > 0) {
    const nextSongIndex = getNextSongIndexByVotes();
    const nextSong = songQueue.splice(nextSongIndex, 1)[0];
    const videoInfo = await playdl.video_info(nextSong.url);
    await playAudio(connection, nextSong.url, videoInfo);
    votes = {};
    await prefetchNextSong();
  } else {
    connection.destroy();
    logDebug('playNextSong: Queue is empty, destroyed connection');
  }
}

function createAudioPlayerAndSubscribe(connection) {
  logDebug('createAudioPlayerAndSubscribe: Creating audio player and subscribing');
  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  player.on(AudioPlayerStatus.Idle, () => playNextSong(connection));
  player.on('error', (error) => {
    console.error('Player error:', error.message);
    handleError(null, 'An error occurred during playback.');
    player.stop(true);
    connection.destroy();
  });

  connection.subscribe(player);
}

async function handleError(message, errorMessage) {
  logDebug('handleError: Handling error', errorMessage);
  const errorEmbed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('Error')
    .setDescription(errorMessage);
  if (message) await message.reply({ embeds: [errorEmbed] });
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
  voteForNextSong,
  getRelatedSongs
};