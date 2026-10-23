const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const express = require('express');
const multer = require('multer');
const http = require('http');
const fontList = require('font-list');
const opentype = require('opentype.js');

let mainWindow = null;
let serverInstance = null;
let serverPort = 3000;
let activeFfProc = null;
let cachedSystemFonts = null;
const fontFileCache = new Map(); // cleanFamilyName -> absoluteFilePath

// Get or create user custom imported fonts directory
function getUserFontsDir() {
  const dir = path.join(app.getPath('userData'), 'fonts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Parse font file with opentype to extract font family name
function scanFontFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const font = opentype.parse(ab);
    if (!font) return null;

    const family = font.getEnglishName('preferredFamily') ||
                   font.getEnglishName('fontFamily') ||
                   font.names?.fontFamily?.en ||
                   (font.names?.windows?.fontFamily && font.names.windows.fontFamily.en);

    if (family) {
      const clean = family.trim().toLowerCase();
      if (!fontFileCache.has(clean)) {
        fontFileCache.set(clean, filePath);
      }
    }

    const fullName = font.getEnglishName('fullName') || (font.names?.windows?.fullName && font.names.windows.fullName.en);
    if (fullName) {
      const cleanFull = fullName.trim().toLowerCase();
      if (!fontFileCache.has(cleanFull)) {
        fontFileCache.set(cleanFull, filePath);
      }
    }
    return family || fullName || null;
  } catch (e) {
    return null;
  }
}

// Scan a directory of fonts (.ttf, .otf)
function scanFontsDirectory(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const ext = path.extname(f).toLowerCase();
          if (ext === '.ttf' || ext === '.otf') {
            scanFontFile(fullPath);
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[Font Scanner] Could not read font directory:', dir, err.message);
  }
}

// Index fonts on disk: user imported fonts + Windows fonts / system fonts
function indexFontsOnDisk() {
  // 1. User imported fonts
  scanFontsDirectory(getUserFontsDir());

  // 2. Windows system fonts (C:\Windows\Fonts and %LOCALAPPDATA%\Microsoft\Windows\Fonts)
  if (process.platform === 'win32') {
    const winFonts = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
    scanFontsDirectory(winFonts);

    if (process.env.LOCALAPPDATA) {
      const userWinFonts = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts');
      scanFontsDirectory(userWinFonts);
    }
  } else {
    // Linux and macOS system font directories
    const unixFontDirs = [
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      path.join(os.homedir(), '.fonts'),
      path.join(os.homedir(), '.local/share/fonts'),
      '/Library/Fonts',
      '/System/Library/Fonts',
      path.join(os.homedir(), 'Library/Fonts')
    ];
    for (const d of unixFontDirs) {
      scanFontsDirectory(d);
    }
  }
}

// Path resolution helper for development vs packaged distribution
function getTranscribeScriptPath() {
  if (app.isPackaged) {
    const packagedScript = path.join(process.resourcesPath, 'transcribe.py');
    if (fs.existsSync(packagedScript)) {
      return packagedScript;
    }
  }
  const devPath = path.join(__dirname, '../transcribe.py');
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  return path.join(process.cwd(), 'transcribe.py');
}

function getFontsDirPath() {
  if (app.isPackaged) {
    const pkgFonts = path.join(process.resourcesPath, 'fonts');
    if (fs.existsSync(pkgFonts)) return pkgFonts;
  }
  const devFonts = path.join(__dirname, '../fonts');
  if (fs.existsSync(devFonts)) return devFonts;
  return path.join(process.cwd(), 'fonts');
}

function getDistPath() {
  const directDist = path.join(__dirname, '../dist');
  if (fs.existsSync(directDist)) {
    return directDist;
  }
  const resDist = path.join(process.resourcesPath, 'dist');
  if (fs.existsSync(resDist)) {
    return resDist;
  }
  const asarDist = path.join(process.resourcesPath, 'app.asar', 'dist');
  if (fs.existsSync(asarDist)) {
    return asarDist;
  }
  return directDist;
}

// Temporary uploads folder for video processing
const tempUploadDir = path.join(os.tmpdir(), 'capcut_uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const safeName = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

// Run local Python faster-whisper transcription
function runLocalPythonTranscription(videoFilePath, language = 'auto', modelSize = 'small') {
  return new Promise((resolve, reject) => {
    const scriptPath = getTranscribeScriptPath();
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    console.log(`[Python Runner] Script path: "${scriptPath}" (Packaged: ${app.isPackaged})`);
    console.log(`[Python Runner] Spawning: ${pythonCmd} -u "${scriptPath}" "${videoFilePath}" "${language}" "${modelSize}"`);

    // Spawn with -u for unbuffered real-time stderr progress
    const pyProc = spawn(pythonCmd, [
      '-u',
      scriptPath,
      videoFilePath,
      language || 'auto',
      modelSize || 'small'
    ]);

    let stdoutData = '';
    let stderrData = '';

    pyProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdoutData += text;
      console.log(`[transcribe.py stdout]: ${text.trim()}`);
    });

    pyProc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrData += text;
      console.error(`[transcribe.py stderr]: ${text.trim()}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('PROGRESS:')) {
            const pct = parseInt(trimmed.replace('PROGRESS:', ''), 10);
            if (!isNaN(pct)) {
              mainWindow.webContents.send('transcribe-progress', { percent: pct });
            }
          } else if (trimmed.startsWith('STAGE:')) {
            const stage = trimmed.replace('STAGE:', '');
            mainWindow.webContents.send('transcribe-progress', { stage });
          } else if (trimmed) {
            mainWindow.webContents.send('transcribe-progress', { log: trimmed });
          }
        }
      }
    });

    pyProc.on('error', (err) => {
      console.error('[transcribe.py spawn error]:', err);
      if (err.code === 'ENOENT') {
        reject(new Error('Python is not installed or not found in system PATH. Please install Python 3.8+ and add it to your PATH.'));
      } else {
        reject(new Error(`Failed to execute Python process: ${err.message}`));
      }
    });

    pyProc.on('close', (code) => {
      console.log(`[transcribe.py exited with code ${code}]`);

      if (stdoutData.trim()) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed.success === false) {
            reject(new Error(parsed.error || 'Transcription failed'));
            return;
          }
          resolve(parsed);
          return;
        } catch (jsonErr) {
          console.error('[JSON parse error on stdout]:', jsonErr.message, stdoutData);
        }
      }

      if (code === 0) {
        resolve({ success: true, segments: [], all_words: [] });
      } else {
        const detail = stderrData.trim() || stdoutData.trim() || `Process exited with code ${code}`;
        if (detail.includes('faster-whisper is not installed') || detail.includes("No module named 'faster_whisper'")) {
          reject(new Error('faster-whisper is not installed in Python. Please run: pip install faster-whisper'));
        } else {
          reject(new Error(`Transcription error: ${detail}`));
        }
      }
    });
  });
}

// Start internal Express server
function startInternalExpressServer() {
  return new Promise((resolve) => {
    const expressApp = express();

    expressApp.use(express.json({ limit: '500mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '500mb' }));

    // CORS & Headers for desktop local requests
    expressApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    // POST /api/transcribe - Local transcription endpoint
    expressApp.post('/api/transcribe', (req, res, next) => {
      upload.single('video')(req, res, (err) => {
        if (err) {
          console.error('[Electron Express Multer Error]:', err);
          const isLimit = err.code === 'LIMIT_FILE_SIZE';
          return res.status(isLimit ? 413 : 400).json({
            success: false,
            error: isLimit
              ? 'Media file exceeds upload size limit.'
              : (err.message || 'Error processing media file upload.')
          });
        }
        next();
      });
    }, async (req, res) => {
      let tempFilePath = null;
      let shouldCleanup = false;

      try {
        const language = req.body.language || 'auto';
        const modelSize = req.body.modelSize || 'small';

        if (req.file) {
          tempFilePath = req.file.path;
          shouldCleanup = true;
        } else if (req.body.base64Data) {
          const ext = req.body.mimeType?.includes('webm') ? '.webm' : '.mp4';
          tempFilePath = path.join(tempUploadDir, `b64_${Date.now()}${ext}`);
          fs.writeFileSync(tempFilePath, Buffer.from(req.body.base64Data, 'base64'));
          shouldCleanup = true;
        } else if (req.body.videoPath && fs.existsSync(req.body.videoPath)) {
          tempFilePath = req.body.videoPath;
          shouldCleanup = false;
        } else {
          return res.status(400).json({
            success: false,
            error: 'No video provided. Please upload a video file or provide videoPath.'
          });
        }

        const result = await runLocalPythonTranscription(tempFilePath, language, modelSize);

        return res.json({
          success: true,
          detected_language: result.detected_language || language,
          duration: result.duration || 0,
          segments: result.segments || [],
          all_words: result.all_words || []
        });

      } catch (err) {
        console.error('[API /api/transcribe Error]:', err.message);
        return res.status(500).json({
          success: false,
          error: err.message || 'Failed to transcribe video locally.'
        });
      } finally {
        if (shouldCleanup && tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {}
        }
      }
    });

    // Serve static files from Vite build output (dist)
    const distPath = getDistPath();
    console.log(`[Express Server] Serving static files from: "${distPath}"`);

    if (fs.existsSync(distPath)) {
      expressApp.use(express.static(distPath));
      expressApp.get('*', (req, res, next) => {
        if (req.originalUrl.startsWith('/api')) return next();
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Application bundle (dist/index.html) not found. Run npm run build first.');
        }
      });
    }

    const server = http.createServer(expressApp);

    // Try starting on port 3000, or choose a random available port if 3000 is occupied
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      serverPort = typeof address === 'object' && address ? address.port : 3000;
      serverInstance = server;
      console.log(`[Express Server] Running internally at http://127.0.0.1:${serverPort}`);
      resolve(serverPort);
    });

    server.on('error', (err) => {
      console.error('[Express Server Error]:', err);
      resolve(3000);
    });
  });
}

// Create Electron window
function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'PCut',
    backgroundColor: '#0f0f12',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // allow local video streaming and canvas capture
    },
  });

  const appUrl = (process.env.VITE_DEV_SERVER_URL && !app.isPackaged)
    ? process.env.VITE_DEV_SERVER_URL
    : `http://127.0.0.1:${port}`;

  console.log(`[Electron] Loading UI from: ${appUrl}`);
  mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  const port = await startInternalExpressServer();
  createMainWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(serverPort);
    }
  });
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: System Check
ipcMain.handle('check-system-deps', async () => {
  const result = { python: false, fasterWhisper: false, ffmpeg: false, error: null };
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  return new Promise((resolve) => {
    exec(`${pythonCmd} --version`, (pyErr) => {
      if (!pyErr) {
        result.python = true;
        exec(`${pythonCmd} -c "import faster_whisper; print('OK')"`, (fwErr, fwStdout) => {
          if (!fwErr && fwStdout && fwStdout.includes('OK')) {
            result.fasterWhisper = true;
          }
          checkFFmpeg();
        });
      } else {
        checkFFmpeg();
      }
    });

    function checkFFmpeg() {
      exec('ffmpeg -version', (ffErr) => {
        if (!ffErr) result.ffmpeg = true;
        resolve(result);
      });
    }
  });
});

// IPC: File Dialogs
ipcMain.handle('select-video-file', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Video File',
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] }
    ]
  });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('open-project-file', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open CapCut Captions Project',
    properties: ['openFile'],
    filters: [{ name: 'Project Files', extensions: ['json'] }]
  });
  if (!canceled && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return JSON.parse(content);
  }
  return null;
});

ipcMain.handle('save-project-file', async (event, projectData) => {
  if (!mainWindow) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save CapCut Captions Project',
    defaultPath: 'capcut_project.json',
    filters: [{ name: 'Project Files', extensions: ['json'] }]
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2), 'utf-8');
    return filePath;
  }
  return null;
});

ipcMain.handle('save-srt-file', async (event, { defaultName, content }) => {
  if (!mainWindow) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Subtitle (.srt)',
    defaultPath: defaultName || 'captions.srt',
    filters: [{ name: 'Subtitles', extensions: ['srt'] }]
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }
  return null;
});

// IPC: Choose Export Path with MP4 filter
ipcMain.handle('choose-export-path', async (event, defaultName) => {
  if (!mainWindow) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Choose Export Destination',
    defaultPath: defaultName || 'video_captioned.mp4',
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] }
    ]
  });
  if (canceled || !filePath) return null;
  return filePath;
});

// IPC: Show File in System Explorer
ipcMain.handle('show-item-in-folder', async (event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    shell.showItemInFolder(targetPath);
    return true;
  }
  return false;
});

// IPC: Cancel active FFmpeg process
ipcMain.handle('cancel-burn-subtitles', async () => {
  if (activeFfProc) {
    try {
      console.log('[FFmpeg] Cancelling active FFmpeg process...');
      activeFfProc.kill('SIGKILL');
      activeFfProc = null;
      return true;
    } catch (e) {
      console.error('[FFmpeg Cancel Error]:', e);
    }
  }
  return false;
});

// IPC: System Fonts Listing (cached for session)
ipcMain.handle('get-system-fonts', async () => {
  if (cachedSystemFonts && cachedSystemFonts.length > 0) {
    return cachedSystemFonts;
  }
  try {
    const list = await fontList.getFonts();
    const cleaned = list
      .map(f => f.replace(/^["']|["']$/g, '').trim())
      .filter((f, idx, arr) => f && arr.indexOf(f) === idx)
      .sort((a, b) => a.localeCompare(b));
    cachedSystemFonts = cleaned;
    return cleaned;
  } catch (err) {
    console.error('[Font List Error]:', err);
    return [];
  }
});

// IPC: User imported fonts from user data folder
ipcMain.handle('get-user-fonts', async () => {
  const userFontsDir = getUserFontsDir();
  const results = [];
  try {
    const files = fs.readdirSync(userFontsDir);
    for (const f of files) {
      const full = path.join(userFontsDir, f);
      const ext = path.extname(f).toLowerCase();
      if (ext === '.ttf' || ext === '.otf') {
        const fam = scanFontFile(full);
        results.push({
          family: fam || path.parse(f).name,
          fileName: f,
          path: full
        });
      }
    }
  } catch (e) {
    console.warn('[User Fonts Error]:', e);
  }
  return results;
});

// IPC: Import Font File (.ttf, .otf) into App User Data folder
ipcMain.handle('import-font-file', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Custom Font File',
    properties: ['openFile'],
    filters: [
      { name: 'Font Files (*.ttf, *.otf)', extensions: ['ttf', 'otf'] }
    ]
  });

  if (canceled || filePaths.length === 0) return null;

  try {
    const sourcePath = filePaths[0];
    const userFontsDir = getUserFontsDir();
    const destName = path.basename(sourcePath);
    const destPath = path.join(userFontsDir, destName);

    fs.copyFileSync(sourcePath, destPath);
    const family = scanFontFile(destPath) || path.parse(destName).name;

    return {
      success: true,
      family,
      fileName: destName,
      path: destPath
    };
  } catch (err) {
    console.error('[Import Font Error]:', err);
    return { success: false, error: err.message };
  }
});

// IPC: Transcription via faster-whisper
ipcMain.handle('transcribe-video', async (event, videoPath, language = 'auto', modelSize = 'small') => {
  try {
    return await runLocalPythonTranscription(videoPath, language, modelSize);
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Transcription failed'
    };
  }
});

ipcMain.handle('run-transcription', async (event, { videoPath, language, modelSize }) => {
  try {
    return await runLocalPythonTranscription(videoPath, language, modelSize);
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Transcription failed'
    };
  }
});

// Helper to escape path characters for FFmpeg subtitles filter
function escapeFfmpegFilterPath(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

// IPC: Export burned MP4 via FFmpeg with real-time percentage progress and fontsdir
ipcMain.handle('burn-subtitles-mp4', async (event, { videoPath, assContent, aspectRatio, outputPath, durationSec, testClipSec, fontFamily }) => {
  return new Promise((resolve, reject) => {
    const tempAssPath = path.join(app.getPath('temp'), `pcut_sub_${Date.now()}.ass`);
    fs.writeFileSync(tempAssPath, assContent, 'utf-8');

    // Create a temporary export fonts directory bundling app fonts + matched system font
    const exportFontsDir = path.join(app.getPath('temp'), `pcut_export_fonts_${Date.now()}`);
    try {
      fs.mkdirSync(exportFontsDir, { recursive: true });

      // 1. Copy bundled fonts
      const bundledFontsDir = getFontsDirPath();
      if (fs.existsSync(bundledFontsDir)) {
        const bFiles = fs.readdirSync(bundledFontsDir);
        for (const bf of bFiles) {
          try {
            fs.copyFileSync(path.join(bundledFontsDir, bf), path.join(exportFontsDir, bf));
          } catch (e) {}
        }
      }

      // 2. Resolve chosen font family from assContent or fontFamily argument
      let targetFont = fontFamily;
      if (!targetFont) {
        const styleMatch = assContent.match(/Style:\s*PCutStyle,([^,]+),/);
        if (styleMatch && styleMatch[1]) {
          targetFont = styleMatch[1].trim();
        }
      }

      if (targetFont) {
        indexFontsOnDisk();
        const cleanTarget = targetFont.replace(/['"]/g, '').trim().toLowerCase();
        const matchedFontPath = fontFileCache.get(cleanTarget);
        if (matchedFontPath && fs.existsSync(matchedFontPath)) {
          const destFile = path.join(exportFontsDir, path.basename(matchedFontPath));
          fs.copyFileSync(matchedFontPath, destFile);
          console.log(`[FFmpeg Export] Copied font "${targetFont}" from "${matchedFontPath}" into export fontsdir`);
        }
      }
    } catch (fontPrepErr) {
      console.warn('[FFmpeg Export] Font preparation notice:', fontPrepErr.message);
    }

    let outPath = outputPath;
    if (!outPath) {
      const parsed = path.parse(videoPath);
      outPath = path.join(parsed.dir, `${parsed.name}_captioned.mp4`);
    }

    const escapedAss = escapeFfmpegFilterPath(tempAssPath);
    const escapedFonts = escapeFfmpegFilterPath(exportFontsDir);
    let vfFilter = `subtitles='${escapedAss}':fontsdir='${escapedFonts}'`;

    if (aspectRatio === '9:16') {
      vfFilter = `crop=ih*9/16:ih,${vfFilter}`;
    } else if (aspectRatio === '1:1') {
      vfFilter = `crop=ih:ih,${vfFilter}`;
    }

    const args = [
      '-y',
      '-progress', 'pipe:1',
      '-nostats'
    ];

    // If 5-second preview test clip is requested
    if (testClipSec && testClipSec > 0) {
      args.push('-t', String(testClipSec));
    }

    args.push(
      '-i', videoPath,
      '-vf', vfFilter,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-preset', 'fast',
      outPath
    );

    console.log(`[FFmpeg] Spawning ffmpeg with args:`, args);
    const effectiveDuration = (testClipSec && testClipSec > 0) ? testClipSec : (durationSec || 1);

    const ffProc = spawn('ffmpeg', args);
    activeFfProc = ffProc;
    let ffStderr = '';

    ffProc.stdout.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('out_time_ms=')) {
          const us = parseInt(trimmed.replace('out_time_ms=', ''), 10);
          if (!isNaN(us) && effectiveDuration > 0) {
            const currentSec = us / 1000000;
            const pct = Math.min(99, Math.max(0, Math.round((currentSec / effectiveDuration) * 100)));
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ffmpeg-progress', { percent: pct, outSec: currentSec });
            }
          }
        } else if (trimmed.startsWith('out_time_us=')) {
          const us = parseInt(trimmed.replace('out_time_us=', ''), 10);
          if (!isNaN(us) && effectiveDuration > 0) {
            const currentSec = us / 1000000;
            const pct = Math.min(99, Math.max(0, Math.round((currentSec / effectiveDuration) * 100)));
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ffmpeg-progress', { percent: pct, outSec: currentSec });
            }
          }
        } else if (trimmed === 'progress=end') {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ffmpeg-progress', { percent: 100 });
          }
        }
      }
    });

    ffProc.stderr.on('data', (data) => {
      const text = data.toString();
      ffStderr += text;
      console.log('[FFmpeg stderr]:', text.trim());
    });

    ffProc.on('close', (code) => {
      activeFfProc = null;
      try { fs.unlinkSync(tempAssPath); } catch (e) {}
      try {
        if (fs.existsSync(exportFontsDir)) {
          fs.rmSync(exportFontsDir, { recursive: true, force: true });
        }
      } catch (e) {}

      if (code === 0) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ffmpeg-progress', { percent: 100 });
        }
        resolve({ success: true, outputPath: outPath });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${ffStderr.slice(-300)}`));
      }
    });
  });
});
