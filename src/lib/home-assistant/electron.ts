import { isElectron } from "~/lib/electron";
import { type HomeAssistantSettings } from "~/lib/home-assistant/types";

/**
 * Safely access the Electron API if available
 */
const getElectronAPI = () => {
  if (typeof window !== "undefined" && "electronAPI" in window) {
    return (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
  }
  return null;
};

/**
 * Get Home Assistant settings from Electron storage, if running in Electron
 */
export const getElectronHomeAssistantSettings =
  (): Promise<HomeAssistantSettings | null> => {
    if (!isElectron()) {
      return Promise.resolve(null);
    }

    const api = getElectronAPI();
    if (!api) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        // Send message to main process to get settings
        api.sendMessage("home-assistant-auth", { action: "get-settings" });

        // Listen for response
        api.receiveMessage("home-assistant-auth-response", (args) => {
          if (!Array.isArray(args) || args.length === 0) {
            resolve(null);
            return;
          }

          const settings = args[0];
          if (settings && typeof settings === "object") {
            resolve(settings as HomeAssistantSettings);
          } else {
            resolve(null);
          }
        });
      } catch (error) {
        console.error(
          "Error getting Home Assistant settings from Electron:",
          error,
        );
        resolve(null);
      }
    });
  };

/**
 * Save Home Assistant settings to Electron storage, if running in Electron
 */
export const saveElectronHomeAssistantSettings = (
  settings: HomeAssistantSettings,
): Promise<boolean> => {
  if (!isElectron()) {
    return Promise.resolve(false);
  }

  const api = getElectronAPI();
  if (!api) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    try {
      // Send message to main process to save settings
      api.sendMessage("home-assistant-auth", {
        action: "save-settings",
        settings,
      });

      // Listen for response
      api.receiveMessage("home-assistant-auth-response", (args) => {
        if (!Array.isArray(args) || args.length === 0) {
          resolve(false);
          return;
        }

        const success = !!args[0];
        resolve(success);
      });
    } catch (error) {
      console.error("Error saving Home Assistant settings to Electron:", error);
      resolve(false);
    }
  });
};
