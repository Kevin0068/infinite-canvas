// Electron API 类型声明
interface ElectronAPI {
  onMenuNew: (callback: () => void) => void;
  onMenuOpen: (callback: (filePath: string) => void) => void;
  onMenuSave: (callback: () => void) => void;
  onMenuExport: (callback: () => void) => void;
  
  // 版本和更新相关
  getVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  onUpdateAvailable: (callback: (info: unknown) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateError: (callback: (error: unknown) => void) => void;
  onUpdateDownloading: (callback: () => void) => void;
  onUpdateProgress: (callback: (percent: number) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
