import { CaptionSegment, WordTimestamp } from '../types/caption';

/**
 * Extract audio waveform peaks from video URL for visual timeline rendering
 */
export async function extractAudioWaveform(videoUrl: string, samplePoints: number = 200): Promise<number[]> {
  try {
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return [];

    const audioCtx = new AudioCtxClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / samplePoints);
    const peaks: number[] = [];

    for (let i = 0; i < samplePoints; i++) {
      const start = i * step;
      let max = 0;
      for (let j = 0; j < step && start + j < channelData.length; j++) {
        const val = Math.abs(channelData[start + j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    audioCtx.close().catch(() => {});
    return peaks;
  } catch (err) {
    console.warn('Could not extract audio waveform:', err);
    return [];
  }
}

/**
 * Encodes an AudioBuffer into a 16-bit PCM Mono WAV Blob (16,000 Hz)
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1; // mono for Whisper
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const format = 1; // PCM

  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * 2; // 16-bit = 2 bytes per sample
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Extract audio track from video file and resample to 16kHz mono WAV in browser
 * Reduces upload payload from 50MB-500MB video down to ~2-5MB audio file
 */
export async function extractAudioWavFromVideo(fileOrBlob: File | Blob): Promise<Blob> {
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioCtx = new AudioCtxClass();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    // Resample to 16,000 Hz Mono (Whisper optimal standard)
    const targetSampleRate = 16000;
    const numFrames = Math.max(1, Math.floor(audioBuffer.duration * targetSampleRate));

    const offlineCtx = new OfflineAudioContext(1, numFrames, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    return audioBufferToWav(rendered);
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Send media to local Express server endpoint POST /api/transcribe
 * which executes local `python transcribe.py "<path>" <language>` using faster-whisper.
 */
export async function transcribeVideoViaServer(
  videoFile: File | Blob,
  language: string = 'auto',
  modelSize: string = 'small',
  onProgress?: (msg: string) => void
): Promise<{
  success: boolean;
  detected_language: string;
  duration?: number;
  segments: CaptionSegment[];
  all_words: WordTimestamp[];
}> {
  let fileToSend: Blob = videoFile;
  let fileName = (videoFile as File).name || 'video.mp4';

  // 1. In web browser environments, extract lightweight 16kHz audio to avoid HTTP 413 (Payload Too Large)
  try {
    if (onProgress) onProgress('Extracting audio track for fast upload...');
    console.log(`[AudioAnalyzer] Extracting 16kHz audio from input media (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)...`);
    const audioBlob = await extractAudioWavFromVideo(videoFile);
    fileToSend = audioBlob;
    fileName = 'audio_track.wav';
    console.log(`[AudioAnalyzer] Audio extracted successfully: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (extractErr) {
    console.warn('[AudioAnalyzer] Could not extract audio in browser, falling back to original file:', extractErr);
    // If the original file is greater than 28MB and cannot be extracted, warn about potential HTTP 413
    if (videoFile.size > 28 * 1024 * 1024) {
      throw new Error(
        `Video is ${(videoFile.size / 1024 / 1024).toFixed(1)} MB and audio could not be extracted in the browser. Please import a standard MP4 file or run the desktop Electron app.`
      );
    }
  }

  if (onProgress) onProgress('Uploading audio to local transcription engine...');

  const formData = new FormData();
  formData.append('video', fileToSend, fileName);
  formData.append('language', language);
  formData.append('modelSize', modelSize);

  let response: Response;
  let responseText: string;

  try {
    response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    responseText = await response.text();
  } catch (networkErr: any) {
    throw new Error(`Failed to connect to local transcription server: ${networkErr.message}`);
  }

  if (response.status === 413) {
    throw new Error(
      'Media file is too large for web upload (HTTP 413). Please run the app in desktop Electron or use a shorter clip.'
    );
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Server returned unexpected response (HTTP ${response.status}): ${responseText.slice(0, 150)}`
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Local transcription failed (HTTP ${response.status})`);
  }

  return {
    success: true,
    detected_language: data.detected_language || language,
    duration: data.duration,
    segments: data.segments || [],
    all_words: data.all_words || [],
  };
}
