"use client";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type Connection,
  type HassConfig,
  type HassUser,
} from "home-assistant-js-websocket";

import {
  generateHomeAssistantURLFromSettings,
  HomeAssistant,
} from "~/lib/home-assistant";
import { settingsToHomeAssistantSettings } from "~/lib/home-assistant";
import type {
  AssistPipeline,
  PipelineRunEvent,
} from "~/lib/home-assistant/assist/types";
import { AudioRecorder } from "~/lib/home-assistant/audioRecorder";
import { useSettingsStore } from "~/components/hooks/use-settings";
import {
  rehydrateMessages,
  useMessagesStore,
} from "~/components/hooks/use-messages";
import { useHomeAssistantPipelinesStore } from "~/components/hooks/use-home-assistant-pipeline";
import { SettingsForm } from "~/components/settings/form";

export type HomeAssistantContextType = {
  config: HassConfig | null;
  reconnect: () => void;
  toggleListening: () => void;
  processUserMessage: (message: string) => Promise<void>;
};

export const HomeAssistantContext =
  createContext<HomeAssistantContextType | null>(null);

let homeAssistantClient: HomeAssistant;
let audio: HTMLAudioElement | undefined;
let audioBuffer: Int16Array[] | undefined;
let audioRecorder: AudioRecorder | undefined;
let sttBinaryHandlerId: number | null;

export function HomeAssistantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HassConfig | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [continueConversation, setContinueConversation] = useState<boolean>(false);

  const { settings } = useSettingsStore();
  const { addMessage, removeMessageIfExists, updateMessage } =
    useMessagesStore();
  const { currentPipeline, setCurrentPipeline, setPipelines } =
    useHomeAssistantPipelinesStore();

  const connectedCallback = useCallback(
    (connection: Connection, user: HassUser): void => {
      console.log("[Assist] Connected to Home Assistant", connection, user);

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
      console.log("[Assist] Config received from Home Assistant", config);
      setConfig(config);

      // Get pipelines
      void homeAssistantClient
        .listAssistPipelines()
        ?.then(
          (pipelinesData: {
            pipelines: AssistPipeline[];
            preferred_pipeline: string | null;
          }) => {
            console.log("[Assist] Got pipelines:", pipelinesData);
            setPipelines(pipelinesData.pipelines);
            if (!currentPipeline) {
              const preferredPipeline = pipelinesData.pipelines.find(
                (pipeline) => pipeline.id === pipelinesData.preferred_pipeline,
              );
              if (preferredPipeline) {
                console.log(
                  "[Assist] Setting preferred pipeline:",
                  preferredPipeline,
                );
                setCurrentPipeline(preferredPipeline);
                addMessage({
                  id: `ha-pipeline-change-${Date.now()}`,
                  content: `Pipeline set to ${preferredPipeline.name}`,
                  sender: "system",
                  timestamp: Date.now(),
                });
              } else console.error("[Assist] No preferred pipeline found");
            }
          },
        );
    },
    [addMessage, currentPipeline, setCurrentPipeline, setPipelines],
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
    console.log("[Assist] Playing audio..");
    void audio?.play();
  }

  function audioError(): void {
    console.error("[Assist] Audio error:", audio);
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

    if (!audioRecorder.sampleRate) {
      throw new Error("Failed to get sample rate from audio recorder");
    }

    const messageId = `ha-response-message-${Date.now()}`;
    addMessage({
      id: messageId,
      content: "...",
      sender: "server",
      timestamp: Date.now(),
    });

    if (!currentPipeline) throw new Error("No pipeline selected");

    // Prepare to accumulate streaming response
    let accumulatedResponse = "";
    try {
      const unsub = await homeAssistantClient.runAssistPipeline(
        {
          start_stage: "stt",
          end_stage: currentPipeline.tts_engine ? "tts" : "intent",
          input: { sample_rate: audioRecorder.sampleRate },
          pipeline: currentPipeline.id,
          conversation_id: conversationId,
        },
        (event) => {
          switch (event.type) {
            case "run-start": {
              sttBinaryHandlerId = event.data.runner_data.stt_binary_handler_id;
              break;
            }
            case "stt-start": {
              if (audioBuffer) {
                // Send the buffer over the WS to the STT engine.
                for (const buffer of audioBuffer) {
                  sendAudioChunk(buffer);
                }
                audioBuffer = undefined;
              }
              break;
            }
            case "stt-end": {
              sttBinaryHandlerId = null;
              void stopListening();
              updateMessage({
                id: messageId,
                content: event.data.stt_output.text,
                sender: "server",
                timestamp: Date.now(),
              });
              break;
            }
            case "intent-progress": {
              console.log("[Assist] intent-progress event:", event);
              console.log(
                "[Assist] chat_log_delta:",
                event.data.chat_log_delta,
              );
              // Append new chunk if present
              if (
                event.data.chat_log_delta &&
                "content" in event.data.chat_log_delta &&
                event.data.chat_log_delta.content
              ) {
                accumulatedResponse += event.data.chat_log_delta.content;
                console.log(
                  "[Assist] accumulatedResponse:",
                  accumulatedResponse,
                );
                updateMessage({
                  id: messageId,
                  content: accumulatedResponse,
                  sender: "server",
                  timestamp: Date.now(),
                });
              }
              break;
            }
            case "intent-end": {
              setConversationId(event.data.intent_output.conversation_id);
              setContinueConversation(event.data.intent_output.continue_conversation);
              const plain = event.data.intent_output.response.speech?.plain;
              if (plain?.speech) {
                updateMessage({
                  id: messageId,
                  content: plain.speech,
                  sender: "server",
                  timestamp: Date.now(),
                });
              }
              break;
            }
            case "tts-end": {
              const url = `${generateHomeAssistantURLFromSettings(
                settingsToHomeAssistantSettings(settings),
              )}${event.data.tts_output.url}`;
              audio = new Audio(url);
              console.log("Playing audio:", url);
              void audio.play();
              audio.addEventListener("ended", () => {
                unloadAudio();
                if (continueConversation) {
                  void startListening();
                }
              });
              audio.addEventListener("pause", unloadAudio);
              audio.addEventListener("canplaythrough", playAudio);
              audio.addEventListener("error", audioError);
              break;
            }
            case "run-end": {
              sttBinaryHandlerId = null;
              if (unsub) void unsub();
              break;
            }
            case "error": {
              sttBinaryHandlerId = null;
              addMessage({
                id: `ha-response-error-${Date.now()}`,
                content: event.data.message,
                sender: "server",
                timestamp: Date.now(),
              });
              void stopListening();
              if (unsub) void unsub();
              break;
            }
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

    // Create initial message ID that will be updated
    const messageId = `ha-response-message-${Date.now()}`;
    addMessage({
      id: messageId,
      content: "...",
      sender: "server",
      timestamp: Date.now(),
    });

    // Prepare to accumulate streaming response
    let accumulatedResponse = "";
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
        console.log("[Assist] Got pipeline event:", event);

        switch (event.type) {
          case "intent-progress": {
            console.log("[Assist] intent-progress event:", event);
            console.log("[Assist] chat_log_delta:", event.data.chat_log_delta);
            // Append new chunk if present
            if (
              event.data.chat_log_delta &&
              "content" in event.data.chat_log_delta &&
              event.data.chat_log_delta.content
            ) {
              accumulatedResponse += event.data.chat_log_delta.content;
              console.log("[Assist] accumulatedResponse:", accumulatedResponse);
              updateMessage({
                id: messageId,
                content: accumulatedResponse,
                sender: "server",
                timestamp: Date.now(),
              });
            }
            break;
          }
          case "intent-end": {
            setConversationId(event.data.intent_output.conversation_id);
            setContinueConversation(event.data.intent_output.continue_conversation);
            const plain = event.data.intent_output.response.speech?.plain;
            if (plain?.speech) {
              updateMessage({
                id: messageId,
                content: plain.speech,
                sender: "server",
                timestamp: Date.now(),
              });
            }
            if (unsub) void unsub();
            break;
          }
          case "error": {
            addMessage({
              id: `ha-response-error-${Date.now()}`,
              content: event.data.message,
              sender: "server",
              timestamp: Date.now(),
            });
            if (unsub) void unsub();
            break;
          }
          case "tts-end": {
            const url = `${generateHomeAssistantURLFromSettings(
              settingsToHomeAssistantSettings(settings),
            )}${event.data.tts_output.url}`;
            const audio = new Audio(url);
            console.log("[Assist] Playing audio:", url);
            void audio.play();
            audio.addEventListener("ended", () => {
              unloadAudio();
              if (continueConversation) {
                void startListening();
              }
            });
            audio.addEventListener("pause", unloadAudio);
            audio.addEventListener("canplaythrough", playAudio);
            audio.addEventListener("error", audioError);
            break;
          }
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

    homeAssistantClient = new HomeAssistant(
      connectedCallback,
      configReceivedCallback,
      settingsToHomeAssistantSettings(settings),
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
    settings,
  ]);

  return (
    <HomeAssistantContext.Provider
      value={{
        config,
        reconnect,
        toggleListening,
        processUserMessage,
      }}
    >
      {children}
    </HomeAssistantContext.Provider>
  );
}
