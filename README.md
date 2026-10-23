# PCut - Auto Captions Desktop (Windows / Offline)

**PCut** is a high-performance Windows desktop video auto-captioning app inspired by CapCut's automated subtitles. Powered by **faster-whisper** (Python) for ultra-fast local AI speech recognition with word-level timestamps, **FFmpeg** for pixel-perfect ASS subtitle burning with bundled TrueType fonts, and **Electron + React + Tailwind CSS** for a dark, modern editing workspace.

100% offline — no cloud servers, no account logins, and no paid API keys required.

---

## Features

- **Local Speech-to-Text**: Powered by `faster-whisper` running on CPU (`int8` quantization) or GPU (`cuda`).
- **Real-Time Transcription Progress**: Live percentage progress bar and model-loading indicator.
- **Word-Level Timestamp Alignment & Pop Animation**: Highlights each spoken word in sync with speech rhythm and animated pop scaling.
- **Matched ASS Subtitle Rendering**: Exported MP4 videos use bundled fonts (`fontsdir`) and proportional `PlayRes` scaling to ensure exports look identical to live preview.
- **Export Destination Picker & Explorer Reveal**: Choose your output destination with native file dialogs and reveal exported videos directly in Windows File Explorer.
- **PCut Style Presets**:
  1. *CapCut Bold* (Montserrat bold white text with thick black outline)
  2. *TikTok Viral Yellow* (Outfit high contrast yellow with pop shadow)
  3. *Neon Glow* (Urbanist electric cyan with neon glow effect)
  4. *Minimal Dark Box* (Plus Jakarta Sans text inside rounded pill box)
  5. *Karaoke Wave* (Dynamic word highlight rhythm)
  6. *Cinematic Serif* (Playfair Display documentary editorial serif)
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

## Running the Electron Desktop App

The application features a built-in internal Express server embedded directly inside the Electron main process (`electron/main.cjs`). You do not need to start a separate backend server or open a web browser.

### Development Mode
To build the latest frontend bundle and launch the desktop Electron window:
```cmd
npm run electron:dev
```
*Electron will initialize its internal server, bind to a local port, serve the UI from `dist/`, and load the window immediately.*

---

## Building the Windows Installer (.exe)

The project is configured with `electron-builder` to package a Windows NSIS installer that bundles the Electron app, internal server, static assets, and `transcribe.py`:

```cmd
npm run electron:build
```

### Packaging & Resource Resolution Details
- **Build Output**: The generated `.exe` installer is saved in the `release/` directory.
- **Installer Type**: NSIS installer (`CapCut Auto Captions Setup.exe`) with options to customize installation folder and create desktop shortcuts.
- **Script Bundling (`extraResources`)**: `transcribe.py` is packaged into `process.resourcesPath` so it remains directly executable by the system Python interpreter outside of the ASAR archive.
- **Dynamic Path Detection**:
  - In development: resolves `transcribe.py` from the project root (`../transcribe.py`).
  - When packaged (`app.isPackaged === true`): automatically resolves `transcribe.py` from `process.resourcesPath`.

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
