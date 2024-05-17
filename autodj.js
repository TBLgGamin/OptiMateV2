const { getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const playdl = require('play-dl');
const { playAudio, handleError, getYouTubeUrlFromSpotify, getRelatedSongs } = require('./audio_stream');

let autoDJEnabled = false;
let player;
let lastPlayedSongId = null;

async function autodj(message, url) {
  autoDJEnabled = true;
  let connection = getVoiceConnection(message.guild.id);

  if (!connection) {
    const channel = message.member.voice.channel;
    if (!channel) {
      return message.reply('You need to join a voice channel first!');
    }
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log('Voice connection is ready.');
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log('Voice connection was disconnected.');
      connection.destroy();
    });

    connection.on('error', (error) => {
      console.error('Connection error:', error.message);
      connection.destroy();
    });

    player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    player.on(AudioPlayerStatus.Idle, async () => {
      console.log('Audio player is idle.');
      await playNextSongWithAutoDJ(connection, message);
    });

    player.on('error', (error) => {
      console.error('Player error:', error.message);
      handleError(message, 'An error occurred during playback.');
      player.stop(true);
      connection.destroy();
    });

    connection.subscribe(player);
  }

  try {
    let youtubeUrl = url;
    if (url.includes('spotify.com')) {
      youtubeUrl = await getYouTubeUrlFromSpotify(url);
    }

    const videoInfo = await playdl.video_info(youtubeUrl);

    lastPlayedSongId = videoInfo.video_details.id;

    await playAudio(connection, youtubeUrl, videoInfo, player);

    const nowPlayingEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Now Playing (AutoDJ)')
      .setDescription(`**${videoInfo.video_details.title}**`);
    await message.reply({ embeds: [nowPlayingEmbed] });
  } catch (error) {
    console.error('Error initializing AutoDJ:', error);
    autoDJEnabled = false;
    await handleError(message, 'There was an error initializing AutoDJ mode.');
  }
}

async function playNextSongWithAutoDJ(connection, message) {
    if (autoDJEnabled) {
      try {
        if (!lastPlayedSongId) {
          await handleError(message, 'No song has been played yet to fetch related songs.');
          connection.destroy();
          return;
        }
  
        const relatedSongs = await getRelatedSongs(lastPlayedSongId);
        if (relatedSongs.length > 0) {
          const filteredRelatedSongs = relatedSongs.filter(song => song.id !== lastPlayedSongId);
  
          if (filteredRelatedSongs.length > 0) {
            const relatedSong = filteredRelatedSongs[0];
            const videoInfo = await playdl.video_info(relatedSong.url);
  
            lastPlayedSongId = videoInfo.video_details.id;
  
            await playAudio(connection, relatedSong.url, videoInfo, player).catch(async (error) => {
              console.error('Error playing next song:', error);
              await handleError(message, 'An error occurred while playing the next song.');
            });
  
            const nowPlayingEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('Now Playing (AutoDJ)')
              .setDescription(`**${videoInfo.video_details.title}**`);
            await message.reply({ embeds: [nowPlayingEmbed] });
          } else {
            await handleError(message, 'No valid related songs found.');
            connection.destroy();
          }
        } else {
          await handleError(message, 'No related songs found.');
          connection.destroy();
        }
      } catch (error) {
        console.error('Error fetching related song:', error);
        await handleError(message, 'An error occurred while fetching related songs.');
        connection.destroy();
      }
    } else {
      connection.destroy();
    }
  }  

  function stopAutoDJ() {
    autoDJEnabled = false;
  }

module.exports = { autodj, stopAutoDJ };

