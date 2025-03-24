import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { homedir } from "os";
import fs from "fs";
import path from "path";
import isDev from "electron-is-dev";

let mainWindow: BrowserWindow | null = null;

// Define type for Home Assistant settings
interface HomeAssistantSettings {
  access_token?: string;
  host: string;
  port: number;
  ssl: boolean;
}

// Define type for IPC messages
interface HomeAssistantAuthMessage {
  action: string;
  settings?: HomeAssistantSettings;
}

// Define the path for storing Home Assistant settings
const APP_DATA_DIR = path.join(app.getPath("userData"), "homeassistant-assist");
const SETTINGS_FILE = path.join(APP_DATA_DIR, "settings.json");

// Ensure app data directory exists
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// Helper function to read settings
const readSettings = (): HomeAssistantSettings | null => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settingsData = fs.readFileSync(SETTINGS_FILE, "utf8");
      return JSON.parse(settingsData) as HomeAssistantSettings;
    }
  } catch (error) {
    console.error("Error reading settings:", error);
  }
  return null;
};

// Helper function to write settings
const writeSettings = (settings: HomeAssistantSettings): boolean => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing settings:", error);
    return false;
  }
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = isDev
    ? "http://localhost:3000"
    : `file://${join(__dirname, "../.next/index.html")}`;

  await mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app
  .whenReady()
  .then(async () => {
    await createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  })
  .catch((error) => {
    console.error("Failed to initialize app:", error);
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Helper to safely type-check the message
const isHomeAssistantAuthMessage = (
  arg: unknown,
): arg is HomeAssistantAuthMessage => {
  if (!arg || typeof arg !== "object") return false;

  const maybeMessage = arg as Partial<HomeAssistantAuthMessage>;
  return typeof maybeMessage.action === "string";
};

// Helper to validate settings
const isValidSettings = (
  settings: unknown,
): settings is HomeAssistantSettings => {
  if (!settings || typeof settings !== "object") return false;

  const maybeSettings = settings as Partial<HomeAssistantSettings>;
  return (
    typeof maybeSettings.host === "string" &&
    typeof maybeSettings.port === "number" &&
    typeof maybeSettings.ssl === "boolean"
  );
};

// Handle IPC messages for Home Assistant authentication
ipcMain.on("home-assistant-auth", (event, arg: unknown) => {
  if (!isHomeAssistantAuthMessage(arg)) {
    event.reply("home-assistant-auth-response", null);
    return;
  }

  const { action } = arg;

  if (action === "get-settings") {
    // Read and return settings
    const settings = readSettings();
    event.reply("home-assistant-auth-response", settings);
  } else if (
    action === "save-settings" &&
    arg.settings &&
    isValidSettings(arg.settings)
  ) {
    // Save settings and return success status
    const success = writeSettings(arg.settings);
    event.reply("home-assistant-auth-response", success);
  } else {
    event.reply("home-assistant-auth-response", null);
  }
});
