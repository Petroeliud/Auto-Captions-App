import React from 'react';
import { X, CheckCircle2, AlertTriangle, Terminal, Cpu, HardDrive } from 'lucide-react';
import { SystemStatus } from '../types/caption';

interface SystemCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemStatus: SystemStatus;
  onRecheckDeps: () => void;
}

export const SystemCheckModal: React.FC<SystemCheckModalProps> = ({
  isOpen,
  onClose,
  systemStatus,
  onRecheckDeps
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#121217] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-[#16161d] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Local System Dependencies</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            CapCut Auto Captions runs speech recognition offline on your PC using Python faster-whisper and FFmpeg for video processing.
          </p>

          {/* Dependency Status Cards */}
          <div className="space-y-2">
            {/* Python Status */}
            <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {systemStatus.python ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">Python 3.8+ Runtime</span>
                  <span className="text-[10px] text-zinc-400">Required for running faster-whisper AI</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                systemStatus.python ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
              }`}>
                {systemStatus.python ? 'Detected' : 'Not Found'}
              </span>
            </div>

            {/* faster-whisper Status */}
            <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {systemStatus.fasterWhisper ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">faster-whisper (Python Package)</span>
                  <span className="text-[10px] text-zinc-400">High-speed speech-to-text with word alignment</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                systemStatus.fasterWhisper ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
              }`}>
                {systemStatus.fasterWhisper ? 'Installed' : 'Missing'}
              </span>
            </div>

            {/* FFmpeg Status */}
            <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {systemStatus.ffmpeg ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">FFmpeg Video Processing</span>
                  <span className="text-[10px] text-zinc-400">Required to burn captions into MP4 files</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                systemStatus.ffmpeg ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
              }`}>
                {systemStatus.ffmpeg ? 'Ready' : 'Not Found'}
              </span>
            </div>
          </div>

          {/* Quick Install Commands for Windows */}
          {(!systemStatus.python || !systemStatus.fasterWhisper || !systemStatus.ffmpeg) && (
            <div className="bg-[#0c0c10] p-3 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>Windows Quick Setup Commands</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-zinc-300 bg-black/80 p-2.5 rounded border border-zinc-800 select-all">
                {!systemStatus.fasterWhisper && <p className="text-indigo-300">pip install faster-whisper</p>}
                {!systemStatus.ffmpeg && <p className="text-indigo-300">winget install FFmpeg</p>}
              </div>
            </div>
          )}

          {/* Re-check button */}
          <div className="pt-2">
            <button
              onClick={onRecheckDeps}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md transition-colors"
            >
              Re-check System Dependencies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
