# CapCut Auto Captions Desktop (Windows / Offline)

A modern Windows desktop video auto captioning application inspired by CapCut's automated subtitles. Powered by **faster-whisper** (Python) for fast local AI speech recognition with word-level timestamps, **FFmpeg** for high quality video subtitle burning, and **Electron + React + Tailwind CSS** for a CapCut-style dark user interface.

100% offline — no cloud servers, no account logins, and no paid API keys required.

---

## Features

- **Local Speech-to-Text**: Powered by `faster-whisper` running on CPU (`int8` quantization) or GPU (`cuda`).
- **Word-Level Timestamp Alignment**: Highlights each spoken word in sync with video audio.
- **CapCut Style Presets**:
  1. *CapCut Bold* (Classic heavy white text with thick black outline)
  2. *TikTok Viral Yellow* (High contrast yellow with pop shadow)
  3. *Neon Glow* (Electric cyan with glowing pink drop shadow)
  4. *Minimal Dark Box* (Clean text inside rounded semi-transparent pill box)
  5. *Karaoke Wave* (Dynamic word highlight rhythm)
  6. *Cinematic Serif* (Documentary editorial serif font)
- **Word-by-Word Pop Effect**: Active word scales up slightly and changes color in real-time.
- **Transcript Editor**:
  - Edit start/end timestamps and caption text
  - Split caption at playhead position
  - Merge adjacent captions
  - Delete unwanted captions
  - Click any row to jump video playhead to that exact timestamp
- **Words-per-Caption Slider**: Re-group transcript into 1-10 word chunks on the fly.
- **Remove Silences**: Automatically detects silent gaps (> 0.5s) between speech segments and tightens timing.
- **Aspect Ratio Preview & Burn**:
  - `16:9` Landscape (YouTube / TV)
  - `9:16` Vertical (TikTok / Reels / Shorts)
  - `1:1` Square (Instagram)
- **Multi-Format Export**:
  - Burn styled captions directly into MP4 video via FFmpeg
  - Export standard `.srt` subtitle file
  - Export styled `.ass` (Advanced SubStation Alpha) subtitle file
  - Save & open `.json` project files

---

## Windows Installation & Prerequisites

To run this application locally on Windows, install the following 3 free prerequisites:

### 1. Install Node.js
1. Download Node.js LTS (v20 or newer) from [nodejs.org](https://nodejs.org/).
2. Run the installer and check *"Automatically install necessary tools"*.
3. Verify installation in PowerShell/Command Prompt:
   ```cmd
   node -v
   npm -v
   ```

### 2. Install Python & faster-whisper
1. Download Python 3.10 or 3.11 from [python.org](https://www.python.org/downloads/).
2. **CRITICAL**: Check the box **"Add Python to PATH"** during installation.
3. Open Command Prompt and install `faster-whisper`:
   ```cmd
   pip install faster-whisper
   ```
4. Verify Python & faster-whisper:
   ```cmd
   python -c "import faster_whisper; print('faster-whisper ready!')"
   ```

### 3. Install FFmpeg
**Option A: via Windows Package Manager (Recommended)**
Open PowerShell as Administrator and run:
```cmd
winget install FFmpeg
```

**Option B: Manual Download**
1. Download FFmpeg essentials build from [gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/).
2. Extract the zip file (e.g. to `C:\ffmpeg`).
3. Add `C:\ffmpeg\bin` to your System Environment `PATH`.
4. Verify FFmpeg in Command Prompt:
   ```cmd
   ffmpeg -version
   ```

---

## Running the Application

1. Clone or extract the repository folder.
2. Open terminal in the project directory and install Node dependencies:
   ```cmd
   npm install
   ```
3. Launch the Electron Desktop application:
   ```cmd
   npm start
   ```

---

## Building an Executable Installer (.exe)

To build a standalone Windows installer using `electron-builder`:

1. Run the build command:
   ```cmd
   npm run build:electron
   ```
2. The generated installer (`.exe`) will be located inside the `dist_electron/` directory.

---

## Project Structure

```
├── electron/
│   ├── main.cjs            # Electron main process (File dialogs, Python child process, FFmpeg spawner)
│   └── preload.cjs         # Context isolation bridge (window.electronAPI)
├── src/
│   ├── components/
│   │   ├── Header.tsx      # Top bar (Auto Captions bar, language dropdown, model size, action buttons)
│   │   ├── VideoPlayer.tsx # Canvas caption renderer overlay with word-level pop effect
│   │   ├── CaptionList.tsx # Editable transcript list (Split, Merge, Delete, Seek, Word Inspector)
│   │   ├── StylePanel.tsx  # CapCut preset switcher, typography, stroke, glow, box, positioning
│   │   ├── Timeline.tsx    # Interactive ruler, playhead marker, caption blocks, trim handles
│   │   ├── ExportModal.tsx # MP4 FFmpeg burner, SRT & ASS subtitle export dialog
│   │   └── SystemCheckModal.tsx # System status inspector for Python, faster-whisper & FFmpeg
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Caption grouping, time formatting, ASS generator, silence remover
│   ├── App.tsx             # Main application state orchestration
│   └── main.tsx            # React root entry
├── transcribe.py           # Python script utilizing faster-whisper for speech-to-text
├── package.json            # Project dependencies & scripts
└── README.md               # Windows setup & guide
```

---

## License

Apache-2.0 License. Free for commercial and personal video content creation.
