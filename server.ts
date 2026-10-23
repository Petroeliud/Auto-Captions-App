import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import multer from 'multer';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Configure temp upload folder for local video transcription
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
    const safeName = `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1 GB limit
});

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // Helper to run python transcribe.py locally
  function runLocalPythonTranscription(videoFilePath: string, language: string = 'auto', modelSize: string = 'small'): Promise<any> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'transcribe.py');
      // Determine python binary command
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      console.log(`[Local Transcription] Spawning: ${pythonCmd} "${scriptPath}" "${videoFilePath}" "${language}" "${modelSize}"`);

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
      });

      pyProc.on('error', (err: any) => {
        console.error('[transcribe.py spawn error]:', err);
        if (err.code === 'ENOENT') {
          reject(new Error(`Python is not installed or not found in system PATH. Please install Python 3.8+ and add it to your PATH.`));
        } else {
          reject(new Error(`Failed to execute Python process: ${err.message}`));
        }
      });

      pyProc.on('close', (code) => {
        console.log(`[transcribe.py process exited with code ${code}]`);

        if (stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            if (parsed.success === false) {
              reject(new Error(parsed.error || 'Transcription failed'));
              return;
            }
            resolve(parsed);
            return;
          } catch (jsonErr: any) {
            console.error('[JSON parse error on stdout]:', jsonErr.message, stdoutData);
          }
        }

        if (code === 0) {
          resolve({ success: true, segments: [], all_words: [] });
        } else {
          const detail = stderrData.trim() || stdoutData.trim() || `Process exited with code ${code}`;
          if (detail.includes('faster-whisper is not installed') || detail.includes('No module named \'faster_whisper\'')) {
            reject(new Error('faster-whisper is not installed in Python. Please run: pip install faster-whisper'));
          } else {
            reject(new Error(`Transcription error: ${detail}`));
          }
        }
      });
    });
  }

  // POST /api/transcribe - Local transcription endpoint using faster-whisper (Python child process)
  app.post('/api/transcribe', (req, res, next) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) {
        console.error('[Multer Error]:', err);
        const isLimit = err.code === 'LIMIT_FILE_SIZE';
        return res.status(isLimit ? 413 : 400).json({
          success: false,
          error: isLimit
            ? 'Media file exceeds upload size limit. Please upload a shorter clip or use the desktop app.'
            : (err.message || 'Error processing media file upload.')
        });
      }
      next();
    });
  }, async (req, res) => {
    let tempFilePath: string | null = null;
    let shouldCleanup = false;

    try {
      const language = req.body.language || 'auto';
      const modelSize = req.body.modelSize || 'small';

      // 1. If video was uploaded via multipart/form-data
      if (req.file) {
        tempFilePath = req.file.path;
        shouldCleanup = true;
      }
      // 2. If video was passed as base64 string
      else if (req.body.base64Data) {
        const ext = req.body.mimeType?.includes('webm') ? '.webm' : '.mp4';
        tempFilePath = path.join(tempUploadDir, `video_b64_${Date.now()}${ext}`);
        fs.writeFileSync(tempFilePath, Buffer.from(req.body.base64Data, 'base64'));
        shouldCleanup = true;
      }
      // 3. If direct local filesystem path was provided (e.g. Electron or local path)
      else if (req.body.videoPath && fs.existsSync(req.body.videoPath)) {
        tempFilePath = req.body.videoPath;
        shouldCleanup = false;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No video provided. Please upload a video file or provide videoPath.'
        });
      }

      if (!tempFilePath) {
        return res.status(400).json({
          success: false,
          error: 'No valid video file could be prepared for transcription.'
        });
      }

      // Run local Python script
      const result = await runLocalPythonTranscription(tempFilePath, language, modelSize);

      return res.json({
        success: true,
        detected_language: result.detected_language || language,
        duration: result.duration || 0,
        segments: result.segments || [],
        all_words: result.all_words || []
      });

    } catch (err: any) {
      console.error('[API /api/transcribe Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to transcribe video locally.'
      });
    } finally {
      // Clean up temporary upload file if one was created
      if (shouldCleanup && tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupErr) {
          console.warn('[Cleanup Warning] Could not remove temp file:', cleanupErr);
        }
      }
    }
  });

  // Serve Vite App in Development / Static in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
