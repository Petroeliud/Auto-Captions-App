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
 * Convert Hex color to ASS inline tag format &HBBGGRR&
 */
export function hexToAssBgr(hex: string): string {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length < 6) cleanHex = 'FFFFFF';

  const r = cleanHex.substring(0, 2);
  const g = cleanHex.substring(2, 4);
  const b = cleanHex.substring(4, 6);

  return `&H${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}&`;
}

/**
 * Generate ASS (Advanced SubStation Alpha) subtitle content with PCut style matching
 * Supports word-by-word highlight pop animation, neon glow, custom vertical position, and 9:16 / 1:1 / 16:9 resolution scaling
 */
export function generateAssSubtitles(
  captions: CaptionSegment[],
  style: CaptionStyle,
  aspectRatio: string = '16:9'
): string {
  // 1. Resolution scaling based on aspect ratio
  let playResX = 1920;
  let playResY = 1080;
  let fontScale = 1.0;

  if (aspectRatio === '9:16') {
    playResX = 1080;
    playResY = 1920;
    fontScale = 1.35; // Proportional scaling for vertical video
  } else if (aspectRatio === '1:1') {
    playResX = 1080;
    playResY = 1080;
    fontScale = 1.05;
  }

  const assFontSize = Math.round(style.fontSize * fontScale);

  // 2. Vertical and horizontal positioning (\an5 = middle-center anchor)
  const targetYPercent = style.customYPercent !== undefined
    ? style.customYPercent
    : (style.position === 'top' ? 12 : style.position === 'middle' ? 50 : 80);

  const posX = Math.round(playResX / 2);
  const posY = Math.round((playResY * targetYPercent) / 100);

  // 3. Color and Neon glow styling
  const isNeon = style.presetId === 'neon_cyber' || style.shadowBlur > 14;
  const primaryColor = hexToAssColor(style.fillColor, 0);
  const outlineColor = isNeon
    ? hexToAssColor(style.shadowColor || '#FF007A', 0)
    : hexToAssColor(style.outlineColor, 0);
  const shadowColor = isNeon
    ? hexToAssColor(style.shadowColor || '#FF007A', 20)
    : hexToAssColor(style.shadowColor, 30);
  const backColor = hexToAssColor(style.boxColor, style.boxEnabled ? 20 : 100);

  const normalBgr = hexToAssBgr(style.fillColor);
  const highlightBgr = hexToAssBgr(style.highlightColor || '#FFD700');

  // 4. Font Family
  let fontName = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || 'Montserrat';
  if (style.presetId === 'cinematic_serif' && !fontName.includes('Playfair')) {
    fontName = 'Playfair Display';
  }

  const boldVal = -1; // -1 = Bold in ASS
  const borderStyle = style.boxEnabled ? 3 : 1; // 1 = outline + shadow, 3 = opaque box
  const outlineWidth = isNeon ? Math.max(4, style.outlineWidth) : style.outlineWidth;
  const shadowDepth = style.boxEnabled ? 0 : (isNeon ? 4 : (style.shadowBlur > 0 ? 3 : 0));

  const header = `[Script Info]
Title: PCut Auto Captions Export
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: PCutStyle,${fontName},${assFontSize},${primaryColor},&H0000FFFF,${outlineColor},${style.boxEnabled ? backColor : shadowColor},${boldVal},0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowDepth},5,20,20,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';
  const neonTag = isNeon ? '{\\blur4}' : '';
  const popAnimation = style.wordPopEnabled ? '{\\t(0,80,\\fscx118\\fscy118)\\t(80,160,\\fscx100\\fscy100)}' : '';

  captions.forEach(cap => {
    const words = (cap.words && cap.words.length > 0)
      ? cap.words
      : cap.text.split(/\s+/).filter(Boolean).map((w, i, arr) => {
          const duration = cap.end - cap.start;
          const wDur = duration / arr.length;
          return {
            word: w,
            start: Number((cap.start + i * wDur).toFixed(3)),
            end: Number((cap.start + (i + 1) * wDur).toFixed(3))
          };
        });

    if (words.length > 0) {
      // Lead-in line before first word if gap exists
      if (cap.start < words[0].start - 0.05) {
        const fullNormalText = words.map(w => style.uppercase ? w.word.toUpperCase() : w.word).join(' ');
        events += `Dialogue: 0,${formatAssTime(cap.start)},${formatAssTime(words[0].start)},PCutStyle,,0,0,0,,{\\pos(${posX},${posY})\\an5${neonTag}}${fullNormalText}\n`;
      }

      // One Dialogue event per spoken word with highlight and pop effect
      words.forEach((w, currentWordIdx) => {
        const wStart = Math.max(cap.start, w.start);
        const wEnd = Math.min(cap.end, Math.max(wStart + 0.08, w.end));

        const wordsMarkup = words.map((wordItem, idx) => {
          const rawWord = style.uppercase ? wordItem.word.toUpperCase() : wordItem.word;
          if (idx === currentWordIdx) {
            // Spoken word with highlight color and pop scale
            return `{\\1c${highlightBgr}}${popAnimation}${rawWord}{\\1c${normalBgr}}`;
          }
          return rawWord;
        }).join(' ');

        events += `Dialogue: 0,${formatAssTime(wStart)},${formatAssTime(wEnd)},PCutStyle,,0,0,0,,{\\pos(${posX},${posY})\\an5${neonTag}}${wordsMarkup}\n`;
      });

      // Tail-out line after last word if gap exists
      const lastWord = words[words.length - 1];
      if (cap.end > lastWord.end + 0.05) {
        const fullNormalText = words.map(w => style.uppercase ? w.word.toUpperCase() : w.word).join(' ');
        events += `Dialogue: 0,${formatAssTime(lastWord.end)},${formatAssTime(cap.end)},PCutStyle,,0,0,0,,{\\pos(${posX},${posY})\\an5${neonTag}}${fullNormalText}\n`;
      }
    } else {
      // Fallback single line
      const cleanText = style.uppercase ? cap.text.trim().toUpperCase() : cap.text.trim();
      events += `Dialogue: 0,${formatAssTime(cap.start)},${formatAssTime(cap.end)},PCutStyle,,0,0,0,,{\\pos(${posX},${posY})\\an5${neonTag}}${cleanText}\n`;
    }
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
