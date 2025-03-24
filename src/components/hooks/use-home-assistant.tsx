"use client";
import { useCallback, useEffect, useState } from "react";

import { useSettingsStore } from "~/components/hooks/use-settings";
import {
  rehydrateMessages,
  useMessagesStore,
} from "~/components/hooks/use-messages";
import {
  generateHomeAssistantURLFromSettings,
  HomeAssistant,
} from "~/lib/home-assistant";
import { SettingsForm } from "~/components/settings/form";
import type {
  Connection,
  HassConfig,
  HassUser,
} from "home-assistant-js-websocket";
import type {
  AssistPipeline,
  PipelineRunEvent,
} from "~/lib/home-assistant/assist/types";
import { settingsToHomeAssistantSettings } from "~/lib/home-assistant";
import { AudioRecorder } from "~/lib/home-assistant/audioRecorder";

type UseHomeAssistantReturn = {
  config: HassConfig | null;
  pipelines: AssistPipeline[];
  currentPipeline: AssistPipeline | null;
  reconnect: () => void;
  toggleListening: () => void;
  processUserMessage: (message: string) => Promise<void>;
  setCurrentPipeline: (pipeline: AssistPipeline) => void;
};

let homeAssistantClient: HomeAssistant;
let audio: HTMLAudioElement | undefined;
let audioBuffer: Int16Array[] | undefined;
let audioRecorder: AudioRecorder | undefined;
let sttBinaryHandlerId: number | null;

export function useHomeAssistant(): UseHomeAssistantReturn {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const [config, setConfig] = useState<HassConfig | null>(null);
  const [pipelines, setPipelines] = useState<AssistPipeline[]>([]);
  const [currentPipeline, setCurrentPipeline] = useState<AssistPipeline | null>(
    null,
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const { settings } = useSettingsStore();
  const { addMessage, removeMessageIfExists, updateMessage } =
    useMessagesStore();

  const connectedCallback = useCallback(
    (connection: Connection, user: HassUser): void => {
      console.log("Connected to Home Assistant", connection, user);

      // Remove the ha-auth-required message
      removeMessageIfExists("ha-auth-required");

      // Add a hello message
      addMessage({
        id: "ha-greeting",
        content: `Hi ${user.name}! How can I assist?`,
        sender: "server",
        timestamp: Date.now(),
      });
    },
    [addMessage, removeMessageIfExists],
  );

  const configReceivedCallback = useCallback(
    (config: HassConfig): void => {
      console.log("Config received from Home Assistant", config);
      setConfig(config);

      // Get pipelines
      void homeAssistantClient
        .listAssistPipelines()
        ?.then(
          (pipelines: {
            pipelines: AssistPipeline[];
            preferred_pipeline: string | null;
          }) => {
            console.log("Got pipelines:", pipelines);
            setPipelines(pipelines.pipelines);
            if (!currentPipeline) {
              const preferredPipeline = pipelines.pipelines.find(
                (pipeline) => pipeline.id === pipelines.preferred_pipeline,
              );
              if (preferredPipeline) {
                console.log("Setting preferred pipeline:", preferredPipeline);
                setCurrentPipeline(preferredPipeline);
                addMessage({
                  id: `ha-pipeline-change-${Date.now()}`,
                  content: `Pipeline set to ${preferredPipeline.name}`,
                  sender: "system",
                  timestamp: Date.now(),
                });
              } else console.error("No preferred pipeline found");
            }
          },
        );
    },
    [addMessage, currentPipeline],
  );

  const reconnect = useCallback((): void => {
    if (!homeAssistantClient) {
      homeAssistantClient = new HomeAssistant(
        connectedCallback,
        configReceivedCallback,
        settingsToHomeAssistantSettings(settings),
      );
    }
    homeAssistantClient.disconnect();
    void homeAssistantClient.connect();
  }, [configReceivedCallback, connectedCallback, settings]);

  function playAudio(): void {
    console.log("Playing audio..");
    void audio?.play();
  }

  function audioError(): void {
    console.error("Audio error:", audio);
    unloadAudio();
  }

  function unloadAudio(): void {
    audio?.removeAttribute("src");
    audio = undefined;
  }

  async function startListening(): Promise<void> {
    // Call voice pipeline
    audio?.pause();
    if (!audioRecorder) {
      audioRecorder = new AudioRecorder((audio) => {
        if (audioBuffer) audioBuffer.push(audio);
        else sendAudioChunk(audio);
      });
    }
    sttBinaryHandlerId = null;
    audioBuffer = [];
    await audioRecorder.start();
    const messageId = `ha-response-message-${Date.now()}`;
    setLastMessageId(messageId);
    addMessage({
      id: messageId,
      content: "...",
      sender: "server",
      timestamp: Date.now(),
    });

    if (!currentPipeline) throw new Error("No pipeline selected");

    // To make sure the answer is placed at the right user text, we add it before we process it
    try {
      const unsub = await homeAssistantClient.runAssistPipeline(
        {
          start_stage: "stt",
          end_stage: currentPipeline.tts_engine ? "tts" : "intent",
          input: { sample_rate: audioRecorder.sampleRate! },
          pipeline: currentPipeline.id,
          conversation_id: conversationId,
        },
        (event) => {
          if (event.type === "run-start") {
            sttBinaryHandlerId = event.data.runner_data.stt_binary_handler_id;
          }

          // When we start STT stage, the WS has a binary handler
          if (event.type === "stt-start" && audioBuffer) {
            // Send the buffer over the WS to the STT engine.
            for (const buffer of audioBuffer) {
              sendAudioChunk(buffer);
            }
            audioBuffer = undefined;
          }

          // Stop recording if the server is done with STT stage
          if (event.type === "stt-end") {
            sttBinaryHandlerId = null;
            void stopListening();
            // To make sure the answer is placed at the right user text, we add it before we process it
            if (lastMessageId) {
              updateMessage(lastMessageId, {
                id: lastMessageId,
                content: event.data.stt_output.text,
                sender: "server",
                timestamp: Date.now(),
              });
            } else {
              const messageId = `ha-response-message-${Date.now()}`;
              setLastMessageId(messageId);
              addMessage({
                id: messageId,
                content: event.data.stt_output.text,
                sender: "server",
                timestamp: Date.now(),
              });
            }
          }

          if (event.type === "intent-end") {
            setConversationId(event.data.intent_output.conversation_id);
            const plain = event.data.intent_output.response.speech?.plain;
            if (plain) {
              const messageId = `ha-response-message-${Date.now()}`;
              setLastMessageId(messageId);
              addMessage({
                id: messageId,
                content: plain.speech,
                sender: "server",
                timestamp: Date.now(),
              });
            }
          }

          if (event.type === "tts-end") {
            const url = `${generateHomeAssistantURLFromSettings(
              settingsToHomeAssistantSettings(settings),
            )}${event.data.tts_output.url}`;
            audio = new Audio(url);
            console.log("Playing audio:", url);
            void audio.play();
            audio.addEventListener("ended", unloadAudio);
            audio.addEventListener("pause", unloadAudio);
            audio.addEventListener("canplaythrough", playAudio);
            audio.addEventListener("error", audioError);
          }

          if (event.type === "run-end") {
            sttBinaryHandlerId = null;
            if (unsub) void unsub();
          }

          if (event.type === "error") {
            sttBinaryHandlerId = null;
            addMessage({
              id: `ha-response-error-${Date.now()}`,
              content: event.data.message,
              sender: "server",
              timestamp: Date.now(),
            });

            void stopListening();
            if (unsub) void unsub();
          }
        },
      );
    } catch (error) {
      console.error("Error starting pipeline:", error);
      void stopListening();
    }
  }

  async function stopListening(): Promise<void> {
    await audioRecorder?.stop();
    if (sttBinaryHandlerId) {
      if (audioBuffer) {
        for (const chunk of audioBuffer) {
          sendAudioChunk(chunk);
        }
      }
      // Send empty message to indicate we're done streaming.
      sendAudioChunk(new Int16Array());
      sttBinaryHandlerId = null;
    }
    audioBuffer = undefined;
  }

  function sendAudioChunk(chunk: Int16Array): void {
    if (!homeAssistantClient.connection) {
      console.error("Home Assistant connection not available");
      return;
    }
    homeAssistantClient.connection.socket!.binaryType = "arraybuffer";

    if (sttBinaryHandlerId == undefined) {
      return;
    }
    // Turn into 8 bit so we can prefix our handler ID.
    const data = new Uint8Array(1 + chunk.length * 2);
    data[0] = sttBinaryHandlerId;
    data.set(new Uint8Array(chunk.buffer), 1);

    homeAssistantClient.connection.socket!.send(data);
  }

  function toggleListening(): void {
    const supportsMicrophone = AudioRecorder.isSupported;
    if (!supportsMicrophone) {
      console.error("Microphone not supported");
      addMessage({
        id: `ha-response-error-${Date.now()}`,
        content: "Microphone not supported",
        sender: "server",
        timestamp: Date.now(),
      });
      return;
    }
    if (!audioRecorder?.active) void startListening();
    else void stopListening();
  }

  async function processUserMessage(message: string): Promise<void> {
    if (!currentPipeline) throw new Error("No pipeline selected");

    // Call pipeline
    const unsub = await homeAssistantClient.runAssistPipeline(
      {
        start_stage: "intent",
        input: { text: message },
        end_stage: currentPipeline.tts_engine ? "tts" : "intent",
        pipeline: currentPipeline.id,
        conversation_id: conversationId,
      },
      (event: PipelineRunEvent) => {
        console.log("Got pipeline event:", event);
        if (event.type === "intent-end") {
          setConversationId(event.data.intent_output.conversation_id);
          const plain = event.data.intent_output.response.speech?.plain;
          if (plain) {
            const messageId = `ha-response-message-${Date.now()}`;
            setLastMessageId(messageId);
            addMessage({
              id: messageId,
              content: plain.speech,
              sender: "server",
              timestamp: Date.now(),
            });
          }
          if (unsub) void unsub();
        }
        if (event.type === "error") {
          addMessage({
            id: `ha-response-error-${Date.now()}`,
            content: event.data.message,
            sender: "server",
            timestamp: Date.now(),
          });
          if (unsub) void unsub();
        }

        if (event.type === "tts-end") {
          const url = `${generateHomeAssistantURLFromSettings(
            settingsToHomeAssistantSettings(settings),
          )}${event.data.tts_output.url}`;
          const audio = new Audio(url);
          console.log("Playing audio:", url);
          void audio.play();
          audio.addEventListener("ended", unloadAudio);
          audio.addEventListener("pause", unloadAudio);
          audio.addEventListener("canplaythrough", playAudio);
          audio.addEventListener("error", audioError);
        }
      },
    );
  }

  useEffect(() => {
    const hydrate = async (): Promise<void> => {
      await rehydrateMessages();
      setIsHydrated(true);
    };
    void hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (
      !settings.homeAssistantUrl?.length ||
      !settings.homeAssistantAccessToken?.length
    ) {
      removeMessageIfExists("ha-greeting");
      addMessage({
        id: "ha-auth-required",
        content: "Please enter a Home Assistant URL and access token",
        sender: "system",
        actions: [
          <SettingsForm
            key="settings-form"
            show={{
              homeAssistant: true,
            }}
          />,
        ],
        timestamp: Date.now(),
      });

      return;
    }

    const homeAssistantUrl = new URL(settings.homeAssistantUrl);

    homeAssistantClient = new HomeAssistant(
      connectedCallback,
      configReceivedCallback,
      {
        access_token: settings.homeAssistantAccessToken,
        host: homeAssistantUrl.hostname,
        port: parseInt(homeAssistantUrl.port),
        ssl: homeAssistantUrl.protocol === "https:",
      },
    );

    void homeAssistantClient.connect();

    return () => {
      homeAssistantClient.disconnect();
    };
  }, [
    addMessage,
    removeMessageIfExists,
    settings.homeAssistantAccessToken,
    settings.homeAssistantUrl,
    isHydrated,
    connectedCallback,
    configReceivedCallback,
  ]);

  return {
    config,
    pipelines,
    currentPipeline,
    reconnect,
    toggleListening,
    processUserMessage,
    setCurrentPipeline,
  };
}
