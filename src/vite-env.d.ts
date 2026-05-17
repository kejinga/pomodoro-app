/// <reference types="vite/client" />

declare global {
  interface ElectronAPI {
    toggleAlwaysOnTop: (flag: boolean) => Promise<boolean>
    setBackgroundMaterial: (material: string) => Promise<void>
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
