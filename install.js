const { exec } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

const commands = [
  'npm install discord.js @discordjs/voice ytdl-core prism-media dotenv spotify-url-info@latest play-dl @discordjs/opus opusscript axios cheerio node-cache',
  isWindows ? 'choco install ffmpeg-full' : 'sudo apt-get install ffmpeg',
  isWindows ? 'choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --locale en-US"' : 'sudo apt-get install build-essential',
  'npm install opusscript'
];

commands.forEach(command => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${command}\n${error}`);
      return;
    }
    console.log(`Output for command: ${command}\n${stdout}`);
    if (stderr) {
      console.error(`Error output for command: ${command}\n${stderr}`);
    }
  });
});