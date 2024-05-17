// install.js
const { exec } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

const commands = [
  'npm install discord.js @discordjs/voice ytdl-core prism-media dotenv spotify-url-info@latest play-dl @discordjs/opus opusscript',
  isWindows ? 'choco install ffmpeg-full' : 'sudo choco install ffmpeg-full',
  isWindows ? 'choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --locale en-US"' : 'sudo choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --locale en-US"',
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