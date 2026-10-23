import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Upload, 
  Sparkles,
  Smartphone,
  Tv,
  Square,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { AspectRatio, CaptionSegment, CaptionStyle } from '../types/caption';
import { formatTimeDisplay, getCaptionMetrics } from '../utils/captionUtils';
import { getSyntheticVideoUrl } from '../utils/sampleVideos';

interface VideoPlayerProps {
  videoUrl: string | null;
  captions: CaptionSegment[];
  style: CaptionStyle;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspect: AspectRatio) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (dur: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onDropFile: (file: File) => void;
  onImportClick: () => void;
  isTranscribing: boolean;
  transcriptionProgress: string;
  transcriptionPercent?: number;
  transcriptionStage?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  captions,
  style,
  currentTime,
  duration,
  isPlaying,
  aspectRatio,
  onAspectRatioChange,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
  onDropFile,
  onImportClick,
  isTranscribing,
  transcriptionPercent = 0,
  transcriptionStage = 'loading_model',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mediaError, setMediaError] = useState<boolean>(false);
  const [playerHeight, setPlayerHeight] = useState<number>(540);

  // Measure actual player height dynamically with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        setPlayerHeight(rect.height);
      }
    };
    updateHeight();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (h > 0) {
          setPlayerHeight(h);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [aspectRatio]);

  // Reset error state when video URL changes
  useEffect(() => {
    setMediaError(false);
  }, [videoUrl]);

  // Sync internal video element play/pause state with parent
  useEffect(() => {
    if (!videoRef.current || mediaError) return;
    if (isPlaying && videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Playback interrupted:', err);
          onPlayStateChange(false);
        });
      }
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying, mediaError, onPlayStateChange]);

  // Sync seek state when parent changes time explicitly
  useEffect(() => {
    if (videoRef.current && !mediaError && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime, mediaError]);

  const togglePlay = () => {
    if (!videoRef.current || mediaError) return;
    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => onPlayStateChange(true))
        .catch(() => onPlayStateChange(false));
    } else {
      videoRef.current.pause();
      onPlayStateChange(false);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current && !mediaError) {
      videoRef.current.currentTime = newTime;
    }
    onTimeUpdate(newTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSpeedChange = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFile(e.dataTransfer.files[0]);
    }
  };

  // Switch to synthetic local canvas video stream
  const handleUseSyntheticVideo = () => {
    const synthetic = getSyntheticVideoUrl();
    if (synthetic && videoRef.current) {
      setMediaError(false);
      videoRef.current.src = synthetic;
      videoRef.current.load();
    }
  };

  // Find active caption segment for current playhead
  const activeSegment = captions.find(
    c => currentTime >= c.start && currentTime <= c.end
  );

  // Aspect ratio class mapping
  const getAspectClass = () => {
    if (aspectRatio === '9:16') return 'aspect-[9/16] max-h-[640px]';
    if (aspectRatio === '1:1') return 'aspect-square max-h-[580px]';
    return 'aspect-video max-h-[580px]'; // 16:9
  };

  return (
    <div className="flex-1 bg-[#0a0a0d] flex flex-col items-center justify-between p-4 overflow-hidden select-none relative">
      {/* Top Controls: Aspect Ratio Preset Switcher */}
      <div className="w-full flex items-center justify-between mb-3 z-10 px-2">
        <div className="text-xs text-zinc-400 font-medium flex items-center gap-2">
          <span>Aspect Preview:</span>
          <div className="flex items-center gap-1 bg-[#14141a] p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => onAspectRatioChange('16:9')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>16:9</span>
            </button>
            <button
              onClick={() => onAspectRatioChange('9:16')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                aspectRatio === '9:16' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>9:16 Shorts</span>
            </button>
            <button
              onClick={() => onAspectRatioChange('1:1')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                aspectRatio === '1:1' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Square className="w-3 h-3" />
              <span>1:1 Square</span>
            </button>
          </div>
        </div>

        {/* Caption Count Badge */}
        {captions.length > 0 && (
          <div className="text-xs text-zinc-400 font-mono bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
            {captions.length} captions generated
          </div>
        )}
      </div>

      {/* Main Video Stage Viewport */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl flex items-center justify-center transition-all ${getAspectClass()} ${
          isDragging ? 'ring-2 ring-indigo-500 border-indigo-500/80 bg-indigo-950/20' : ''
        }`}
      >
        {videoUrl && !mediaError ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              onError={() => {
                console.warn('Video source unsupported or network blocked, falling back to local media mode');
                setMediaError(true);
              }}
              onTimeUpdate={() => {
                if (videoRef.current) onTimeUpdate(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) onDurationChange(videoRef.current.duration);
              }}
              onEnded={() => onPlayStateChange(false)}
              onClick={togglePlay}
              className="w-full h-full object-contain pointer-events-auto cursor-pointer"
            />

            {/* Live Caption Render Overlay */}
            {activeSegment && (() => {
              const metrics = getCaptionMetrics(style, aspectRatio);
              const scale = playerHeight > 0 && metrics.playResY > 0 ? playerHeight / metrics.playResY : 0.5;

              const previewFontSize = Math.max(12, Math.round(metrics.fontSize * scale));
              const previewOutlineWidth = metrics.outlineWidth * scale;
              const previewShadowOffsetX = metrics.shadowOffsetX * scale;
              const previewShadowOffsetY = metrics.shadowOffsetY * scale;
              const previewShadowBlur = metrics.shadowBlur * scale;
              const previewBoxPaddingV = metrics.boxPaddingVertical * scale;
              const previewBoxPaddingH = metrics.boxPaddingHorizontal * scale;
              const previewBoxRadius = metrics.boxRadius * scale;

              const yPercent = style.customYPercent !== undefined
                ? style.customYPercent
                : (style.position === 'top' ? 12 : style.position === 'middle' ? 50 : 80);

              const strokeStyle = previewOutlineWidth > 0
                ? `${2 * previewOutlineWidth}px ${metrics.isNeon ? (style.shadowColor || '#FF007A') : style.outlineColor}`
                : 'none';

              const shadowStyle = metrics.shadowBlur > 0
                ? `${previewShadowOffsetX}px ${previewShadowOffsetY}px ${previewShadowBlur}px ${style.shadowColor}`
                : 'none';

              return (
                <div
                  className="absolute inset-x-0 pointer-events-none flex justify-center px-6 z-20"
                  style={{
                    top: `${yPercent}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div
                    className={`text-center max-w-[90%] transition-transform ${
                      style.boxEnabled ? 'inline-block shadow-xl' : ''
                    }`}
                    style={{
                      fontFamily: style.fontFamily,
                      fontSize: `${previewFontSize}px`,
                      fontWeight: 800,
                      textTransform: style.uppercase ? 'uppercase' : 'none',
                      backgroundColor: style.boxEnabled ? style.boxColor : 'transparent',
                      padding: style.boxEnabled ? `${previewBoxPaddingV}px ${previewBoxPaddingH}px` : '0',
                      borderRadius: style.boxEnabled ? `${previewBoxRadius}px` : '0',
                      lineHeight: 1.25,
                    }}
                  >
                    {/* Word-by-Word Rendering with Pop Animation */}
                    {activeSegment.words && activeSegment.words.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                        {activeSegment.words.map((w, idx) => {
                          const isCurrentWord = currentTime >= w.start && currentTime <= w.end;
                          const wordText = style.uppercase ? w.word.toUpperCase() : w.word;

                          return (
                            <span
                              key={idx}
                              className={`inline-block transition-all duration-75 ${
                                isCurrentWord && style.wordPopEnabled
                                  ? 'scale-118 font-black z-10 animate-pulse'
                                  : 'scale-100'
                              }`}
                              style={{
                                color: isCurrentWord && style.wordPopEnabled ? style.highlightColor : style.fillColor,
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: strokeStyle,
                                textShadow: shadowStyle,
                              }}
                            >
                              {wordText}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span
                        style={{
                          color: style.fillColor,
                          paintOrder: 'stroke fill',
                          WebkitTextStroke: strokeStyle,
                          textShadow: shadowStyle,
                        }}
                      >
                        {style.uppercase ? activeSegment.text.toUpperCase() : activeSegment.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        ) : mediaError ? (
          /* Media Error Fallback Area */
          <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-950/90 w-full h-full">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center mb-3 text-amber-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">External Media Source Offline</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
              Network blocked or video source unavailable. Switch to the built-in local synthetic video generator or choose a video file from your computer.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleUseSyntheticVideo}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Use Local Canvas Video</span>
              </button>
              <button
                onClick={onImportClick}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Local Video</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Import Drag-and-Drop Area */
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-indigo-400 shadow-xl group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Import Video or Drag & Drop</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
              Supports MP4, MOV, MKV, WebM formats. Fast local faster-whisper transcription with zero account required.
            </p>
            <button
              onClick={onImportClick}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Choose Video File</span>
            </button>
          </div>
        )}

        {/* Transcribing Overlay Banner */}
        {isTranscribing && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center mb-3 text-indigo-400 shadow-xl shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              Auto Captions in Progress
            </h3>

            {transcriptionStage === 'loading_model' ? (
              <div className="w-full max-w-sm mt-3 flex flex-col items-center">
                <p className="text-xs text-indigo-300 text-center mb-3 font-medium">
                  Loading speech model (first run downloads it, can take a few minutes)
                </p>
                {/* Indeterminate animated bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-700/60">
                  <div className="absolute top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-1/3 rounded-full animate-pulse" style={{ left: '33%' }} />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm mt-3 flex flex-col items-center">
                <div className="w-full flex justify-between items-center text-xs text-zinc-300 font-mono mb-2">
                  <span>Transcribing speech audio</span>
                  <span className="font-bold text-indigo-400 text-sm">
                    {transcriptionPercent !== undefined ? `${transcriptionPercent}%` : 'Working...'}
                  </span>
                </div>
                {/* Real percentage progress bar */}
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, transcriptionPercent || 0))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Control Bar */}
      {videoUrl && !mediaError && (
        <div className="w-full max-w-4xl bg-[#121217] border border-zinc-800 rounded-xl px-4 py-2 mt-3 flex items-center justify-between gap-4 z-10 shadow-lg">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Time Counter */}
          <div className="text-xs font-mono text-zinc-400 shrink-0 min-w-[100px]">
            <span className="text-zinc-200 font-semibold">{formatTimeDisplay(currentTime)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span>{formatTimeDisplay(duration)}</span>
          </div>

          {/* Scrub Seek Bar */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleSeekChange}
            className="flex-1 accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />

          {/* Volume Control */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-indigo-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer hidden sm:block"
            />
          </div>

          {/* Playback Speed */}
          <button
            onClick={handleSpeedChange}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono rounded font-semibold transition-colors shrink-0"
            title="Playback Speed"
          >
            {playbackRate}x
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-zinc-400 hover:text-white transition-colors shrink-0"
            title="Fullscreen Stage"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
