# YouTube Video Downloader Script
# Downloads entire channels or individual videos using yt-dlp

<#
.SYNOPSIS
    Download YouTube videos or entire channels for offline viewing

.DESCRIPTION
    This script uses yt-dlp (improved youtube-dl) to download:
    - Entire YouTube channels
    - Playlists
    - Individual videos from a list
    - Single videos

.PARAMETER Mode
    'channel' - Download entire channel
    'playlist' - Download playlist
    'list' - Download from URL list file
    'single' - Download single video

.PARAMETER Url
    YouTube channel/playlist/video URL

.PARAMETER ListFile
    Path to text file containing video URLs (one per line)

.PARAMETER OutputDir
    Directory to save downloaded videos (default: ~/youtube-downloads)

.PARAMETER Quality
    Video quality: 'best', '1080p', '720p', '480p', 'audio-only'

.EXAMPLE
    .\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@freeCodeCamp"

.EXAMPLE
    .\download-youtube-videos.ps1 -Mode list -ListFile "videos.txt"

.EXAMPLE
    .\download-youtube-videos.ps1 -Mode single -Url "https://www.youtube.com/watch?v=VIDEO_ID" -Quality 1080p
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('channel', 'playlist', 'list', 'single')]
    [string]$Mode,

    [Parameter(Mandatory = $false)]
    [string]$Url,

    [Parameter(Mandatory = $false)]
    [string]$ListFile,

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "$HOME\youtube-downloads",

    [Parameter(Mandatory = $false)]
    [ValidateSet('best', '1080p', '720p', '480p', 'audio-only')]
    [string]$Quality = 'best'
)

# Color output functions
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }

# Check if yt-dlp is installed
function Test-YtDlp {
    try {
        $null = yt-dlp --version
        return $true
    }
    catch {
        return $false
    }
}

# Install yt-dlp
function Install-YtDlp {
    Write-Info "Installing yt-dlp..."
    
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Info "Installing via winget..."
        winget install yt-dlp
    }
    elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Info "Installing via chocolatey..."
        choco install yt-dlp -y
    }
    else {
        Write-Info "Installing via pip..."
        python -m pip install --upgrade yt-dlp
    }
    
    if (Test-YtDlp) {
        Write-Success "✓ yt-dlp installed successfully!"
    }
    else {
        Write-Error "Failed to install yt-dlp. Please install manually:"
        Write-Info "  Option 1: winget install yt-dlp"
        Write-Info "  Option 2: choco install yt-dlp"
        Write-Info "  Option 3: pip install yt-dlp"
        exit 1
    }
}

# Get quality format string
function Get-QualityFormat {
    param([string]$quality)
    
    switch ($quality) {
        'best' { return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' }
        '1080p' { return 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]' }
        '720p' { return 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]' }
        '480p' { return 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]' }
        'audio-only' { return 'bestaudio[ext=m4a]/bestaudio' }
        default { return 'best' }
    }
}

# Download channel
function Download-Channel {
    param([string]$channelUrl, [string]$outputDir, [string]$quality)
    
    Write-Info "`n📺 Downloading entire channel: $channelUrl"
    Write-Info "Output directory: $outputDir"
    Write-Info "Quality: $quality`n"
    
    $format = Get-QualityFormat $quality
    
    $args = @(
        '--format', $format,
        '--output', "$outputDir/%(uploader)s/%(playlist)s/%(title)s.%(ext)s",
        '--write-description',
        '--write-info-json',
        '--write-thumbnail',
        '--embed-thumbnail',
        '--embed-metadata',
        '--embed-subs',
        '--sub-langs', 'en',
        '--ignore-errors',
        '--no-overwrites',
        '--download-archive', "$outputDir/downloaded.txt",
        $channelUrl
    )
    
    yt-dlp @args
}

# Download playlist
function Download-Playlist {
    param([string]$playlistUrl, [string]$outputDir, [string]$quality)
    
    Write-Info "`n📋 Downloading playlist: $playlistUrl"
    Write-Info "Output directory: $outputDir"
    Write-Info "Quality: $quality`n"
    
    $format = Get-QualityFormat $quality
    
    $args = @(
        '--format', $format,
        '--output', "$outputDir/%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s",
        '--write-description',
        '--write-thumbnail',
        '--embed-thumbnail',
        '--embed-metadata',
        '--ignore-errors',
        '--no-overwrites',
        $playlistUrl
    )
    
    yt-dlp @args
}

# Download from list
function Download-FromList {
    param([string]$listFile, [string]$outputDir, [string]$quality)
    
    if (-not (Test-Path $listFile)) {
        Write-Error "List file not found: $listFile"
        exit 1
    }
    
    $urls = Get-Content $listFile | Where-Object { $_ -match '^https?://' }
    $count = $urls.Count
    
    Write-Info "`n📝 Downloading $count videos from list: $listFile"
    Write-Info "Output directory: $outputDir"
    Write-Info "Quality: $quality`n"
    
    $format = Get-QualityFormat $quality
    
    $i = 0
    foreach ($url in $urls) {
        $i++
        Write-Info "[$i/$count] Downloading: $url"
        
        $args = @(
            '--format', $format,
            '--output', "$outputDir/%(title)s.%(ext)s",
            '--write-description',
            '--write-thumbnail',
            '--embed-thumbnail',
            '--embed-metadata',
            '--ignore-errors',
            '--no-overwrites',
            $url
        )
        
        yt-dlp @args
    }
}

# Download single video
function Download-Single {
    param([string]$videoUrl, [string]$outputDir, [string]$quality)
    
    Write-Info "`n🎬 Downloading video: $videoUrl"
    Write-Info "Output directory: $outputDir"
    Write-Info "Quality: $quality`n"
    
    $format = Get-QualityFormat $quality
    
    $args = @(
        '--format', $format,
        '--output', "$outputDir/%(title)s.%(ext)s",
        '--write-description',
        '--write-thumbnail',
        '--embed-thumbnail',
        '--embed-metadata',
        '--embed-subs',
        '--sub-langs', 'en',
        $videoUrl
    )
    
    yt-dlp @args
}

# Main execution
Write-Info "═══════════════════════════════════════════════════════"
Write-Info "       YouTube Video Downloader (yt-dlp)"
Write-Info "═══════════════════════════════════════════════════════`n"

# Check/Install yt-dlp
if (-not (Test-YtDlp)) {
    Write-Warning "yt-dlp not found. Installing..."
    Install-YtDlp
}
else {
    Write-Success "✓ yt-dlp is installed"
}

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Write-Success "✓ Output directory: $OutputDir`n"

# Execute based on mode
try {
    switch ($Mode) {
        'channel' {
            if (-not $Url) {
                Write-Error "Channel URL is required for channel mode"
                exit 1
            }
            Download-Channel -channelUrl $Url -outputDir $OutputDir -quality $Quality
        }
        'playlist' {
            if (-not $Url) {
                Write-Error "Playlist URL is required for playlist mode"
                exit 1
            }
            Download-Playlist -playlistUrl $Url -outputDir $OutputDir -quality $Quality
        }
        'list' {
            if (-not $ListFile) {
                Write-Error "List file is required for list mode"
                exit 1
            }
            Download-FromList -listFile $ListFile -outputDir $OutputDir -quality $Quality
        }
        'single' {
            if (-not $Url) {
                Write-Error "Video URL is required for single mode"
                exit 1
            }
            Download-Single -videoUrl $Url -outputDir $OutputDir -quality $Quality
        }
    }
    
    Write-Success "`n✅ Download complete!"
    Write-Info "Videos saved to: $OutputDir"
    
}
catch {
    Write-Error "`n❌ Download failed: $_"
    exit 1
}
