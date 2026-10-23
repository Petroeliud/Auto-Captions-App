const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CapCut Auto Captions Desktop',
    backgroundColor: '#0f0f12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// System Check IPC
ipcMain.handle('check-system-deps', async () => {
  const result = { python: false, fasterWhisper: false, ffmpeg: false, error: null };

  return new Promise((resolve) => {
    exec('python --version', (pyErr) => {
      if (!pyErr) {
        result.python = true;
        exec('python -c "import faster_whisper; print(\'OK\')"', (fwErr, fwStdout) => {
          if (!fwErr && fwStdout.includes('OK')) {
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

// File Dialogs
ipcMain.handle('select-video-file', async () => {
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

// Transcribe video via Python faster-whisper process spawn
async function handleVideoTranscription(videoPath, language = 'auto', modelSize = 'small') {
  console.log(`[IPC transcribe-video] Starting transcription for videoPath: "${videoPath}", language: "${language}", model: "${modelSize}"`);

  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../transcribe.py');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    const args = [
      scriptPath,
      '--video', videoPath,
      '--language', language || 'auto',
      '--model', modelSize || 'small'
    ];

    console.log(`[IPC transcribe-video] Command: ${pythonCmd} ${args.map(a => `"${a}"`).join(' ')}`);
    const pyProc = spawn(pythonCmd, args);

    let stdoutData = '';
    let stderrData = '';

    pyProc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdoutData += chunk;
      console.log(`[Python stdout]: ${chunk.trim()}`);
      if (mainWindow) mainWindow.webContents.send('transcribe-progress', { log: chunk });
    });

    pyProc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderrData += chunk;
      console.error(`[Python stderr]: ${chunk.trim()}`);
      if (mainWindow) mainWindow.webContents.send('transcribe-progress', { log: chunk });
    });

    pyProc.on('error', (err) => {
      console.error(`[Python Spawn Error]:`, err);
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}. Please ensure Python 3 is installed and added to system PATH.`
      });
    });

    pyProc.on('close', (code) => {
      console.log(`[Python process exited with code ${code}]`);
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdoutData);
          resolve(parsed);
        } catch (jsonErr) {
          console.error(`[JSON Parse Error] Raw stdout was:`, stdoutData);
          resolve({
            success: false,
            error: `Failed to parse Python JSON output: ${jsonErr.message}.\nRaw Output:\n${stdoutData}`
          });
        }
      } else {
        resolve({
          success: false,
          error: `Python transcribe script exited with code ${code}.\n\nError details:\n${stderrData || stdoutData || 'No output.'}`
        });
      }
    });
  });
}

ipcMain.handle('transcribe-video', async (event, videoPath, language, modelSize) => {
  return handleVideoTranscription(videoPath, language, modelSize);
});

ipcMain.handle('run-transcription', async (event, { videoPath, language, modelSize }) => {
  return handleVideoTranscription(videoPath, language, modelSize);
});

// Export burned MP4 via FFmpeg
ipcMain.handle('burn-subtitles-mp4', async (event, { videoPath, assContent, aspectRatio, outputPath }) => {
  return new Promise((resolve, reject) => {
    const tempAssPath = path.join(app.getPath('temp'), `capcut_sub_${Date.now()}.ass`);
    fs.writeFileSync(tempAssPath, assContent, 'utf-8');

    let outPath = outputPath;
    if (!outPath) {
      const parsed = path.parse(videoPath);
      outPath = path.join(parsed.dir, `${parsed.name}_captioned.mp4`);
    }

    // Aspect ratio filter string
    let vfFilter = `subtitles='${tempAssPath.replace(/\\/g, '/').replace(/:/g, '\\:')}'`;

    if (aspectRatio === '9:16') {
      vfFilter = `crop=ih*9/16:ih,${vfFilter}`;
    } else if (aspectRatio === '1:1') {
      vfFilter = `crop=ih:ih,${vfFilter}`;
    }

    const args = [
      '-y',
      '-i', videoPath,
      '-vf', vfFilter,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-preset', 'fast',
      outPath
    ];

    const ffProc = spawn('ffmpeg', args);
    let ffStderr = '';

    ffProc.stderr.on('data', (data) => {
      ffStderr += data.toString();
      mainWindow.webContents.send('ffmpeg-progress', { log: data.toString() });
    });

    ffProc.on('close', (code) => {
      try { fs.unlinkSync(tempAssPath); } catch (e) {}

      if (code === 0) {
        resolve({ success: true, outputPath: outPath });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${ffStderr.slice(-300)}`));
      }
    });
  });
});
