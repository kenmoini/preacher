import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectP8File: () => ipcRenderer.invoke('select-p8-file'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  createInitialApiKey: (name: string) => ipcRenderer.invoke('create-initial-api-key', name),
});
