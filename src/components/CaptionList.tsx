import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  Split, 
  Combine, 
  Play, 
  Sliders, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';
import { CaptionSegment, CaptionStyle } from '../types/caption';
import { formatTimeDisplay, parseTimeToSeconds } from '../utils/captionUtils';

interface CaptionListProps {
  captions: CaptionSegment[];
  currentTime: number;
  style: CaptionStyle;
  onUpdateCaption: (id: string, updated: Partial<CaptionSegment>) => void;
  onDeleteCaption: (id: string) => void;
  onAddCaption: (atTime?: number) => void;
  onSplitCaption: (id: string, playheadTime: number) => void;
  onMergeCaptions: (id: string) => void;
  onSeekToTime: (time: number) => void;
  onWordsPerCaptionChange: (val: number) => void;
  onRegroupWords: (val: number) => void;
}

export const CaptionList: React.FC<CaptionListProps> = ({
  captions,
  currentTime,
  style,
  onUpdateCaption,
  onDeleteCaption,
  onAddCaption,
  onSplitCaption,
  onMergeCaptions,
  onSeekToTime,
  onWordsPerCaptionChange,
  onRegroupWords,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWordsId, setExpandedWordsId] = useState<string | null>(null);

  const filteredCaptions = captions.filter(c =>
    c.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const debounceTimerRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleSliderChange = (val: number) => {
    onWordsPerCaptionChange(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onRegroupWords(val);
    }, 150);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121217] h-full overflow-hidden border-l border-zinc-800/80 select-none">
      {/* Top Header & Words per Caption Controls */}
      <div className="p-4 border-b border-zinc-800/80 space-y-3 bg-[#15151c]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Transcript & Captions</h2>
          </div>

          <button
            onClick={() => onAddCaption(currentTime)}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        {/* Group Words Slider */}
        <div className="bg-[#1a1a24] p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Words per Caption:</span>
            </span>
            <span className="text-indigo-400 font-bold font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
              {style.wordsPerCaption || 3} words
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={style.wordsPerCaption || 3}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                handleSliderChange(val);
              }}
              className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => onRegroupWords(style.wordsPerCaption || 3)}
              disabled={captions.length === 0}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-200 rounded-md border border-zinc-700 transition-colors shrink-0"
              title="Manual re-group words with this count"
            >
              Re-group
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/90 text-zinc-200 text-xs rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Captions Scrollable Table / List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {filteredCaptions.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <Clock className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400 font-medium">No captions found</p>
            <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">
              Click "Auto Captions" above or import a video to generate speech-to-text transcript.
            </p>
          </div>
        ) : (
          filteredCaptions.map((cap, index) => {
            const isActive = currentTime >= cap.start && currentTime <= cap.end;
            const isExpanded = expandedWordsId === cap.id;

            return (
              <div
                key={cap.id}
                className={`group p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-indigo-950/25 border-indigo-500/80 shadow-lg shadow-indigo-500/10'
                    : 'bg-[#181820] hover:bg-[#1c1c26] border-zinc-800/80'
                }`}
              >
                {/* Row Header: Timestamps & Controls */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {/* Jump to time button */}
                    <button
                      onClick={() => onSeekToTime(cap.start)}
                      className={`p-1 rounded text-xs flex items-center gap-1 font-mono transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                      title="Jump video to this start time"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{formatTimeDisplay(cap.start)}</span>
                    </button>

                    <span className="text-zinc-600 text-xs font-mono">-</span>

                    {/* End time input */}
                    <input
                      type="text"
                      value={formatTimeDisplay(cap.end)}
                      onChange={(e) => {
                        const sec = parseTimeToSeconds(e.target.value);
                        if (sec > cap.start) onUpdateCaption(cap.id, { end: sec });
                      }}
                      className="w-16 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Actions: Split, Merge, Delete */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Split button */}
                    <button
                      onClick={() => onSplitCaption(cap.id, currentTime)}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 rounded transition-colors"
                      title="Split caption at playhead"
                    >
                      <Split className="w-3.5 h-3.5" />
                    </button>

                    {/* Merge button */}
                    {index < captions.length - 1 && (
                      <button
                        onClick={() => onMergeCaptions(cap.id)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 rounded transition-colors"
                        title="Merge with next caption"
                      >
                        <Combine className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteCaption(cap.id)}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded transition-colors"
                      title="Delete caption"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Editable Caption Text Area */}
                <textarea
                  value={cap.text}
                  onChange={(e) => onUpdateCaption(cap.id, { text: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-900/90 text-zinc-100 text-xs font-medium p-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  placeholder="Caption text..."
                />

                {/* Word Timestamps Inspector Toggle */}
                {cap.words && cap.words.length > 0 && (
                  <div className="mt-2 pt-1 border-t border-zinc-800/60">
                    <button
                      onClick={() => setExpandedWordsId(isExpanded ? null : cap.id)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{cap.words.length} word timestamps</span>
                    </button>

                    {/* Expanded Word Inspector */}
                    {isExpanded && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                        {cap.words.map((w, wIdx) => {
                          const isWordActive = currentTime >= w.start && currentTime <= w.end;
                          return (
                            <div
                              key={wIdx}
                              className={`p-1.5 rounded text-[10px] font-mono flex items-center justify-between ${
                                isWordActive
                                  ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50'
                                  : 'bg-zinc-800/60 text-zinc-400'
                              }`}
                            >
                              <span className="font-sans font-semibold text-zinc-200 truncate max-w-[70px]">
                                {w.word}
                              </span>
                              <span>{formatTimeDisplay(w.start)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
