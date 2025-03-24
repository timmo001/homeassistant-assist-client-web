import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  sendMessage: (channel: string, data: unknown) => {
    // whitelist channels
    const validChannels = ["home-assistant-auth"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receiveMessage: (channel: string, func: (args: unknown[]) => void) => {
    const validChannels = ["home-assistant-auth-response"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (_event, ...args) => func(args));
    }
  },
});
