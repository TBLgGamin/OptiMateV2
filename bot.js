require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const { handleError, addSongToQueue, displayQueue, songQueue, createAudioPlayerAndSubscribe } = require('./audio_stream');
const { stop, force, pauseOrResume, nowPlaying, skip} = require('./command_handler');
const { helpme } = require('./helpme');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!play')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url) {
      return handleError(message, 'Please provide a valid URL.');
    }

    const channel = message.member.voice.channel;
    if (!channel) {
      return message.reply('You need to join a voice channel first!');
    }

    try {
      let connection = getVoiceConnection(message.guild.id);
      if (!connection) {
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

        createAudioPlayerAndSubscribe(connection);
      }

      await addSongToQueue(message, connection, url);
    } catch (error) {
      console.error('Error creating the voice connection:', error);
      await handleError(message, 'There was an error connecting to the voice channel.');
    }
  } else if (message.content.startsWith('!q')) {
    displayQueue(message);
  } else if (message.content.startsWith('!stop')) {
    stop(message);
  } else if (message.content.startsWith('!force')) {
    const args = message.content.split(' ');
    const url = args[1];
    if (url) {
      force(message, url);
    } else {
      handleError(message, 'Please provide a valid URL.');
    }
  } else if (message.content.startsWith('!pause') || message.content.startsWith('!resume')) {
    pauseOrResume(message);
  } else if (message.content.startsWith('!helpme')) {
    helpme(message);
  } else if (message.content.startsWith('!np')) {
    nowPlaying(message);
  } else if (message.content.startsWith('!skip')) {
    skip(message);
  }
});

client.login(process.env.OptiMateV2Token);
