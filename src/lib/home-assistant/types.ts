import { type HassUser } from "home-assistant-js-websocket";

export type HomeAssistantSettings = {
  access_token?: string;
  host: string;
  port: number;
  ssl: boolean;
};

export type WebSocketResponse = {
  type: string;
  result?: HassUser;
  error?: { code: string; message: string };
};

export type HomeAssistantProfile = HassUser;
