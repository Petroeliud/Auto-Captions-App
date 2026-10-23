/**
 * CapCut Auto Captions Desktop App
 * Powered by faster-whisper, FFmpeg, Electron, React, Tailwind CSS
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { CaptionList } from './components/CaptionList';
import { StylePanel } from './components/StylePanel';
import { CapCutTimeline } from './components/CapCutTimeline';
import { ExportModal } from './components/ExportModal';
import { SystemCheckModal } from './components/SystemCheckModal';
import { AspectRatio, CaptionSegment, CaptionStyle, PresetId, ProjectData, SystemStatus, VideoTrim } from './types/caption';
import { CAPCUT_PRESETS, DEFAULT_STYLE } from './utils/presetStyles';
import { groupWordsIntoCaptions, extractAllWords, detectSilencesAndRemove } from './utils/captionUtils';
import { extractAudioWaveform, transcribeVideoViaServer } from './utils/audioAnalyzer';
import { Layers, Palette, Sparkles, AlertTriangle } from 'lucide-react';

export default function App() {
  // Video & Playback State (Starts clean - user imports video)
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [trim, setTrim] = useState<VideoTrim>({ start: 0, end: 0 });
  const [audioPeaks, setAudioPeaks] = useState<number[]>([]);

  // Transcription & Language State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [selectedModel, setSelectedModel] = useState<string>('small');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<string>('');

  // Captions & Styling State
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);

  // Right Panel Tab State
  const [activeRightTab, setActiveRightTab] = useState<'captions' | 'style'>('captions');

  // System & Modals State
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    python: true,
    fasterWhisper: true,
    ffmpeg: true,
    isElectron: false
  });
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [burnProgressLog, setBurnProgressLog] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect Electron environment
  const electronApi = (window as any).api || (window as any).electronAPI;

  useEffect(() => {
    if (electronApi) {
      setSystemStatus(prev => ({ ...prev, isElectron: true }));
      electronApi.checkSystemDeps().then((deps: any) => {
        setSystemStatus(prev => ({
          ...prev,
          python: deps.python,
          fasterWhisper: deps.fasterWhisper,
          ffmpeg: deps.ffmpeg
        }));
      });

      // Register IPC progress listeners
      const unsubscribeTranscribe = electronApi.onTranscribeProgress((data: any) => {
        console.log('[Transcribe Progress]', data.log);
        setTranscriptionProgress(prev => prev + '\n' + data.log);
      });

      const unsubscribeFfmpeg = electronApi.onFfmpegProgress((data: any) => {
        console.log('[FFmpeg Progress]', data.log);
        setBurnProgressLog(prev => prev + '\n' + data.log);
      });

      return () => {
        if (unsubscribeTranscribe) unsubscribeTranscribe();
        if (unsubscribeFfmpeg) unsubscribeFfmpeg();
      };
    }
  }, [electronApi]);

  // Extract real audio waveform when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      extractAudioWaveform(videoUrl, 200).then(peaks => setAudioPeaks(peaks));
    } else {
      setAudioPeaks([]);
    }
  }, [videoUrl]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Re-check System Dependencies
  const handleRecheckDeps = async () => {
    if (electronApi) {
      const deps = await electronApi.checkSystemDeps();
      setSystemStatus(prev => ({
        ...prev,
        python: deps.python,
        fasterWhisper: deps.fasterWhisper,
        ffmpeg: deps.ffmpeg
      }));
      showToast('System dependencies re-checked');
    } else {
      showToast('Local faster-whisper transcription active');
    }
  };

  // Handle Video File Import (captures File object and OS path in Electron)
  const handleVideoImport = (file: File) => {
    const url = URL.createObjectURL(file);
    // In Electron, File objects have a .path property containing the exact OS path
    const realFilePath = (file as any).path || file.name;
    setImportedFile(file);
    setVideoUrl(url);
    setVideoPath(realFilePath);
    setCaptions([]);
    setCurrentTime(0);
    setTranscribeError(null);
    showToast(`Video loaded: ${file.name}`);
  };

  const handleImportVideoFile = async () => {
    if (electronApi?.selectVideoFile) {
      const filePath = await electronApi.selectVideoFile();
      if (filePath) {
        setImportedFile(null);
        setVideoPath(filePath);
        setVideoUrl(`file://${filePath}`);
        setCaptions([]);
        setCurrentTime(0);
        setTranscribeError(null);
        showToast('Video loaded');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleBrowserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleVideoImport(e.target.files[0]);
    }
  };

  // Real Transcription Trigger (Local faster-whisper via Electron IPC or Express POST /api/transcribe)
  const handleStartTranscription = async () => {
    setTranscribeError(null);

    if (!videoUrl) {
      showToast('Please import a video file first');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionProgress('Initializing local faster-whisper speech recognition...');

    try {
      let result: any = null;

      // 1. If running in Electron Desktop App with native file path
      if (electronApi?.transcribeVideo && videoPath && videoPath.includes('/') || (electronApi?.transcribeVideo && videoPath && videoPath.includes('\\'))) {
        setTranscriptionProgress(`Spawning local Python process for: "${videoPath}"...`);
        console.log(`[App] Calling electronApi.transcribeVideo for: ${videoPath}`);
        result = await electronApi.transcribeVideo(videoPath, selectedLanguage, selectedModel);
      } 
      // 2. Running in browser connected to local Express server
      else {
        setTranscriptionProgress('Sending video to local Express server for faster-whisper transcription...');
        let fileToSend = importedFile;
        if (!fileToSend && videoUrl) {
          const res = await fetch(videoUrl);
          const blob = await res.blob();
          fileToSend = new File([blob], videoPath || 'uploaded_video.mp4', { type: blob.type || 'video/mp4' });
        }

        if (!fileToSend) {
          throw new Error('No video file found to transcribe. Please re-import your video.');
        }

        setTranscriptionProgress('Running local Python transcribe.py with faster-whisper...');
        result = await transcribeVideoViaServer(fileToSend, selectedLanguage, selectedModel);
      }

      console.log('[App] Transcription Result:', result);

      if (result && result.error) {
        setTranscribeError(result.error);
        showToast('Transcription failed. Check error details below.');
      } else if (result && result.all_words && result.all_words.length > 0) {
        const grouped = groupWordsIntoCaptions(result.all_words, style.wordsPerCaption || 3);
        setCaptions(grouped);
        if (result.detected_language && result.detected_language !== 'auto') {
          setSelectedLanguage(result.detected_language);
        }
        showToast(`Auto captions generated! (${result.all_words.length} words detected)`);
      } else if (result && result.segments && result.segments.length > 0) {
        const wordsFromSegments = extractAllWords(result.segments);
        if (wordsFromSegments.length > 0) {
          const grouped = groupWordsIntoCaptions(wordsFromSegments, style.wordsPerCaption || 3);
          setCaptions(grouped);
        } else {
          setCaptions(result.segments);
        }
        if (result.detected_language && result.detected_language !== 'auto') {
          setSelectedLanguage(result.detected_language);
        }
        showToast(`Auto captions generated! (${result.segments.length} segments)`);
      } else {
        const msg = 'No speech or words detected in the video audio track.';
        setTranscribeError(msg);
        showToast(msg);
      }
    } catch (err: any) {
      console.error('[App] Transcription Exception:', err);
      const errText = err.message || String(err);
      setTranscribeError(errText);
      showToast(`Error: ${errText}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Caption List Handlers
  const handleUpdateCaption = (id: string, updated: Partial<CaptionSegment>) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const handleDeleteCaption = (id: string) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
    showToast('Caption deleted');
  };

  const handleAddCaption = (atTime: number = currentTime) => {
    const newCap: CaptionSegment = {
      id: `cap_custom_${Date.now()}`,
      start: Number(atTime.toFixed(3)),
      end: Number((atTime + 2.0).toFixed(3)),
      text: 'New Subtitle',
      words: [
        { word: 'New', start: atTime, end: atTime + 1.0 },
        { word: 'Subtitle', start: atTime + 1.0, end: atTime + 2.0 }
      ]
    };
    setCaptions(prev => [...prev, newCap].sort((a, b) => a.start - b.start));
  };

  const handleSplitCaption = (id: string, splitTime: number) => {
    const targetIndex = captions.findIndex(c => c.id === id);
    if (targetIndex === -1) return;

    const target = captions[targetIndex];
    if (splitTime <= target.start || splitTime >= target.end) {
      showToast('Playhead must be inside caption duration to split');
      return;
    }

    const words = target.words || [];
    const firstHalfWords = words.filter(w => w.start < splitTime);
    const secondHalfWords = words.filter(w => w.start >= splitTime);

    const firstText = firstHalfWords.length > 0 ? firstHalfWords.map(w => w.word).join(' ') : target.text.slice(0, Math.floor(target.text.length / 2));
    const secondText = secondHalfWords.length > 0 ? secondHalfWords.map(w => w.word).join(' ') : target.text.slice(Math.floor(target.text.length / 2));

    const seg1: CaptionSegment = {
      ...target,
      end: splitTime,
      text: firstText,
      words: firstHalfWords
    };

    const seg2: CaptionSegment = {
      id: `cap_split_${Date.now()}`,
      start: splitTime,
      end: target.end,
      text: secondText,
      words: secondHalfWords
    };

    setCaptions(prev => [
      ...prev.slice(0, targetIndex),
      seg1,
      seg2,
      ...prev.slice(targetIndex + 1)
    ]);
    showToast('Caption split into two');
  };

  const handleMergeCaptions = (id: string) => {
    const idx = captions.findIndex(c => c.id === id);
    if (idx === -1 || idx >= captions.length - 1) return;

    const curr = captions[idx];
    const next = captions[idx + 1];

    const merged: CaptionSegment = {
      id: curr.id,
      start: curr.start,
      end: next.end,
      text: `${curr.text} ${next.text}`,
      words: [...(curr.words || []), ...(next.words || [])]
    };

    setCaptions(prev => [
      ...prev.slice(0, idx),
      merged,
      ...prev.slice(idx + 2)
    ]);
    showToast('Merged captions');
  };

  // Regroup words into N-words per caption
  const handleRegroupWords = (wordCount: number) => {
    const allWords = extractAllWords(captions);
    if (allWords.length === 0) return;
    const regrouped = groupWordsIntoCaptions(allWords, wordCount);
    setCaptions(regrouped);
    showToast(`Re-grouped into ${wordCount}-word captions`);
  };

  // Remove Silences Action
  const handleRemoveSilences = () => {
    const result = detectSilencesAndRemove(captions, 0.5);
    if (result.removedGapsCount > 0) {
      setCaptions(result.cleanedCaptions);
      showToast(`Removed ${result.removedGapsCount} silent gaps (Saved ${result.savedSeconds}s)`);
    } else {
      showToast('No silent gaps > 0.5s detected');
    }
  };

  // Apply CapCut Style Preset
  const handleApplyPreset = (presetId: PresetId) => {
    const preset = CAPCUT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setStyle(prev => ({
        ...prev,
        ...preset.style,
        presetId
      }));
      showToast(`Applied preset: ${preset.name}`);
    }
  };

  // Project Save & Load
  const handleSaveProject = async () => {
    const projectData: ProjectData = {
      version: '1.0.0',
      title: 'CapCut Auto Captions Project',
      videoPath,
      videoDuration,
      language: selectedLanguage,
      whisperModel: selectedModel,
      captions,
      style,
      trim,
      updatedAt: new Date().toISOString()
    };

    if (electronApi) {
      const savedPath = await electronApi.saveProjectFile(projectData);
      if (savedPath) showToast('Project saved successfully');
    } else {
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'capcut_project.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Project JSON downloaded');
    }
  };

  const handleOpenProject = async () => {
    if (electronApi) {
      const data: ProjectData | null = await electronApi.openProjectFile();
      if (data) {
        if (data.captions) setCaptions(data.captions);
        if (data.style) setStyle(data.style);
        if (data.videoPath) {
          setVideoPath(data.videoPath);
          setVideoUrl(`file://${data.videoPath}`);
        }
        showToast('Project loaded');
      }
    } else {
      showToast('Project open supported in Desktop app');
    }
  };

  // Burn Video via FFmpeg
  const handleBurnVideo = async (assContent: string, aspect: AspectRatio) => {
    if (!electronApi || !videoPath) {
      showToast('Video MP4 burning requires the Desktop App with FFmpeg');
      return;
    }

    setIsBurning(true);
    setBurnProgressLog('Initializing FFmpeg encoder...');

    try {
      const res = await electronApi.burnSubtitlesMp4({
        videoPath,
        assContent,
        aspectRatio: aspect
      });
      if (res.success) {
        showToast(`Video MP4 exported successfully: ${res.outputPath}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`FFmpeg burn error: ${err.message || err}`);
    } finally {
      setIsBurning(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0f0f12] text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Hidden File Input for File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBrowserFileChange}
        accept="video/mp4,video/mov,video/mkv,video/webm,video/avi"
        className="hidden"
      />

      {/* Top Header Bar */}
      <Header
        systemStatus={systemStatus}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        isTranscribing={isTranscribing}
        onStartTranscription={handleStartTranscription}
        onImportVideo={handleImportVideoFile}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRemoveSilences={handleRemoveSilences}
        hasVideo={!!videoUrl}
        hasCaptions={captions.length > 0}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 bg-indigo-600/90 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-2 border border-indigo-400/50 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{notification}</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {transcribeError && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 px-6 py-3 flex items-center justify-between z-40 text-xs text-rose-200">
          <div className="flex items-center gap-2 max-w-4xl">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono whitespace-pre-wrap">{transcribeError}</span>
          </div>
          <button
            onClick={() => setTranscribeError(null)}
            className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded font-bold transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Stage: Video Viewport + CapCut Multi-Track Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0d]">
          <VideoPlayer
            videoUrl={videoUrl}
            captions={captions}
            style={style}
            currentTime={currentTime}
            duration={videoDuration}
            isPlaying={isPlaying}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            onTimeUpdate={setCurrentTime}
            onDurationChange={(dur) => {
              setVideoDuration(dur);
              setTrim({ start: 0, end: dur });
            }}
            onPlayStateChange={setIsPlaying}
            onDropFile={handleVideoImport}
            onImportClick={handleImportVideoFile}
            isTranscribing={isTranscribing}
            transcriptionProgress={transcriptionProgress}
          />

          {/* CapCut Multi-Track Timeline Editor */}
          {videoUrl && (
            <CapCutTimeline
              duration={videoDuration}
              currentTime={currentTime}
              captions={captions}
              trim={trim}
              audioPeaks={audioPeaks}
              onSeek={setCurrentTime}
              onUpdateCaption={handleUpdateCaption}
              onDeleteCaption={handleDeleteCaption}
              onAddCaption={handleAddCaption}
              onSplitCaption={handleSplitCaption}
              onUpdateTrim={setTrim}
            />
          )}
        </div>

        {/* Right Drawer: Captions & Style Inspector */}
        <div className="w-[380px] lg:w-[420px] bg-[#121217] flex flex-col border-l border-zinc-800/80 shrink-0">
          <div className="flex items-center border-b border-zinc-800 bg-[#16161d]">
            <button
              onClick={() => setActiveRightTab('captions')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeRightTab === 'captions'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Captions ({captions.length})</span>
            </button>

            <button
              onClick={() => setActiveRightTab('style')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeRightTab === 'style'
                  ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Style & Presets</span>
            </button>
          </div>

          {activeRightTab === 'captions' ? (
            <CaptionList
              captions={captions}
              currentTime={currentTime}
              style={style}
              onUpdateCaption={handleUpdateCaption}
              onDeleteCaption={handleDeleteCaption}
              onAddCaption={handleAddCaption}
              onSplitCaption={handleSplitCaption}
              onMergeCaptions={handleMergeCaptions}
              onSeekToTime={setCurrentTime}
              onWordsPerCaptionChange={(val) => setStyle(s => ({ ...s, wordsPerCaption: val }))}
              onRegroupWords={handleRegroupWords}
            />
          ) : (
            <StylePanel
              style={style}
              onUpdateStyle={(updated) => setStyle(s => ({ ...s, ...updated }))}
              onApplyPreset={handleApplyPreset}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        captions={captions}
        style={style}
        videoPath={videoPath}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        systemStatus={systemStatus}
        onExportSrt={(srt) => {
          if (electronApi) electronApi.saveSrtFile({ defaultName: 'captions.srt', content: srt });
        }}
        onBurnVideo={handleBurnVideo}
        isBurning={isBurning}
        burnProgressLog={burnProgressLog}
      />

      <SystemCheckModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemStatus={systemStatus}
        onRecheckDeps={handleRecheckDeps}
      />
    </div>
  );
}
