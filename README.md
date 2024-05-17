# OptiMateV2 Discord Bot

OptiMateV2 is a Discord bot designed to play high-quality audio from YouTube/Spotify in your Discord voice channels. It includes commands to play, queue, stop, and manage playback of audio tracks.

## Features

- **Play Audio**: Play audio from a YouTube URL.
- **Queue Management**: Add songs to a queue and view the current queue.
- **Playback Control**: Pause, resume, stop, and force play songs.
- **Help Command**: Provides detailed information on how to use the bot.

## Commands

### !play <url>
Plays the audio from the provided YouTube/Spotify URL. If a song is already playing, it adds the song to the queue.

### !q
Displays the current song queue.

### !stop
Stops the current song and clears the queue.

### !force <url>
Forces the bot to stop the current song and play the audio from the provided YouTube URL immediately.

### !pause
Pauses the current song.

### !play
Resumes the paused song.

### !helpme
Displays a list of available commands and their descriptions.

## Installation

Run install.js to install all the required dependencies and packages for the bot to run.
*Navigate to powershell as administrator*
    ```bash
    git clone https://github.com/TBLgGamin/OptiMateV2
    cd OptiMateV2
    node install.js
    ```
If that doesnt work you can use the manual install method as listed below:

1. Clone the repository:
    ```bash
    git clone https://github.com/TBLgGamin/OptiMateV2
    cd OptiMateV2
    ```

2. Install the required dependencies:
    ```bash
    npm install discord.js @discordjs/voice ytdl-core prism-media dotenv spotify-url-info@latest play-dl @discordjs/opus opusscript
    ```
3 Install the required dependencies 2:
    ```bash
    npm install opusscript
    ```

*After you've installed the dependencies head to windows powershell as administrator*

4. Install Node.js:
    https://nodejs.org/en

5. Install FFMpeg:
    ```bash
    choco install ffmpeg-full
    ```
6. Install Visual studio:
    ```bash
    choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --locale en-US"
    ```

7. Edit the `.env.copy` file in the project directory and add your Discord bot token:
    ```env
    OptiMateV2Token=YOUR_DISCORD_BOT_TOKEN
    ```
    Rename the file to .env

## Usage

1. Start the bot:
    ```bash
    cd OptiMateV2
    node bot.js
    ```

2. Invite the bot to your Discord server using the OAuth2 URL from the Discord Developer Portal.

3. Use the commands listed above to interact with the bot in your Discord server.

## Project Structure

- `bot.js`: The main bot script that handles message events and commands.
- `audio_stream.js`: Handles audio streaming and queue management.
- `command_handler.js`: Contains functions for stop, force play, and pause/resume commands.
- `helpme.js`: Provides the help command implementation.
- `.env`: Stores the bot token securely (not included in the repository).

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit them (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [discord.js](https://discord.js.org) - A powerful JavaScript library for interacting with the Discord API.
- [@discordjs/voice](https://github.com/discordjs/voice) - A library for handling audio in Discord voice channels.
- [ytdl-core](https://github.com/fent/node-ytdl-core) - YouTube video downloader in pure JavaScript.

## Contact

For any questions or feedback, please open an issue on the repository or contact the project maintainer at tblthe1st@gmail.com
