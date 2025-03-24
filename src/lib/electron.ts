/**
 * Check if the app is running in Electron
 */
export const isElectron = (): boolean => {
  // Renderer process
  if (typeof window !== "undefined" && "electronAPI" in window) {
    return true;
  }

  // Main process
  if (typeof process !== "undefined" && process.versions?.electron) {
    return true;
  }

  return false;
};
