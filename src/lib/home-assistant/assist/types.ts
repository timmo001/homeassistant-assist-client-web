// https://github.com/home-assistant/frontend/blob/dev/src/data/conversation.ts
type IntentTarget = {
  type: "area" | "device" | "entity" | "domain" | "device_class" | "custom";
  name: string;
  id: string | null;
};

type IntentResultBase = {
  language: string;
  speech: Record<
    "plain" | "ssml",
    { extra_data: unknown; speech: string }
  > | null;
};

type IntentResultActionDone = IntentResultBase & {
  response_type: "action_done";
  data: {
    targets: Array<IntentTarget>;
    success: Array<IntentTarget>;
    failed: Array<IntentTarget>;
  };
};

type IntentResultQueryAnswer = IntentResultBase & {
  response_type: "query_answer";
  data: {
    targets: Array<IntentTarget>;
    success: Array<IntentTarget>;
    failed: Array<IntentTarget>;
  };
};

type IntentResultError = IntentResultBase & {
  response_type: "error";
  data: {
    code:
      | "no_intent_match"
      | "no_valid_targets"
      | "failed_to_handle"
      | "unknown";
  };
};

export type ConversationResult = {
  conversation_id: string | null;
  response:
    | IntentResultActionDone
    | IntentResultQueryAnswer
    | IntentResultError;
};

// https://github.com/home-assistant/frontend/blob/dev/src/data/stt.ts
export type SpeechMetadata = {
  language: string;
  format: "wav" | "ogg";
  codec: "pcm" | "opus";
  bit_rate: 8 | 16 | 24 | 32;
  sample_rate:
    | 8000
    | 11000
    | 16000
    | 18900
    | 22000
    | 32000
    | 37800
    | 44100
    | 48000;
  channel: 1 | 2;
};

// https://github.com/home-assistant/frontend/blob/dev/src/data/media_source.ts
export type ResolvedMediaSource = {
  url: string;
  mime_type: string;
};

// https://github.com/home-assistant/frontend/blob/dev/src/data/assist_pipeline.ts
export type AssistPipeline = {
  id: string;
  name: string;
  language: string;
  conversation_engine: string;
  conversation_language: string | null;
  stt_engine: string | null;
  stt_language: string | null;
  tts_engine: string | null;
  tts_language: string | null;
  tts_voice: string | null;
  wake_word_entity: string | null;
  wake_word_id: string | null;
};

export type AssistPipelineMutableParams = {
  name: string;
  language: string;
  conversation_engine: string;
  conversation_language: string | null;
  stt_engine: string | null;
  stt_language: string | null;
  tts_engine: string | null;
  tts_language: string | null;
  tts_voice: string | null;
  wake_word_entity: string | null;
  wake_word_id: string | null;
};

export type assistRunListing = {
  pipeline_run_id: string;
  timestamp: string;
};

type PipelineEventBase = {
  timestamp: string;
};

type PipelineRunStartEvent = PipelineEventBase & {
  type: "run-start";
  data: {
    pipeline: string;
    language: string;
    runner_data: {
      stt_binary_handler_id: number | null;
      timeout: number;
    };
  };
};

type PipelineRunEndEvent = PipelineEventBase & {
  type: "run-end";
  data: Record<string, never>;
};

type PipelineErrorEvent = PipelineEventBase & {
  type: "error";
  data: {
    code: string;
    message: string;
  };
};

type PipelineWakeWordStartEvent = PipelineEventBase & {
  type: "wake_word-start";
  data: {
    engine: string;
    metadata: SpeechMetadata;
  };
};

type PipelineWakeWordEndEvent = PipelineEventBase & {
  type: "wake_word-end";
  data: { wake_word_output: { ww_id: string; timestamp: number } };
};

type PipelineSTTStartEvent = PipelineEventBase & {
  type: "stt-start";
  data: {
    engine: string;
    metadata: SpeechMetadata;
  };
};

type PipelineSTTEndEvent = PipelineEventBase & {
  type: "stt-end";
  data: {
    stt_output: { text: string };
  };
};

type PipelineIntentStartEvent = PipelineEventBase & {
  type: "intent-start";
  data: {
    engine: string;
    language: string;
    intent_input: string;
  };
};

type PipelineIntentEndEvent = PipelineEventBase & {
  type: "intent-end";
  data: {
    intent_output: ConversationResult;
  };
};

type PipelineTTSStartEvent = PipelineEventBase & {
  type: "tts-start";
  data: {
    engine: string;
    language: string;
    voice: string;
    tts_input: string;
  };
};

type PipelineTTSEndEvent = PipelineEventBase & {
  type: "tts-end";
  data: {
    tts_output: ResolvedMediaSource;
  };
};

export type PipelineRunEvent =
  | PipelineRunStartEvent
  | PipelineRunEndEvent
  | PipelineErrorEvent
  | PipelineWakeWordStartEvent
  | PipelineWakeWordEndEvent
  | PipelineSTTStartEvent
  | PipelineSTTEndEvent
  | PipelineIntentStartEvent
  | PipelineIntentEndEvent
  | PipelineTTSStartEvent
  | PipelineTTSEndEvent;

export type PipelineRunOptions = (
  | {
      start_stage: "intent" | "tts";
      input: { text: string };
    }
  | {
      start_stage: "stt";
      input: { sample_rate: number };
    }
  | {
      start_stage: "wake_word";
      input: {
        sample_rate: number;
        timeout?: number;
        audio_seconds_to_buffer?: number;
      };
    }
) & {
  end_stage: "stt" | "intent" | "tts";
  pipeline?: string;
  conversation_id?: string | null;
};

export type PipelineRun = {
  init_options?: PipelineRunOptions;
  events: Array<PipelineRunEvent>;
  stage: "ready" | "wake_word" | "stt" | "intent" | "tts" | "done" | "error";
  run: PipelineRunStartEvent["data"];
  error?: PipelineErrorEvent["data"];
  wake_word?: PipelineWakeWordStartEvent["data"] &
    Partial<PipelineWakeWordEndEvent["data"]> & { done: boolean };
  stt?: PipelineSTTStartEvent["data"] &
    Partial<PipelineSTTEndEvent["data"]> & { done: boolean };
  intent?: PipelineIntentStartEvent["data"] &
    Partial<PipelineIntentEndEvent["data"]> & { done: boolean };
  tts?: PipelineTTSStartEvent["data"] &
    Partial<PipelineTTSEndEvent["data"]> & { done: boolean };
};
