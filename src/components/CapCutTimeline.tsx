import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CaptionSegment, VideoTrim } from '../types/caption';
import { formatTimeDisplay } from '../utils/captionUtils';
import { 
  ZoomIn, 
  ZoomOut, 
  Split, 
  Plus, 
  Trash2, 
  Volume2, 
  Film, 
  Type 
} from 'lucide-react';

interface CapCutTimelineProps {
  duration: number;
  currentTime: number;
  captions: CaptionSegment[];
  trim: VideoTrim;
  audioPeaks: number[];
  onSeek: (time: number) => void;
  onUpdateCaption: (id: string, updated: Partial<CaptionSegment>) => void;
  onDeleteCaption: (id: string) => void;
  onAddCaption: (atTime: number) => void;
  onSplitCaption: (id: string, atTime: number) => void;
  onUpdateTrim: (trim: VideoTrim) => void;
}

export const CapCutTimeline: React.FC<CapCutTimelineProps> = ({
  duration,
  currentTime,
  captions,
  trim,
  audioPeaks,
  onSeek,
  onUpdateCaption,
  onDeleteCaption,
  onAddCaption,
  onSplitCaption,
  onUpdateTrim,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 10x zoom
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right';
    captionId: string;
    initialX: number;
    initialStart: number;
    initialEnd: number;
    currentDeltaTime?: number;
  } | null>(null);

  const effectiveDuration = duration > 0 ? duration : 30;

  // Calculate pixel width per second based on zoom level
  const baseWidth = containerRef.current ? containerRef.current.clientWidth : 800;
  const totalTimelineWidth = Math.max(baseWidth, baseWidth * zoomLevel);
  const pxPerSec = totalTimelineWidth / effectiveDuration;

  // Convert time to pixels
  const timeToPx = useCallback((t: number) => t * pxPerSec, [pxPerSec]);
  // Convert pixels to time
  const pxToTime = useCallback((px: number) => Math.max(0, Math.min(effectiveDuration, px / pxPerSec)), [effectiveDuration, pxPerSec]);

  // Synchronize horizontal scroll position with video currentTime during playback
  useEffect(() => {
    if (!trackAreaRef.current || isScrubbing || dragState) return;
    const container = trackAreaRef.current;
    const playheadPx = timeToPx(currentTime);
    const visibleWidth = container.clientWidth;

    // Center playhead in scroll view
    const targetScrollLeft = Math.max(0, playheadPx - visibleWidth / 2);
    container.scrollLeft = targetScrollLeft;
  }, [currentTime, timeToPx, isScrubbing, dragState]);

  // Handle Scrubbing (Clicking/Dragging playhead across timeline)
  const handleScrubStart = (e: React.MouseEvent) => {
    if (dragState) return;
    setIsScrubbing(true);
    updatePlayheadFromMouseEvent(e);
  };

  const updatePlayheadFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!trackAreaRef.current) return;
    const rect = trackAreaRef.current.getBoundingClientRect();
    const scrollLeft = trackAreaRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const seekTime = pxToTime(clickX);
    onSeek(seekTime);
  }, [pxToTime, onSeek]);

  // Global mouse listeners for scrubbing and caption dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing) {
        updatePlayheadFromMouseEvent(e);
      } else if (dragState) {
        const deltaPx = e.clientX - dragState.initialX;
        const deltaTime = deltaPx / pxPerSec;

        setDragState(prev => prev ? { ...prev, currentDeltaTime: deltaTime } : null);

        if (dragState.type === 'move') {
          const capDuration = dragState.initialEnd - dragState.initialStart;
          const newStart = Math.max(0, Math.min(effectiveDuration - capDuration, dragState.initialStart + deltaTime));
          const newEnd = newStart + capDuration;
          const timeShift = newStart - dragState.initialStart;

          // Shift word timestamps proportionally
          const targetCap = captions.find(c => c.id === dragState.captionId);
          const shiftedWords = (targetCap?.words || []).map(w => ({
            ...w,
            start: Number(Math.max(0, w.start + timeShift).toFixed(3)),
            end: Number(Math.max(0, w.end + timeShift).toFixed(3))
          }));

          onUpdateCaption(dragState.captionId, {
            start: Number(newStart.toFixed(3)),
            end: Number(newEnd.toFixed(3)),
            words: shiftedWords
          });
        } else if (dragState.type === 'resize-left') {
          const newStart = Math.max(0, Math.min(dragState.initialEnd - 0.2, dragState.initialStart + deltaTime));
          onUpdateCaption(dragState.captionId, { start: Number(newStart.toFixed(3)) });
        } else if (dragState.type === 'resize-right') {
          const newEnd = Math.min(effectiveDuration, Math.max(dragState.initialStart + 0.2, dragState.initialEnd + deltaTime));
          onUpdateCaption(dragState.captionId, { end: Number(newEnd.toFixed(3)) });
        }
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
      if (dragState) setDragState(null);
    };

    if (isScrubbing || dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, dragState, updatePlayheadFromMouseEvent, pxPerSec, effectiveDuration, captions, onUpdateCaption]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' && selectedCaptionId) {
        onDeleteCaption(selectedCaptionId);
        setSelectedCaptionId(null);
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey) && selectedCaptionId) {
        e.preventDefault();
        onSplitCaption(selectedCaptionId, currentTime);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCaptionId, currentTime, onDeleteCaption, onSplitCaption]);

  // Generate tick marks for time ruler
  const tickInterval = zoomLevel > 5 ? 0.5 : zoomLevel > 2 ? 1 : 2; // interval in seconds
  const totalTicks = Math.floor(effectiveDuration / tickInterval);
  const ticks = Array.from({ length: totalTicks + 1 }, (_, i) => i * tickInterval);

  const playheadPx = timeToPx(currentTime);

  return (
    <div
      ref={containerRef}
      className="h-44 bg-[#0d0d11] border-t border-zinc-800 flex flex-col justify-between select-none relative z-10"
    >
      {/* Timeline Control Toolbar */}
      <div className="h-10 bg-[#121217] border-b border-zinc-800 px-4 flex items-center justify-between gap-4 text-xs">
        {/* Left Action Tools */}
        <div className="flex items-center gap-2">
          {/* Add Caption */}
          <button
            onClick={() => onAddCaption(currentTime)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            title="Add new subtitle block at playhead"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Text</span>
          </button>

          {/* Split at Playhead */}
          <button
            onClick={() => {
              const activeCap = captions.find(c => currentTime >= c.start && currentTime <= c.end);
              if (activeCap) onSplitCaption(activeCap.id, currentTime);
            }}
            disabled={!captions.some(c => currentTime >= c.start && currentTime <= c.end)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700/60 transition-colors"
            title="Split subtitle block at playhead (Ctrl+S)"
          >
            <Split className="w-3.5 h-3.5 text-indigo-400" />
            <span>Split</span>
          </button>

          {/* Delete Selected */}
          <button
            onClick={() => {
              if (selectedCaptionId) {
                onDeleteCaption(selectedCaptionId);
                setSelectedCaptionId(null);
              }
            }}
            disabled={!selectedCaptionId}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-rose-400 rounded-lg border border-zinc-700/60 transition-colors"
            title="Delete selected subtitle (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center Counter */}
        <div className="font-mono text-[11px] text-zinc-400 flex items-center gap-2">
          <span className="text-zinc-200 font-bold">{formatTimeDisplay(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span>{formatTimeDisplay(effectiveDuration)}</span>
          {dragState && dragState.currentDeltaTime !== undefined && (
            <span className="bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-800/60">
              Shift: {dragState.currentDeltaTime > 0 ? '+' : ''}{dragState.currentDeltaTime.toFixed(2)}s
            </span>
          )}
        </div>

        {/* Right Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomLevel(z => Math.max(1, z - 1))}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-20 accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <button
              onClick={() => setZoomLevel(z => Math.min(10, z + 1))}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Timeline Area */}
      <div
        ref={trackAreaRef}
        onMouseDown={handleScrubStart}
        className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#09090c] cursor-pointer scroll-smooth"
      >
        <div
          className="relative h-full"
          style={{ width: `${totalTimelineWidth}px` }}
        >
          {/* Track 1: Time Ruler */}
          <div className="h-6 bg-[#111116] border-b border-zinc-800/80 relative pointer-events-none">
            {ticks.map((t) => {
              const leftPx = timeToPx(t);
              return (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 border-l border-zinc-700/60 pl-1 pt-0.5 flex items-start"
                  style={{ left: `${leftPx}px` }}
                >
                  <span className="text-[9px] font-mono text-zinc-400">{formatTimeDisplay(t).split('.')[0]}</span>
                </div>
              );
            })}
          </div>

          {/* Track 2: Video Track */}
          <div className="h-8 border-b border-zinc-800/60 bg-[#14141d] relative flex items-center px-2 gap-2 my-0.5">
            <Film className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <div className="flex-1 h-5 bg-indigo-950/40 border border-indigo-800/40 rounded flex items-center px-2 text-[10px] text-zinc-400 font-mono">
              Video Track ({formatTimeDisplay(effectiveDuration)})
            </div>
          </div>

          {/* Track 3: Audio Waveform Track */}
          <div className="h-7 border-b border-zinc-800/60 bg-[#101016] relative flex items-center px-2 gap-1 overflow-hidden">
            <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mr-1" />
            <div className="flex-1 h-full flex items-center justify-between gap-[1px]">
              {audioPeaks.length > 0 ? (
                audioPeaks.map((peak, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-emerald-500/60 rounded-full transition-all"
                    style={{ height: `${Math.max(15, peak * 80)}%` }}
                  />
                ))
              ) : (
                <div className="w-full text-[9px] font-mono text-zinc-600">Audio Waveform Track</div>
              )}
            </div>
          </div>

          {/* Track 4: Captions Track */}
          <div className="h-10 bg-[#12121a] relative flex items-center">
            <Type className="w-3.5 h-3.5 text-purple-400 shrink-0 absolute left-2 z-10 pointer-events-none" />

            {/* Draggable Caption Blocks */}
            {captions.map((cap) => {
              const leftPx = timeToPx(cap.start);
              const widthPx = Math.max(12, timeToPx(cap.end - cap.start));
              const isSelected = selectedCaptionId === cap.id;
              const isActive = currentTime >= cap.start && currentTime <= cap.end;

              return (
                <div
                  key={cap.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCaptionId(cap.id);
                    onSeek(cap.start);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedCaptionId(cap.id);
                    setDragState({
                      type: 'move',
                      captionId: cap.id,
                      initialX: e.clientX,
                      initialStart: cap.start,
                      initialEnd: cap.end
                    });
                  }}
                  className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[10px] font-bold truncate cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white ring-2 ring-white shadow-lg shadow-indigo-500/40 z-20'
                      : isActive
                      ? 'bg-indigo-600 text-white ring-1 ring-indigo-400 z-10'
                      : 'bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60'
                  }`}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                  }}
                  title={`${formatTimeDisplay(cap.start)} - ${formatTimeDisplay(cap.end)}: "${cap.text}"`}
                >
                  {/* Left Resize Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({
                        type: 'resize-left',
                        captionId: cap.id,
                        initialX: e.clientX,
                        initialStart: cap.start,
                        initialEnd: cap.end
                      });
                    }}
                    className="w-1.5 h-full bg-white/40 hover:bg-white rounded-l -ml-2 cursor-ew-resize shrink-0"
                  />

                  {/* Caption Text */}
                  <span className="truncate px-1 select-none pointer-events-none">
                    {cap.text}
                  </span>

                  {/* Right Resize Handle */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({
                        type: 'resize-right',
                        captionId: cap.id,
                        initialX: e.clientX,
                        initialStart: cap.start,
                        initialEnd: cap.end
                      });
                    }}
                    className="w-1.5 h-full bg-white/40 hover:bg-white rounded-r -mr-2 cursor-ew-resize shrink-0"
                  />
                </div>
              );
            })}
          </div>

          {/* Red Scrubbing Playhead Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(244,63,94,1)] transition-all"
            style={{ left: `${playheadPx}px` }}
          >
            <div className="w-3.5 h-3.5 bg-rose-500 rounded-full -translate-x-[6px] -mt-1 shadow-md border-2 border-white" />
          </div>
        </div>
      </div>
    </div>
  );
};
