import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AssistPipeline } from "~/lib/home-assistant/assist/types";

type HomeAssistantPipelineStore = {
  currentPipeline: AssistPipeline | null;
  setCurrentPipeline: (pipeline: AssistPipeline | null) => void;
};

export const useHomeAssistantPipelineStore =
  create<HomeAssistantPipelineStore>()(
    persist(
      (set) => ({
        currentPipeline: null,
        setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
      }),
      {
        name: "home-assistant-pipeline",
        storage: createJSONStorage(() => localStorage),
        version: 1,
      },
    ),
  );
