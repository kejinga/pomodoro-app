import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('toggle-always-on-top', flag),
  setBackgroundMaterial: (material: string) => ipcRenderer.invoke('set-background-material', material),
})
