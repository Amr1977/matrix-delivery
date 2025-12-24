const { program } = require('commander');
const ytDlp = require('yt-dlp-exec');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper for colored logging
const log = {
    info: (msg) => console.log(chalk.cyan(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    warning: (msg) => console.log(chalk.yellow(msg)),
    error: (msg) => console.log(chalk.red(msg)),
    header: (msg) => console.log(chalk.bold.blue(`\n${msg}\n${'='.repeat(msg.length)}`))
};

// Check for dependencies
function checkDependencies() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        log.success('✓ ffmpeg is installed');
    } catch (e) {
        log.warning('⚠️  FFmpeg is not installed or not in PATH.');
        log.warning('   High quality (1080p+) downloads may fail or lack audio.');
        log.info('   Install it via: winget install Gyan.FFmpeg');
    }
}

// Get quality format string
function getQualityFormat(quality) {
    switch (quality) {
        case 'best': return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        case '1080p': return 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]';
        case '720p': return 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]';
        case '480p': return 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]';
        case 'audio-only': return 'bestaudio[ext=m4a]/bestaudio';
        default: return 'best';
    }
}

// Download logic
async function download(url, flags, outputDir) {
    const defaultFlags = {
        writeDescription: true,
        writeInfoJson: true,
        writeThumbnail: true,
        embedThumbnail: true,
        embedMetadata: true,
        embedSubs: true,
        subLangs: 'en',
        ignoreErrors: true,
        noOverwrites: true,
        ...flags
    };

    try {
        log.info(`Started downloading: ${url}`);
        await ytDlp(url, defaultFlags);
        log.success(`Completed: ${url}`);
    } catch (error) {
        log.error(`Failed to download ${url}: ${error.message}`);
    }
}

// Main CLI setup
program
    .name('youtube-downloader')
    .description('Download YouTube videos, playlists, or channels using yt-dlp')
    .version('1.0.0')
    .requiredOption('-m, --mode <mode>', 'Download mode: channel, playlist, list, single')
    .option('-u, --url <url>', 'YouTube URL (required for channel, playlist, single)')
    .option('-l, --list <file>', 'List file path (required for list mode)')
    .option('-o, --output <dir>', 'Output directory', path.join(process.env.USERPROFILE || process.env.HOME, 'youtube-downloads'))
    .option('-q, --quality <quality>', 'Video quality: best, 1080p, 720p, 480p, audio-only', 'best')
    .action(async (opts) => {
        log.header('YouTube Video Downloader (Node.js)');

        checkDependencies();

        // Ensure output dir exists
        if (!fs.existsSync(opts.output)) {
            fs.mkdirSync(opts.output, { recursive: true });
            log.success(`✓ Created output directory: ${opts.output}`);
        } else {
            log.info(`Output directory: ${opts.output}`);
        }

        const format = getQualityFormat(opts.quality);
        const baseOutput = opts.output;

        try {
            switch (opts.mode) {
                case 'channel':
                    if (!opts.url) throw new Error('URL is required for channel mode');
                    log.info(`\n📺 Downloading Channel: ${opts.url}`);
                    await download(opts.url, {
                        format,
                        output: `${baseOutput}/%(uploader)s/%(playlist)s/%(title)s.%(ext)s`,
                        downloadArchive: `${baseOutput}/downloaded.txt`
                    });
                    break;

                case 'playlist':
                    if (!opts.url) throw new Error('URL is required for playlist mode');
                    log.info(`\n📋 Downloading Playlist: ${opts.url}`);
                    await download(opts.url, {
                        format,
                        output: `${baseOutput}/%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s`
                    });
                    break;

                case 'single':
                    if (!opts.url) throw new Error('URL is required for single mode');
                    log.info(`\n🎬 Downloading Video: ${opts.url}`);
                    await download(opts.url, {
                        format,
                        output: `${baseOutput}/%(title)s.%(ext)s`
                    });
                    break;

                case 'list':
                    if (!opts.list) throw new Error('List file is required for list mode');
                    if (!fs.existsSync(opts.list)) throw new Error(`List file not found: ${opts.list}`);

                    const urls = fs.readFileSync(opts.list, 'utf8')
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.match(/^https?:\/\//));

                    log.info(`\n📝 Found ${urls.length} videos in list: ${opts.list}`);

                    for (const [i, url] of urls.entries()) {
                        log.info(`[${i + 1}/${urls.length}] Processing: ${url}`);
                        await download(url, {
                            format,
                            output: `${baseOutput}/%(title)s.%(ext)s`
                        });
                    }
                    break;

                default:
                    throw new Error(`Invalid mode: ${opts.mode}. Use: channel, playlist, list, single`);
            }

            log.success('\n✅ All tasks finished!');

        } catch (err) {
            log.error(`\n❌ Error: ${err.message}`);
            process.exit(1);
        }
    });

program.parse();
