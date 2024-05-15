const ytdl = require('ytdl-core');
const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  NoSubscriberBehavior, 
  VoiceConnectionStatus 
} = require('@discordjs/voice');
const prism = require('prism-media');

let songQueue = [];

async function playAudio(connection, url) {
  const stream = ytdl(url, { 
    filter: 'audioonly', 
    highWaterMark: 1 << 25,
    quality: 'highestaudio',
    liveBuffer: 20000 
  }).pipe(new prism.FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-acodec', 'libopus',
      '-f', 'opus',
      '-ar', '48000',
      '-ac', '2',
    ],
  }));

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
    player.stop(true);
    connection.destroy();
  });

  connection.on('error', (error) => {
    console.error('Connection error:', error.message);
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

async function addSongToQueue(message, connection, url, isFirstSong = false) {
  try {
    const videoInfo = await ytdl.getInfo(url);
    if (isFirstSong) {
      await playAudio(connection, url);
      await message.reply(`Playing your song: **${videoInfo.videoDetails.title}**!`);
    } else {
      songQueue.push({ url, title: videoInfo.videoDetails.title });
      if (songQueue.length === 1) {
        await playAudio(connection, url);
        await message.reply(`Playing your song: **${videoInfo.videoDetails.title}**!`);
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
    playAudio(connection, nextSong.url);
  } else {
    console.log('Queue is empty, leaving voice channel.');
    connection.destroy();
  }
}

function displayQueue(message) {
  if (songQueue.length === 0) {
    return message.reply('The queue is currently empty.');
  }

  const queueList = songQueue.map((song, index) => `${index + 1}. ${song.title}`);
  const queueEmbed = {
    color: 0x0099ff,
    title: 'Song Queue',
    description: queueList.join('\n'),
  };

  message.reply({ embeds: [queueEmbed] });
}

async function handleError(message, errorMessage) {
  await message.reply(errorMessage);
}

module.exports = { playAudio, handleError, addSongToQueue, displayQueue, songQueue, playNextSong };
