# YouTube Video Downloader - Quick Reference

## 🎯 Purpose
Download YouTube videos, playlists, or entire channels for offline viewing using yt-dlp.

## 📥 Installation

The script will auto-install yt-dlp if not found. Manual installation:

```powershell
# Option 1: winget (recommended)
winget install yt-dlp

# Option 2: Chocolatey
choco install yt-dlp -y

# Option 3: pip
pip install yt-dlp
```

## 🚀 Usage Examples

### 1. Download Entire Channel

```powershell
cd d:\matrix-delivery\scripts
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@freeCodeCamp"
```

**Perfect for**:
- freeCodeCamp (programming tutorials)
- Traversy Media (web development)
- Academind (in-depth courses)
- The Net Ninja (JavaScript, React)

### 2. Download Playlist

```powershell
.\download-youtube-videos.ps1 -Mode playlist -Url "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

**Perfect for**:
- Course playlists
- Tutorial series
- Conference talks

### 3. Download from URL List

Create a text file `videos.txt`:
```
https://www.youtube.com/watch?v=VIDEO_ID_1
https://www.youtube.com/watch?v=VIDEO_ID_2
https://www.youtube.com/watch?v=VIDEO_ID_3
```

Then run:
```powershell
.\download-youtube-videos.ps1 -Mode list -ListFile "videos.txt"
```

### 4. Download Single Video

```powershell
.\download-youtube-videos.ps1 -Mode single -Url "https://www.youtube.com/watch?v=VIDEO_ID"
```

## 🎬 Quality Options

```powershell
# Best quality (default)
-Quality best

# 1080p
-Quality 1080p

# 720p
-Quality 720p

# 480p (smaller files)
-Quality 480p

# Audio only (podcasts, music)
-Quality audio-only
```

## 📁 Custom Output Directory

```powershell
# Default: ~/youtube-downloads
.\download-youtube-videos.ps1 -Mode channel -Url "URL" -OutputDir "D:\Learning\Videos"
```

## 🎓 Recommended Channels for Matrix Delivery Learning

### Security
```powershell
# OWASP
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@OWASPGLOBAL"

# LiveOverflow (Security)
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@LiveOverflow"
```

### Node.js & JavaScript
```powershell
# freeCodeCamp
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@freecodecamp"

# Traversy Media
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@TraversyMedia"

# Fireship
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@Fireship"
```

### React & Frontend
```powershell
# The Net Ninja
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@NetNinja"

# Academind
.\download-youtube-videos.ps1 -Mode channel -Url "https://www.youtube.com/@academind"
```

### Testing
```powershell
# Cucumber School
.\download-youtube-videos.ps1 -Mode playlist -Url "https://www.youtube.com/playlist?list=PLhW3qG5bs-L9sJKoT1LC5grGT77sfW0Z8"
```

## 📊 Features

✅ **Auto-install** yt-dlp if not found  
✅ **Resume downloads** (won't re-download existing files)  
✅ **Download archive** (tracks downloaded videos)  
✅ **Embed metadata** (title, description, thumbnail)  
✅ **Subtitles** (auto-download English subs)  
✅ **Quality selection** (best, 1080p, 720p, 480p, audio-only)  
✅ **Organized output** (by channel/playlist/title)  
✅ **Error handling** (continues on failed videos)

## 🎯 Pro Tips

### 1. Download for Offline Study Plan

```powershell
# Create learning directory
New-Item -ItemType Directory -Force -Path "D:\Learning\Videos"

# Download freeCodeCamp Node.js course
.\download-youtube-videos.ps1 -Mode single `
    -Url "https://www.youtube.com/watch?v=Oe421EPjeBE" `
    -OutputDir "D:\Learning\Videos\Node.js" `
    -Quality 720p
```

### 2. Batch Download Multiple Courses

Create `courses.txt`:
```
https://www.youtube.com/watch?v=Jv2uxzhPFl4  # TDD Course
https://www.youtube.com/watch?v=7r4xVDI2vho  # Jest Crash Course
https://www.youtube.com/watch?v=rWHvp7rUka8  # OWASP Top 10
```

```powershell
.\download-youtube-videos.ps1 -Mode list -ListFile "courses.txt" -Quality 720p
```

### 3. Download Audio-Only for Podcasts

```powershell
.\download-youtube-videos.ps1 -Mode playlist `
    -Url "PODCAST_PLAYLIST_URL" `
    -Quality audio-only `
    -OutputDir "D:\Learning\Podcasts"
```

## 🔧 Advanced Options

### Download with Custom Format

Edit the script to add custom yt-dlp options:
```powershell
$args = @(
    '--format', 'bestvideo[height<=720]+bestaudio',
    '--output', '%(title)s.%(ext)s',
    '--write-subs',
    '--sub-format', 'srt',
    '--convert-subs', 'srt',
    # Add more options here
    $url
)
```

### Speed Limit (Don't Saturate Bandwidth)

Add to yt-dlp args:
```powershell
'--limit-rate', '5M'  # Limit to 5 MB/s
```

### Download Only Recent Videos

```powershell
'--dateafter', '20231201'  # Only videos after Dec 1, 2023
```

## 📝 Output Structure

```
~/youtube-downloads/
├── freeCodeCamp/
│   ├── Node.js Full Course.mp4
│   ├── Node.js Full Course.description
│   ├── Node.js Full Course.info.json
│   └── Node.js Full Course.jpg
├── Traversy Media/
│   └── ...
└── downloaded.txt  # Archive of downloaded videos
```

## ⚠️ Important Notes

1. **Copyright**: Only download videos you have permission to download
2. **Storage**: Videos can be large (1-5 GB each for courses)
3. **Time**: Channel downloads can take hours/days
4. **Network**: Use good internet connection
5. **Resume**: Script supports resuming interrupted downloads

## 🎓 Integration with Study Plan

Add to your `INTENSIVE_STUDY_PLAN.md`:

**Evening Study** (Optional 1h):
```powershell
# Download tomorrow's videos tonight
.\download-youtube-videos.ps1 -Mode list -ListFile "week1-videos.txt"
```

Create weekly video lists:
- `week1-videos.txt` - Security & BDD
- `week2-videos.txt` - Architecture & Patterns
- `week3-videos.txt` - Startup & Business

## 🚀 Quick Start

```powershell
# 1. Navigate to scripts
cd d:\matrix-delivery\scripts

# 2. Download a single course
.\download-youtube-videos.ps1 -Mode single `
    -Url "https://www.youtube.com/watch?v=VIDEO_ID" `
    -Quality 720p

# 3. Check output
explorer ~/youtube-downloads
```

## 📚 Recommended Downloads for Matrix Delivery

### Week 1: Security
- OWASP Top 10 Explained (1h)
- Web Security by Stanford CS 253 (full course)
- Node.js Security Best Practices

### Week 2: Testing
- Cucumber BDD Tutorial (3h playlist)
- Jest Crash Course (1h)
- TDD with Node.js (2h)

### Week 3: Architecture
- System Design Interview Prep (playlist)
- Microservices Architecture (full course)
- Database Design (full course)

---

**Script Location**: `d:\matrix-delivery\scripts\download-youtube-videos.ps1`  
**Documentation**: This file  
**Support**: yt-dlp documentation at https://github.com/yt-dlp/yt-dlp
