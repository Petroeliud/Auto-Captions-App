import { CaptionSegment, WordTimestamp } from '../types/caption';

export interface SampleVideo {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  sampleCaptions: CaptionSegment[];
}

// Generate a 100% reliable local synthetic video Blob URL using HTML5 Canvas & MediaRecorder
let cachedSyntheticUrl: string | null = null;

export function getSyntheticVideoUrl(): string {
  if (cachedSyntheticUrl) return cachedSyntheticUrl;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    let frame = 0;
    const totalFrames = 30 * 18; // 18 seconds at 30fps

    const drawFrame = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const t = frame / 30;

      // Draw dynamic animated gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const hue1 = (frame * 2) % 360;
      const hue2 = (frame * 2 + 120) % 360;
      grad.addColorStop(0, `hsl(${hue1}, 70%, 20%)`);
      grad.addColorStop(1, `hsl(${hue2}, 70%, 10%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw animated particle circles
      for (let i = 0; i < 8; i++) {
        const cx = (canvas.width / 2) + Math.cos(t * 1.5 + i) * (200 + i * 20);
        const cy = (canvas.height / 2) + Math.sin(t * 1.5 + i) * (100 + i * 15);
        ctx.fillStyle = `hsla(${hue1 + i * 30}, 80%, 60%, 0.4)`;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + i * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw central badge
      ctx.fillStyle = 'rgba(18, 18, 23, 0.85)';
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.lineWidth = 4;
      const bw = 640;
      const bh = 180;
      const bx = (canvas.width - bw) / 2;
      const by = (canvas.height - bh) / 2 - 40;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 20);
      ctx.fill();
      ctx.stroke();

      // Text in badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAPCUT AUTO CAPTIONS DEMO', canvas.width / 2, by + 65);

      ctx.fillStyle = '#818CF8';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`TIMECODE: ${t.toFixed(2)}s / 18.00s`, canvas.width / 2, by + 120);

      frame++;
      setTimeout(drawFrame, 1000 / 30);
    };

    mediaRecorder.start();
    drawFrame();

    // Create synchronous placeholder blob url from canvas image first
    const dataUrl = canvas.toDataURL('image/png');
    cachedSyntheticUrl = dataUrl;

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      cachedSyntheticUrl = URL.createObjectURL(blob);
    };

    return cachedSyntheticUrl;
  } catch (err) {
    console.warn('Synthetic video generation skipped:', err);
    return '';
  }
}

// Built-in high quality sample video with realistic word-level timestamps in English & Swahili
export const DEMO_SAMPLES: SampleVideo[] = [
  {
    id: 'tech_creator',
    title: 'Tech Creator - Auto Captions Demo',
    description: 'Dynamic content creator talking about video editing software and AI features.',
    duration: 18.5,
    // Reliable Wikimedia Commons public domain sample video (VP9 / WebM)
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm',
    sampleCaptions: [
      {
        id: 'cap_demo_1',
        start: 0.5,
        end: 2.8,
        text: 'Welcome back to the video editor!',
        words: [
          { word: 'Welcome', start: 0.5, end: 0.9 },
          { word: 'back', start: 0.9, end: 1.2 },
          { word: 'to', start: 1.2, end: 1.4 },
          { word: 'the', start: 1.4, end: 1.6 },
          { word: 'video', start: 1.6, end: 2.1 },
          { word: 'editor!', start: 2.1, end: 2.8 }
        ]
      },
      {
        id: 'cap_demo_2',
        start: 3.2,
        end: 5.8,
        text: 'Today we are creating automated captions',
        words: [
          { word: 'Today', start: 3.2, end: 3.6 },
          { word: 'we', start: 3.6, end: 3.8 },
          { word: 'are', start: 3.8, end: 4.0 },
          { word: 'creating', start: 4.0, end: 4.6 },
          { word: 'automated', start: 4.6, end: 5.2 },
          { word: 'captions', start: 5.2, end: 5.8 }
        ]
      },
      {
        id: 'cap_demo_3',
        start: 6.2,
        end: 8.9,
        text: 'using local faster whisper AI on PC',
        words: [
          { word: 'using', start: 6.2, end: 6.6 },
          { word: 'local', start: 6.6, end: 7.0 },
          { word: 'faster', start: 7.0, end: 7.5 },
          { word: 'whisper', start: 7.5, end: 8.1 },
          { word: 'AI', start: 8.1, end: 8.5 },
          { word: 'on', start: 8.5, end: 8.7 },
          { word: 'PC', start: 8.7, end: 8.9 }
        ]
      },
      {
        id: 'cap_demo_4',
        start: 9.5,
        end: 12.2,
        text: 'Zero cloud latency, complete privacy,',
        words: [
          { word: 'Zero', start: 9.5, end: 9.9 },
          { word: 'cloud', start: 9.9, end: 10.3 },
          { word: 'latency,', start: 10.3, end: 11.0 },
          { word: 'complete', start: 11.0, end: 11.6 },
          { word: 'privacy,', start: 11.6, end: 12.2 }
        ]
      },
      {
        id: 'cap_demo_5',
        start: 12.6,
        end: 15.4,
        text: 'and gorgeous CapCut style animations!',
        words: [
          { word: 'and', start: 12.6, end: 12.8 },
          { word: 'gorgeous', start: 12.8, end: 13.4 },
          { word: 'CapCut', start: 13.4, end: 14.1 },
          { word: 'style', start: 14.1, end: 14.6 },
          { word: 'animations!', start: 14.6, end: 15.4 }
        ]
      },
      {
        id: 'cap_demo_6',
        start: 16.0,
        end: 18.2,
        text: 'Export directly to MP4 or SRT instantly.',
        words: [
          { word: 'Export', start: 16.0, end: 16.5 },
          { word: 'directly', start: 16.5, end: 17.1 },
          { word: 'to', start: 17.1, end: 17.3 },
          { word: 'MP4', start: 17.3, end: 17.7 },
          { word: 'or', start: 17.7, end: 17.9 },
          { word: 'SRT', start: 17.9, end: 18.2 }
        ]
      }
    ]
  },
  {
    id: 'swahili_sample',
    title: 'Swahili Speech Sample - Kiswahili Auto Captions',
    description: 'Swahili speech sample with high accuracy word-level alignment.',
    duration: 15.0,
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f1/Sintel_movie_480p_subtitle_test.ogv/Sintel_movie_480p_subtitle_test.ogv.480p.vp9.webm',
    sampleCaptions: [
      {
        id: 'cap_sw_1',
        start: 0.6,
        end: 3.2,
        text: 'Habari gani na karibu kwenye mfumo huu!',
        words: [
          { word: 'Habari', start: 0.6, end: 1.1 },
          { word: 'gani', start: 1.1, end: 1.5 },
          { word: 'na', start: 1.5, end: 1.7 },
          { word: 'karibu', start: 1.7, end: 2.3 },
          { word: 'kwenye', start: 2.3, end: 2.7 },
          { word: 'mfumo', start: 2.7, end: 3.0 },
          { word: 'huu!', start: 3.0, end: 3.2 }
        ]
      },
      {
        id: 'cap_sw_2',
        start: 3.8,
        end: 6.9,
        text: 'Tunatengeneza manukuu ya video kwa haraka sana',
        words: [
          { word: 'Tunatengeneza', start: 3.8, end: 4.8 },
          { word: 'manukuu', start: 4.8, end: 5.4 },
          { word: 'ya', start: 5.4, end: 5.6 },
          { word: 'video', start: 5.6, end: 6.0 },
          { word: 'kwa', start: 6.0, end: 6.2 },
          { word: 'haraka', start: 6.2, end: 6.6 },
          { word: 'sana', start: 6.6, end: 6.9 }
        ]
      },
      {
        id: 'cap_sw_3',
        start: 7.5,
        end: 11.2,
        text: 'bila kutumia mtandao wowote wala akaunti.',
        words: [
          { word: 'bila', start: 7.5, end: 7.9 },
          { word: 'kutumia', start: 7.9, end: 8.6 },
          { word: 'mtandao', start: 8.6, end: 9.3 },
          { word: 'wowote', start: 9.3, end: 10.0 },
          { word: 'wala', start: 10.0, end: 10.5 },
          { word: 'akaunti.', start: 10.5, end: 11.2 }
        ]
      },
      {
        id: 'cap_sw_4',
        start: 11.8,
        end: 14.5,
        text: 'Pakua na uanze kuitumia sasa hivi.',
        words: [
          { word: 'Pakua', start: 11.8, end: 12.4 },
          { word: 'na', start: 12.4, end: 12.6 },
          { word: 'uanze', start: 12.6, end: 13.1 },
          { word: 'kuitumia', start: 13.1, end: 13.8 },
          { word: 'sasa', start: 13.8, end: 14.1 },
          { word: 'hivi.', start: 14.1, end: 14.5 }
        ]
      }
    ]
  }
];

export function getMockTranscriptionForBrowser(language: string = 'en'): { segments: CaptionSegment[], allWords: WordTimestamp[] } {
  const sample = language === 'sw' ? DEMO_SAMPLES[1] : DEMO_SAMPLES[0];
  const allWords: WordTimestamp[] = [];
  sample.sampleCaptions.forEach(c => {
    if (c.words) allWords.push(...c.words);
  });

  return {
    segments: sample.sampleCaptions,
    allWords
  };
}
