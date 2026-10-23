import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // API Route: Server-Side Gemini Video Audio Transcription
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { mimeType, base64Data, language } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: 'Missing base64Data in request body' });
      }

      const audioPart = {
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: base64Data,
        },
      };

      const promptText = `Transcribe the spoken audio in this video verbatim into exact words with accurate start and end timestamps in seconds. Format as structured JSON. Requested language: ${language || 'auto'}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: { parts: [audioPart, { text: promptText }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING, description: 'Language code or name' },
              words: {
                type: Type.ARRAY,
                description: 'Verbatim spoken words with accurate timestamps in seconds',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING, description: 'Exact spoken word' },
                    start: { type: Type.NUMBER, description: 'Start timestamp in seconds' },
                    end: { type: Type.NUMBER, description: 'End timestamp in seconds' },
                  },
                  required: ['word', 'start', 'end'],
                },
              },
            },
            required: ['words'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        detected_language: parsedData.detectedLanguage || language || 'en',
        all_words: parsedData.words || [],
      });
    } catch (err: any) {
      console.error('Gemini Transcription Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to transcribe audio via Gemini AI' });
    }
  });

  // Serve Vite App
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
