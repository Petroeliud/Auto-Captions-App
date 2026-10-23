export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: WordTimestamp[];
}

export type PresetId = 'capcut_classic' | 'tiktok_yellow' | 'neon_cyber' | 'minimal_box' | 'karaoke_wave' | 'cinematic_serif';

export interface CaptionStyle {
  presetId: PresetId;
  fontFamily: string;
  fontSize: number; // in px on 1080p canvas baseline
  fillColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  boxEnabled: boolean;
  boxColor: string;
  boxPaddingVertical: number;
  boxPaddingHorizontal: number;
  boxRadius: number;
  position: 'top' | 'middle' | 'bottom';
  customYPercent?: number; // 0 to 100
  uppercase: boolean;
  wordPopEnabled: boolean;
  highlightColor: string; // Active spoken word color
  wordsPerCaption: number; // Grouping preference (1-10)
}

export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface VideoTrim {
  start: number;
  end: number;
}

export interface ProjectData {
  version: string;
  title: string;
  videoPath: string | null;
  videoDuration: number;
  language: string;
  whisperModel: string;
  captions: CaptionSegment[];
  style: CaptionStyle;
  trim: VideoTrim;
  updatedAt: string;
}

export interface SystemStatus {
  python: boolean;
  fasterWhisper: boolean;
  ffmpeg: boolean;
  isElectron: boolean;
}

export interface WhisperLanguage {
  code: string;
  name: string;
}
