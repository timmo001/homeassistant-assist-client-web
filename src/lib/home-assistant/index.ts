import {
  type Auth,
  type Connection,
  type HassConfig,
  type HassUser,
  createConnection,
  createLongLivedTokenAuth,
  getUser,
  subscribeConfig,
} from "home-assistant-js-websocket";

import { type HomeAssistantSettings } from "~/lib/home-assistant/types";
import {
  type PipelineRun,
  type PipelineRunEvent,
  type PipelineRunOptions,
  type AssistPipeline,
  type AssistPipelineMutableParams,
} from "~/lib/home-assistant/assist/types";
import type { Settings } from "~/lib/setting/types";

export function settingsToHomeAssistantSettings(
  settings: Settings,
): HomeAssistantSettings {
  const homeAssistantUrl = new URL(settings.homeAssistantUrl);

  const output: HomeAssistantSettings = {
    access_token: settings.homeAssistantAccessToken,
    host: homeAssistantUrl.hostname,
    port: parseInt(homeAssistantUrl.port ?? 443),
    ssl: homeAssistantUrl.protocol === "https:",
  };

  if (!output.port) {
    output.port = output.ssl ? 443 : 8123;
  }

  return output;
}

export function generateHomeAssistantURLFromSettings(
  settings: HomeAssistantSettings,
): string {
  return `${settings.ssl ? "https" : "http"}://${settings.host}${
    settings.port === 443 ? "" : `:${settings.port}`
  }`;
}

export class HomeAssistant {
  public connection: Connection | null = null;

  private auth: Auth | null = null;
  private config: HomeAssistantSettings | null = null;
  private connectedCallback: (connection: Connection, user: HassUser) => void;
  private configCallback: (config: HassConfig) => void;

  constructor(
    connectedCallback: (connection: Connection, user: HassUser) => void,
    configReceivedCallback: (config: HassConfig) => void,
    config?: HomeAssistantSettings,
    connection?: Connection,
  ) {
    console.log("Home Assistant: create new client");

    this.connectedCallback = connectedCallback;
    this.configCallback = configReceivedCallback;
    this.config = config ?? null;
    this.connection = connection ?? null;
  }

  public get connected(): boolean {
    console.log(`Home Assistant: connected: ${this.connection !== null}`);
    return this.connection !== null;
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  async connect(): Promise<void> {
    if (this.connection) return;
    if (!this.config?.host) throw new Error("Missing Home Assistant host");
    if (!this.config?.access_token)
      throw new Error("Missing Home Assistant access token");

    const url = `${this.config.ssl ? "https" : "http"}://${this.config.host}:${
      this.config.port
    }`;

    console.log(`Home Assistant: ${url}`);

    // Create auth object
    console.log("Home Assistant: createLongLivedTokenAuth");
    this.auth = createLongLivedTokenAuth(url, this.config.access_token);

    // Connect to Home Assistant
    console.log("Home Assistant: createConnection");
    this.connection = await createConnection({ auth: this.auth });

    this.connection.addEventListener("ready", () => {
      console.log("Home Assistant connection ready");
    });

    this.connection.addEventListener("disconnected", () => {
      console.log("Disconnected from Home Assistant");
      if (this.connection) this.connection.reconnect();
    });

    subscribeConfig(this.connection, (config: HassConfig) => {
      this.configCallback(config);
    });

    void getUser(this.connection).then((user: HassUser) => {
      this.connectedCallback(this.connection!, user);
    });
  }

  processEvent = (
    run: PipelineRun | undefined,
    event: PipelineRunEvent,
    options?: PipelineRunOptions,
  ): PipelineRun | undefined => {
    if (event.type === "run-start") {
      run = {
        init_options: options,
        stage: "ready",
        run: event.data,
        events: [event],
      };
      return run;
    }

    if (!run) {
      console.warn(
        `Received unexpected event before receiving session: ${JSON.stringify(
          event,
        )}`,
      );
      return undefined;
    }

    if (event.type === "wake_word-start") {
      run = {
        ...run,
        stage: "wake_word",
        wake_word: { ...event.data, done: false },
      };
    } else if (event.type === "wake_word-end") {
      run = {
        ...run,
        wake_word: { ...run.wake_word!, ...event.data, done: true },
      };
    } else if (event.type === "stt-start") {
      run = {
        ...run,
        stage: "stt",
        stt: { ...event.data, done: false },
      };
    } else if (event.type === "stt-end") {
      run = {
        ...run,
        stt: { ...run.stt!, ...event.data, done: true },
      };
    } else if (event.type === "intent-start") {
      run = {
        ...run,
        stage: "intent",
        intent: { ...event.data, done: false },
      };
    } else if (event.type === "intent-end") {
      run = {
        ...run,
        intent: { ...run.intent!, ...event.data, done: true },
      };
    } else if (event.type === "tts-start") {
      run = {
        ...run,
        stage: "tts",
        tts: { ...event.data, done: false },
      };
    } else if (event.type === "tts-end") {
      run = {
        ...run,
        tts: { ...run.tts!, ...event.data, done: true },
      };
    } else if (event.type === "run-end") {
      run = { ...run, stage: "done" };
    } else if (event.type === "error") {
      run = { ...run, stage: "error", error: event.data };
    } else {
      run = { ...run };
    }

    run.events = [...run.events, event];

    return run;
  };

  runAssistPipeline = (
    options: PipelineRunOptions,
    callback: (event: PipelineRunEvent) => void,
  ) =>
    this.connection?.subscribeMessage<PipelineRunEvent>(callback, {
      ...options,
      type: "assist_pipeline/run",
    });

  listAssistPipelines = () =>
    this.connection?.sendMessagePromise<{
      pipelines: Array<AssistPipeline>;
      preferred_pipeline: string | null;
    }>({
      type: "assist_pipeline/pipeline/list",
    });

  getAssistPipeline = (pipeline_id?: string) =>
    this.connection?.sendMessagePromise<AssistPipeline>({
      type: "assist_pipeline/pipeline/get",
      pipeline_id,
    });

  createAssistPipeline = (pipeline: AssistPipelineMutableParams) =>
    this.connection?.sendMessagePromise<AssistPipeline>({
      type: "assist_pipeline/pipeline/create",
      ...pipeline,
    });

  updateAssistPipeline = (
    pipeline_id: string,
    pipeline: AssistPipelineMutableParams,
  ) =>
    this.connection?.sendMessagePromise<AssistPipeline>({
      type: "assist_pipeline/pipeline/update",
      pipeline_id,
      ...pipeline,
    });

  setAssistPipelinePreferred = (pipeline_id: string) =>
    this.connection?.sendMessagePromise({
      type: "assist_pipeline/pipeline/set_preferred",
      pipeline_id,
    });

  deleteAssistPipeline = (pipelineId: string) =>
    this.connection?.sendMessagePromise<void>({
      type: "assist_pipeline/pipeline/delete",
      pipeline_id: pipelineId,
    });

  fetchAssistPipelineLanguages = () =>
    this.connection?.sendMessagePromise<{ languages: Array<string> }>({
      type: "assist_pipeline/language/list",
    });
}
