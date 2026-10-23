import { CaptionSegment, WordTimestamp } from '../types/caption';

/**
 * Extract audio waveform peaks from video URL for visual timeline rendering
 */
export async function extractAudioWaveform(videoUrl: string, samplePoints: number = 200): Promise<number[]> {
  try {
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

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

    audioCtx.close();
    return peaks;
  } catch (err) {
    console.warn('Could not extract audio waveform:', err);
    return [];
  }
}

/**
 * Send video file to local Express server endpoint POST /api/transcribe
 * which executes local `python transcribe.py "<path>" <language>` using faster-whisper.
 */
export async function transcribeVideoViaServer(
  videoFile: File | Blob,
  language: string = 'auto',
  modelSize: string = 'small'
): Promise<{
  success: boolean;
  detected_language: string;
  segments: CaptionSegment[];
  all_words: WordTimestamp[];
}> {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('language', language);
  formData.append('modelSize', modelSize);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => {
    throw new Error(`Server returned non-JSON response with HTTP status ${response.status}`);
  });

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Local transcription failed (HTTP ${response.status})`);
  }

  return {
    success: true,
    detected_language: data.detected_language || language,
    segments: data.segments || [],
    all_words: data.all_words || [],
  };
}
