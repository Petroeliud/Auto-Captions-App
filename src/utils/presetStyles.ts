import { CaptionStyle, PresetId, WhisperLanguage } from '../types/caption';

export interface StylePresetItem {
  id: PresetId;
  name: string;
  description: string;
  previewBg: string;
  style: Partial<CaptionStyle>;
}

export const CAPCUT_PRESETS: StylePresetItem[] = [
  {
    id: 'capcut_classic',
    name: 'CapCut Bold',
    description: 'Heavy white font with thick black outline',
    previewBg: 'bg-black',
    style: {
      presetId: 'capcut_classic',
      fontFamily: 'Montserrat, "Arial Black", sans-serif',
      fontSize: 52,
      fillColor: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 6,
      shadowColor: 'rgba(0,0,0,0.75)',
      shadowBlur: 8,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
      boxEnabled: false,
      boxColor: 'rgba(0,0,0,0.6)',
      boxPaddingVertical: 8,
      boxPaddingHorizontal: 16,
      boxRadius: 8,
      position: 'bottom',
      uppercase: true,
      wordPopEnabled: true,
      highlightColor: '#FFD700', // Gold
    }
  },
  {
    id: 'tiktok_yellow',
    name: 'TikTok Viral Yellow',
    description: 'High-contrast yellow text with bold dark outline & pop',
    previewBg: 'bg-slate-900',
    style: {
      presetId: 'tiktok_yellow',
      fontFamily: '"Outfit", "Arial Black", sans-serif',
      fontSize: 56,
      fillColor: '#FFE600',
      outlineColor: '#000000',
      outlineWidth: 7,
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowBlur: 10,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      boxEnabled: false,
      boxColor: 'rgba(0,0,0,0.7)',
      position: 'bottom',
      uppercase: true,
      wordPopEnabled: true,
      highlightColor: '#00FFFF', // Cyan pop
    }
  },
  {
    id: 'neon_cyber',
    name: 'Neon Glow',
    description: 'Electric cyan text with glowing pink neon backdrop',
    previewBg: 'bg-neutral-950',
    style: {
      presetId: 'neon_cyber',
      fontFamily: '"Urbanist", sans-serif',
      fontSize: 50,
      fillColor: '#00F0FF',
      outlineColor: '#0A0A10',
      outlineWidth: 4,
      shadowColor: '#FF007A',
      shadowBlur: 18,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      boxEnabled: false,
      boxColor: 'rgba(10, 10, 20, 0.8)',
      position: 'bottom',
      uppercase: true,
      wordPopEnabled: true,
      highlightColor: '#FF007A',
    }
  },
  {
    id: 'minimal_box',
    name: 'Minimal Dark Box',
    description: 'Clean modern text inside semi-transparent rounded pill box',
    previewBg: 'bg-zinc-900',
    style: {
      presetId: 'minimal_box',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: 44,
      fillColor: '#FFFFFF',
      outlineColor: 'transparent',
      outlineWidth: 0,
      shadowColor: 'rgba(0,0,0,0.2)',
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 2,
      boxEnabled: true,
      boxColor: 'rgba(0, 0, 0, 0.75)',
      boxPaddingVertical: 10,
      boxPaddingHorizontal: 22,
      boxRadius: 12,
      position: 'bottom',
      uppercase: false,
      wordPopEnabled: true,
      highlightColor: '#38BDF8', // Light sky blue
    }
  },
  {
    id: 'karaoke_wave',
    name: 'Karaoke Wave',
    description: 'Vibrant highlight animation designed for song & voice rhythm',
    previewBg: 'bg-stone-900',
    style: {
      presetId: 'karaoke_wave',
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontSize: 54,
      fillColor: '#E2E8F0',
      outlineColor: '#0F172A',
      outlineWidth: 5,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      shadowBlur: 12,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
      boxEnabled: false,
      boxColor: 'rgba(15, 23, 42, 0.8)',
      position: 'bottom',
      uppercase: true,
      wordPopEnabled: true,
      highlightColor: '#F43F5E', // Rose pink
    }
  },
  {
    id: 'cinematic_serif',
    name: 'Cinematic Serif',
    description: 'Elegant documentary editorial serif with subtle drop shadow',
    previewBg: 'bg-stone-950',
    style: {
      presetId: 'cinematic_serif',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 46,
      fillColor: '#F8FAFC',
      outlineColor: '#000000',
      outlineWidth: 2,
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      shadowBlur: 10,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
      boxEnabled: false,
      boxColor: 'rgba(0,0,0,0.5)',
      position: 'bottom',
      uppercase: false,
      wordPopEnabled: true,
      highlightColor: '#F59E0B', // Amber
    }
  }
];

export const DEFAULT_STYLE: CaptionStyle = { ...CAPCUT_PRESETS[0].style, wordsPerCaption: 3 } as CaptionStyle;

export const SUPPORTED_LANGUAGES: WhisperLanguage[] = [
  { code: 'auto', name: 'Auto-detect Language' },
  { code: 'en', name: 'English' },
  { code: 'sw', name: 'Swahili (Kiswahili)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
];

export const WHISPER_MODELS = [
  { id: 'tiny', name: 'Tiny (39M) - Ultra Fast', memory: '~1 GB VRAM / RAM' },
  { id: 'base', name: 'Base (74M) - Fast', memory: '~1 GB RAM' },
  { id: 'small', name: 'Small (244M) - Balanced (Recommended)', memory: '~2 GB RAM' },
  { id: 'medium', name: 'Medium (769M) - High Accuracy', memory: '~4 GB RAM' },
  { id: 'large-v3', name: 'Large-v3 (1550M) - Best Quality', memory: '~10 GB RAM' }
];

export const BUNDLED_FONTS = [
  { label: 'Montserrat (Bold Clean)', family: 'Montserrat' },
  { label: 'Outfit (Modern Display)', family: 'Outfit' },
  { label: 'Plus Jakarta Sans (SaaS Clean)', family: 'Plus Jakarta Sans' },
  { label: 'Urbanist (Geom Modern)', family: 'Urbanist' },
  { label: 'Playfair Display (Cinematic Serif)', family: 'Playfair Display' }
];

export const COMMON_SYSTEM_FONTS = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Comic Sans MS',
  'Courier New',
  'Franklin Gothic Medium',
  'Georgia',
  'Helvetica',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Palatino Linotype',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
];

export const AVAILABLE_FONTS = [
  { label: 'Montserrat (Bold Clean)', value: 'Montserrat, sans-serif' },
  { label: 'Outfit (Modern Display)', value: '"Outfit", sans-serif' },
  { label: 'Plus Jakarta Sans (SaaS Clean)', value: '"Plus Jakarta Sans", sans-serif' },
  { label: 'Urbanist (Geom Modern)', value: '"Urbanist", sans-serif' },
  { label: 'Playfair Display (Cinematic)', value: '"Playfair Display", serif' },
  { label: 'Impact (Classic Meme / Subtitle)', value: 'Impact, "Arial Black", sans-serif' },
  { label: 'Arial Black (Heavy)', value: '"Arial Black", Gadget, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Georgia (Cinematic Serif)', value: 'Georgia, serif' },
  { label: 'Courier New (Monospace)', value: '"Courier New", monospace' }
];
