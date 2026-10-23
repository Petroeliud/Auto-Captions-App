import React from 'react';
import { 
  Video, 
  Sparkles, 
  FolderOpen, 
  Save, 
  Download, 
  Settings, 
  Globe, 
  Cpu, 
  Scissors
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, WHISPER_MODELS } from '../utils/presetStyles';
import { SystemStatus } from '../types/caption';

interface HeaderProps {
  systemStatus: SystemStatus;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  isTranscribing: boolean;
  onStartTranscription: () => void;
  onImportVideo: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onRemoveSilences: () => void;
  hasVideo: boolean;
  hasCaptions: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus,
  selectedLanguage,
  onLanguageChange,
  selectedModel,
  onModelChange,
  isTranscribing,
  onStartTranscription,
  onImportVideo,
  onOpenProject,
  onSaveProject,
  onOpenExport,
  onOpenSettings,
  onRemoveSilences,
  hasVideo,
  hasCaptions,
}) => {
  return (
    <header className="h-16 bg-[#121217] border-b border-zinc-800/80 px-5 flex items-center justify-between select-none gap-4">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#121217] rounded-[10px] flex items-center justify-center">
            <Video className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            PCut
          </span>
          <span className="hidden sm:inline-block text-[10px] font-medium text-zinc-500 ml-2 px-1.5 py-0.5 bg-zinc-800/60 rounded border border-zinc-700/50">
            {systemStatus.isElectron ? 'Desktop Offline (int8 CPU)' : 'Local Engine'}
          </span>
        </div>
      </div>

      {/* Auto Captions Bar: Language + Model + Run Button */}
      <div className="flex items-center gap-2 bg-[#1a1a22] p-1.5 rounded-xl border border-zinc-800 shadow-inner">
        {/* Language Selector */}
        <div className="relative flex items-center">
          <Globe className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700/60 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            title="Speech Recognition Language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Model Selector */}
        <div className="relative hidden md:flex items-center">
          <Cpu className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700/60 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
            title="faster-whisper AI Model Size"
          >
            {WHISPER_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Auto Captions Button */}
        <button
          onClick={onStartTranscription}
          disabled={!hasVideo || isTranscribing}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all whitespace-nowrap ${
            isTranscribing
              ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
              : hasVideo
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-95'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isTranscribing ? 'animate-spin' : ''}`} />
          <span>{isTranscribing ? 'Analyzing Video Audio...' : 'Auto Captions'}</span>
        </button>
      </div>

      {/* Toolbar Actions */}
      <div className="flex items-center gap-2">
        {/* Silence Remover Button */}
        {hasCaptions && (
          <button
            onClick={onRemoveSilences}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors"
            title="Automatically detect silent gaps > 0.5s and remove them"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Remove Silences</span>
          </button>
        )}

        {/* Import Video */}
        <button
          onClick={onImportVideo}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors border border-indigo-500/40"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Import Video</span>
        </button>

        {/* Open Project */}
        <button
          onClick={onOpenProject}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors border border-zinc-700/60"
          title="Open saved .json project"
        >
          <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span>Project</span>
        </button>

        {/* Save Project */}
        <button
          onClick={onSaveProject}
          disabled={!hasVideo}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg transition-colors border border-zinc-700/60"
          title="Save Project JSON"
        >
          <Save className="w-4 h-4 text-zinc-300" />
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          disabled={!hasVideo}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg text-xs shadow-md shadow-emerald-900/20 transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* System / Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700/60 transition-colors"
          title="Dependencies & Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
