const { contextBridge, ipcRenderer } = require('electron');

const apiBridge = {
  transcribeVideo: (videoPath, language, modelSize) =>
    ipcRenderer.invoke('transcribe-video', videoPath, language, modelSize),
  runTranscription: (params) =>
    ipcRenderer.invoke('run-transcription', params),
  checkSystemDeps: () => ipcRenderer.invoke('check-system-deps'),
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  openProjectFile: () => ipcRenderer.invoke('open-project-file'),
  saveProjectFile: (data) => ipcRenderer.invoke('save-project-file', data),
  saveSrtFile: (payload) => ipcRenderer.invoke('save-srt-file', payload),
  burnSubtitlesMp4: (params) => ipcRenderer.invoke('burn-subtitles-mp4', params),
  onTranscribeProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('transcribe-progress', handler);
    return () => ipcRenderer.removeListener('transcribe-progress', handler);
  },
  onFfmpegProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('ffmpeg-progress', handler);
    return () => ipcRenderer.removeListener('ffmpeg-progress', handler);
  }
};

contextBridge.exposeInMainWorld('api', apiBridge);
contextBridge.exposeInMainWorld('electronAPI', apiBridge);
