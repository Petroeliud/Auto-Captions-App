import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Film, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Smartphone, 
  Tv, 
  Square,
  StopCircle,
  Play
} from 'lucide-react';
import { AspectRatio, CaptionSegment, CaptionStyle, SystemStatus } from '../types/caption';
import { generateAssSubtitles, generateSrt } from '../utils/captionUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  style: CaptionStyle;
  videoPath: string | null;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspect: AspectRatio) => void;
  systemStatus: SystemStatus;
  onExportSrt: (srtContent: string) => void;
  onBurnVideo: (assContent: string, aspect: AspectRatio, isTestClip?: boolean) => Promise<void>;
  onCancelBurn: () => void;
  isBurning: boolean;
  burnPercent: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  captions,
  style,
  videoPath: _videoPath,
  aspectRatio,
  onAspectRatioChange,
  systemStatus,
  onExportSrt,
  onBurnVideo,
  onCancelBurn,
  isBurning,
  burnPercent
}) => {
  const [activeTab, setActiveTab] = useState<'srt' | 'ass' | 'mp4'>('mp4');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const srtContent = generateSrt(captions, style.uppercase);
  const assContent = generateAssSubtitles(captions, style, aspectRatio);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#121217] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#16161d] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Export Captions & Video</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isBurning}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-zinc-800 bg-[#14141a] px-4 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('mp4')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'mp4'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Burn MP4 Video (FFmpeg)</span>
          </button>

          <button
            onClick={() => setActiveTab('srt')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'srt'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Export Subtitle (.srt)</span>
          </button>

          <button
            onClick={() => setActiveTab('ass')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'ass'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Styled Subtitle (.ass)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'mp4' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Burn styled PCut captions directly into video frames with word-level pop animation using local FFmpeg and bundled fonts.
              </p>

              {/* Aspect Ratio Picker */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Export Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => onAspectRatioChange('16:9')}
                    disabled={isBurning}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      aspectRatio === '16:9'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Tv className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold">16:9 Landscape</span>
                    <span className="text-[10px] text-zinc-500">YouTube / TV</span>
                  </button>

                  <button
                    onClick={() => onAspectRatioChange('9:16')}
                    disabled={isBurning}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      aspectRatio === '9:16'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold">9:16 Vertical</span>
                    <span className="text-[10px] text-zinc-500">TikTok / Reels / Shorts</span>
                  </button>

                  <button
                    onClick={() => onAspectRatioChange('1:1')}
                    disabled={isBurning}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      aspectRatio === '1:1'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Square className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold">1:1 Square</span>
                    <span className="text-[10px] text-zinc-500">Instagram Feed</span>
                  </button>
                </div>
              </div>

              {/* Real Progress Bar */}
              {isBurning && (
                <div className="bg-[#0e0e13] p-4 rounded-xl border border-emerald-500/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      <span className="text-xs font-bold text-white">Rendering & Burning Captions...</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">{burnPercent}%</span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-150"
                      style={{ width: `${Math.min(100, Math.max(0, burnPercent))}%` }}
                    />
                  </div>

                  {/* Cancel Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={onCancelBurn}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Cancel Export</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 5-second Test Export */}
                <button
                  onClick={() => onBurnVideo(assContent, aspectRatio, true)}
                  disabled={isBurning}
                  className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-700 transition-all flex items-center justify-center gap-2"
                  title="Exports first 5 seconds to test preset styling quickly"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                  <span>Test 5s Preview Clip</span>
                </button>

                {/* Full MP4 Export */}
                <button
                  onClick={() => onBurnVideo(assContent, aspectRatio, false)}
                  disabled={isBurning}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Film className="w-4 h-4" />
                  <span>{isBurning ? `Exporting (${burnPercent}%)...` : 'Choose Path & Export MP4'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'srt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Standard Subtitle File (.srt)</span>
                <button
                  onClick={() => copyToClipboard(srtContent)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy SRT'}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={srtContent}
                rows={10}
                className="w-full bg-[#0b0b0e] text-emerald-300 font-mono text-xs p-3 rounded-xl border border-zinc-800 focus:outline-none custom-scrollbar select-all"
              />

              <button
                onClick={() => {
                  if (systemStatus.isElectron) onExportSrt(srtContent);
                  else downloadTextFile(srtContent, 'pcut_captions.srt');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download .SRT Subtitle File</span>
              </button>
            </div>
          )}

          {activeTab === 'ass' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Advanced SubStation Alpha (.ass) with Custom Styling</span>
                <button
                  onClick={() => copyToClipboard(assContent)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy ASS'}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={assContent}
                rows={10}
                className="w-full bg-[#0b0b0e] text-indigo-300 font-mono text-xs p-3 rounded-xl border border-zinc-800 focus:outline-none custom-scrollbar select-all"
              />

              <button
                onClick={() => downloadTextFile(assContent, 'pcut_captions.ass')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download .ASS Styled Subtitle</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
