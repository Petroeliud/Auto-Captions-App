import { CaptionSegment, CaptionStyle, WordTimestamp } from '../types/caption';

/**
 * Format seconds to MM:SS.ms display format (e.g. 01:23.4)
 */
export function formatTimeDisplay(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}.${ms}`;
}

/**
 * Format seconds to SRT timestamp HH:MM:SS,mmm
 */
export function formatSrtTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00,000';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const mmm = String(ms).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Parse time string (MM:SS.ms or seconds) to seconds number
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  if (/^\d+(\.\d+)?$/.test(timeStr.trim())) {
    return parseFloat(timeStr.trim());
  }
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  } else if (parts.length === 3) {
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  }
  return 0;
}

/**
 * Extract all words sequentially from list of segments
 */
export function extractAllWords(segments: CaptionSegment[]): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  for (const seg of segments) {
    if (seg.words && seg.words.length > 0) {
      words.push(...seg.words);
    } else if (seg.text) {
      // Fallback: divide segment duration evenly across space-split words
      const textWords = seg.text.split(/\s+/).filter(Boolean);
      if (textWords.length > 0) {
        const wordDuration = (seg.end - seg.start) / textWords.length;
        textWords.forEach((w, i) => {
          words.push({
            word: w,
            start: Number((seg.start + i * wordDuration).toFixed(3)),
            end: Number((seg.start + (i + 1) * wordDuration).toFixed(3))
          });
        });
      }
    }
  }
  return words;
}

/**
 * Regroup list of word timestamps into short N-word caption segments
 */
export function groupWordsIntoCaptions(words: WordTimestamp[], wordsPerCaption: number = 3): CaptionSegment[] {
  if (!words || words.length === 0) return [];

  const count = Math.max(1, Math.min(10, wordsPerCaption));
  const segments: CaptionSegment[] = [];

  for (let i = 0; i < words.length; i += count) {
    const chunk = words.slice(i, i + count);
    if (chunk.length === 0) continue;

    const start = chunk[0].start;
    const end = chunk[chunk.length - 1].end;
    const text = chunk.map(w => w.word).join(' ');

    segments.push({
      id: `cap_${Date.now()}_${i}`,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text,
      words: chunk
    });
  }

  return segments;
}

/**
 * Generate standard SRT formatted string
 */
export function generateSrt(captions: CaptionSegment[], uppercase: boolean = false): string {
  let srt = '';
  captions.forEach((cap, index) => {
    const num = index + 1;
    const startStr = formatSrtTime(cap.start);
    const endStr = formatSrtTime(cap.end);
    let textStr = cap.text.trim();
    if (uppercase) textStr = textStr.toUpperCase();

    srt += `${num}\n${startStr} --> ${endStr}\n${textStr}\n\n`;
  });
  return srt;
}

/**
 * Convert HTML/CSS Hex color to ASS subtitle format &HAABBGGRR
 */
export function hexToAssColor(hex: string, alphaPercent: number = 0): string {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length < 6) cleanHex = 'FFFFFF';

  const r = cleanHex.substring(0, 2);
  const g = cleanHex.substring(2, 4);
  const b = cleanHex.substring(4, 6);

  // Alpha in hex (00 = opaque, FF = fully transparent)
  const alphaHex = Math.min(255, Math.max(0, Math.round(alphaPercent * 2.55)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

  return `&H${alphaHex}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
}

/**
 * Generate ASS (Advanced SubStation Alpha) subtitle content with CapCut style matching
 */
export function generateAssSubtitles(captions: CaptionSegment[], style: CaptionStyle): string {
  const primaryColor = hexToAssColor(style.fillColor, 0);
  const outlineColor = hexToAssColor(style.outlineColor, 0);
  const shadowColor = hexToAssColor(style.shadowColor, 30);
  const backColor = hexToAssColor(style.boxColor, style.boxEnabled ? 20 : 100);

  // Alignment: 2 = bottom-center, 5 = middle-center, 8 = top-center
  let alignment = 2;
  if (style.position === 'top') alignment = 8;
  else if (style.position === 'middle') alignment = 5;

  const fontName = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || 'Arial';
  const boldVal = -1; // -1 = true in ASS
  const borderStyle = style.boxEnabled ? 3 : 1; // 1 = outline + drop shadow, 3 = opaque box

  const header = `[Script Info]
Title: CapCut Auto Captions Export
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CapCutStyle,${fontName},${style.fontSize},${primaryColor},&H0000FFFF,${outlineColor},${style.boxEnabled ? backColor : shadowColor},${boldVal},0,0,0,100,100,0,0,${borderStyle},${style.outlineWidth},${style.shadowBlur > 0 ? 2 : 0},${alignment},20,20,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';
  captions.forEach(cap => {
    const startStr = formatAssTime(cap.start);
    const endStr = formatAssTime(cap.end);
    let textStr = cap.text.trim();
    if (style.uppercase) textStr = textStr.toUpperCase();

    // Escape line breaks
    textStr = textStr.replace(/\n/g, '\\N');

    events += `Dialogue: 0,${startStr},${endStr},CapCutStyle,,0,0,0,,${textStr}\n`;
  });

  return header + events;
}

function formatAssTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100); // centiseconds

  const h = String(hrs);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const c = String(cs).padStart(2, '0');

  return `${h}:${mm}:${ss}.${c}`;
}

/**
 * Remove silences: identifies silent gaps > minGapSeconds and returns trimmed list or non-silent regions
 */
export function detectSilencesAndRemove(
  captions: CaptionSegment[],
  minGapSeconds: number = 0.5
): {
  cleanedCaptions: CaptionSegment[];
  removedGapsCount: number;
  savedSeconds: number;
} {
  if (captions.length <= 1) {
    return { cleanedCaptions: captions, removedGapsCount: 0, savedSeconds: 0 };
  }

  const sorted = [...captions].sort((a, b) => a.start - b.start);
  const cleaned: CaptionSegment[] = [];
  let removedGapsCount = 0;
  let savedSeconds = 0;

  let currentShift = 0;

  for (let i = 0; i < sorted.length; i++) {
    const cap = sorted[i];

    if (i > 0) {
      const prev = sorted[i - 1];
      const gap = cap.start - prev.end;

      if (gap > minGapSeconds) {
        const excess = gap - 0.1; // leave 100ms natural breather
        currentShift += excess;
        removedGapsCount++;
        savedSeconds += excess;
      }
    }

    const newStart = Math.max(0, cap.start - currentShift);
    const duration = cap.end - cap.start;
    const newEnd = newStart + duration;

    // Shift word timestamps
    const shiftedWords = (cap.words || []).map(w => ({
      ...w,
      start: Math.max(0, w.start - currentShift),
      end: Math.max(0, w.end - currentShift)
    }));

    cleaned.push({
      ...cap,
      start: Number(newStart.toFixed(3)),
      end: Number(newEnd.toFixed(3)),
      words: shiftedWords
    });
  }

  return {
    cleanedCaptions: cleaned,
    removedGapsCount,
    savedSeconds: Number(savedSeconds.toFixed(2))
  };
}
