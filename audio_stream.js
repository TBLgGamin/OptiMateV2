const ytdl = require('ytdl-core-discord');
const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  NoSubscriberBehavior, 
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const playdl = require('play-dl');
const { getData } = require('spotify-url-info')(fetch);

let songQueue = [];
let votes = {};
let player;

async function playAudio(connection, url, videoInfo, player) {
  const stream = await ytdl(url, { 
    filter: 'audioonly', 
    highWaterMark: 1 << 25,
    quality: 'highestaudio',
    liveBuffer: 30000
  });

  const duration = videoInfo.video_details.durationInSec || parseInt(videoInfo.video_details.lengthSeconds, 10) || 0;

  const resource = createAudioResource(stream, { 
    inputType: stream.type,
    inlineVolume: true,
    metadata: { 
      title: videoInfo.video_details.title, 
      duration: duration
    }
  });

  player.play(resource);
}

async function getYouTubeUrlFromSpotify(spotifyUrl) {
  try {
    const spotifyInfo = await getData(spotifyUrl);
    console.log('Spotify Info:', spotifyInfo); // Log the Spotify info

    const trackName = spotifyInfo.title || spotifyInfo.name;
    const artistName = spotifyInfo.subtitle || (spotifyInfo.artists && spotifyInfo.artists[0] && spotifyInfo.artists[0].name);

    if (trackName && artistName) {
      const searchQuery = `${trackName} ${artistName}`;
      console.log('Search Query:', searchQuery); // Log the search query

      const searchResults = await playdl.search(searchQuery, { limit: 5 });
      console.log('Search Results:', searchResults); // Log search results for debugging

      if (searchResults && searchResults.length > 0) {
        return searchResults[0].url;
      } else {
        throw new Error('No video found for the provided Spotify track.');
      }
    } else {
      throw new Error('Spotify track does not have complete information.');
    }
  } catch (error) {
    console.error('Error in getYouTubeUrlFromSpotify:', error);
    throw error;
  }
}



async function getRelatedSongs(currentSongId) {
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
  try {
    let youtubeUrl = url;
    if (url.includes('spotify.com')) {
      youtubeUrl = await getYouTubeUrlFromSpotify(url);
    }

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
  } catch (error) {
    console.error('Error fetching video info:', error);
    await handleError(message, 'There was an error playing the song.');
  }
}

async function getSpotifyPlaylistTracks(playlistUrl) {
  try {
    const { data } = await axios.get(playlistUrl);
    const $ = cheerio.load(data);
    const trackUrls = [];

    $('a[href*="spotify:track"]').each((i, element) => {
      const trackUri = $(element).attr('href');
      const trackUrl = `https://open.spotify.com/track/${trackUri.split(':').pop()}`;
      trackUrls.push(trackUrl);
    });

    console.log('Extracted Track URLs:', trackUrls);
    return trackUrls;
  } catch (error) {
    console.error('Error fetching Spotify playlist tracks:', error);
    return [];
  }
}

async function addSpotifyPlaylistToQueue(message, connection, playlistUrl) {
  try {
    const trackUrls = await getSpotifyPlaylistTracks(playlistUrl);
    console.log('Track URLs:', trackUrls);

    if (trackUrls.length === 0) {
      throw new Error('No tracks found in the Spotify playlist.');
    }

    songQueue.push(...trackUrls);

    const audioUrl = songQueue[0];
    if (audioUrl) {
      await addSongToQueue(message, connection, audioUrl);
    } else {
      await handleError(message, 'No valid audio URL found to play.');
    }

    const addedToQueueEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Playlist Added to Queue')
      .setDescription(`Your playlist has been added to the queue with ${trackUrls.length} songs.`);
    await message.reply({ embeds: [addedToQueueEmbed] });
  } catch (error) {
    console.error('Error fetching playlist info:', error);
    await handleError(message, 'There was an error adding the playlist to the queue.');
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

function voteForNextSong(message, songIndex) {
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
  return voteCounts.indexOf(Math.max(...voteCounts));
}

async function playNextSong(connection, message) {
  if (songQueue.length > 0) {
    const nextSongIndex = getNextSongIndexByVotes();
    const nextSong = songQueue.splice(nextSongIndex, 1)[0];
    const videoInfo = await playdl.video_info(nextSong.url);
    await playAudio(connection, nextSong.url, videoInfo, player).catch(error => {
      console.error('Error playing next song:', error);
      handleError(message, 'An error occurred while playing the next song.');
    });
    votes = {};
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
    handleError(null, 'An error occurred during playback.');
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
  if (message) {
    await message.reply({ embeds: [errorEmbed] });
  }
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
  getRelatedSongs,
  addSpotifyPlaylistToQueue,
};