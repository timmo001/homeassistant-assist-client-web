import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { type Settings, SettingsSchema } from "~/lib/setting/types";

export const INITIAL_SETTINGS = SettingsSchema.parse({
  theme: "system",
  homeAssistantUrl: "",
  homeAssistantAccessToken: "",
});

type SettingsStore = {
  settings: Settings;
  setSettings: (settings: Settings) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: INITIAL_SETTINGS,
      setSettings: (settings: Settings) => set({ settings }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
