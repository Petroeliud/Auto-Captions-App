import React, { useRef } from 'react';
import { CaptionSegment, VideoTrim } from '../types/caption';
import { formatTimeDisplay } from '../utils/captionUtils';
import { Scissors, Play } from 'lucide-react';

interface TimelineProps {
  duration: number;
  currentTime: number;
  captions: CaptionSegment[];
  trim: VideoTrim;
  onSeek: (time: number) => void;
  onUpdateTrim: (trim: VideoTrim) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  captions,
  trim,
  onSeek,
  onUpdateTrim,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = duration > 0 ? duration : 30;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percentage * effectiveDuration;
    onSeek(seekTime);
  };

  // Generate tick markers
  const tickCount = 10;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const time = (i / tickCount) * effectiveDuration;
    return {
      percent: (i / tickCount) * 100,
      label: formatTimeDisplay(time).split('.')[0]
    };
  });

  const playheadPercent = Math.max(0, Math.min(100, (currentTime / effectiveDuration) * 100));
  const trimStartPercent = (trim.start / effectiveDuration) * 100;
  const trimEndPercent = ((trim.end || effectiveDuration) / effectiveDuration) * 100;

  return (
    <div className="h-28 bg-[#0e0e12] border-t border-zinc-800/80 px-4 py-2 flex flex-col justify-between select-none relative">
      {/* Timeline Header Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">Timeline Track</span>
          <span className="text-zinc-600">|</span>
          <span className="font-mono text-indigo-400">Playhead: {formatTimeDisplay(currentTime)}</span>
        </div>

        {/* Trim Info */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-amber-400">
            Trim In: {formatTimeDisplay(trim.start)}
          </span>
          <span className="text-amber-400">
            Trim Out: {formatTimeDisplay(trim.end || effectiveDuration)}
          </span>
          {(trim.start > 0 || (trim.end && trim.end < effectiveDuration)) && (
            <button
              onClick={() => onUpdateTrim({ start: 0, end: effectiveDuration })}
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition-colors"
            >
              Reset Trim
            </button>
          )}
        </div>
      </div>

      {/* Interactive Timeline Track Canvas */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative w-full h-14 bg-[#14141d] rounded-xl border border-zinc-800/90 overflow-hidden cursor-pointer my-1 group"
      >
        {/* Ticks Grid Ruler */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-1 opacity-30">
          {ticks.map((t, i) => (
            <div
              key={i}
              className="h-full border-r border-zinc-700 flex flex-col justify-between items-end pr-1 pt-0.5"
              style={{ left: `${t.percent}%` }}
            >
              <span className="text-[9px] font-mono text-zinc-400">{t.label}</span>
            </div>
          ))}
        </div>

        {/* Trim Dimming Overlay (Outside Trim Region) */}
        {trimStartPercent > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/60 backdrop-blur-[1px] pointer-events-none border-r border-amber-500/50"
            style={{ width: `${trimStartPercent}%` }}
          />
        )}
        {trimEndPercent < 100 && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none border-l border-amber-500/50"
            style={{ width: `${100 - trimEndPercent}%` }}
          />
        )}

        {/* Captions Blocks */}
        {captions.map((cap) => {
          const blockLeft = (cap.start / effectiveDuration) * 100;
          const blockWidth = Math.max(0.5, ((cap.end - cap.start) / effectiveDuration) * 100);
          const isActive = currentTime >= cap.start && currentTime <= cap.end;

          return (
            <div
              key={cap.id}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(cap.start);
              }}
              className={`absolute top-2.5 bottom-2 rounded-lg px-2 flex items-center justify-center text-[10px] font-bold truncate transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 z-10 ring-2 ring-white/80 scale-105'
                  : 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-700/50'
              }`}
              style={{
                left: `${blockLeft}%`,
                width: `${blockWidth}%`,
              }}
              title={`${formatTimeDisplay(cap.start)} - ${formatTimeDisplay(cap.end)}: "${cap.text}"`}
            >
              <span className="truncate">{cap.text}</span>
            </div>
          );
        })}

        {/* Red Playhead Vertical Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.9)] transition-all"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-full -translate-x-[4px] -mt-1 shadow-md" />
        </div>
      </div>
    </div>
  );
};
