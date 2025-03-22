import { z } from "zod";

export const SettingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  homeAssistantUrl: z.string().default("http://homeassistant.local:8123"),
  homeAssistantAccessToken: z.string().default(""),
});
export type Settings = z.infer<typeof SettingsSchema>;
