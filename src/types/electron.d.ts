interface ElectronAPI {
  sendMessage: (channel: string, data: unknown) => void;
  receiveMessage: (channel: string, func: (args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
