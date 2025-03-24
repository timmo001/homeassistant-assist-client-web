import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AssistPipeline } from "~/lib/home-assistant/assist/types";

type HomeAssistantPipelinesStore = {
  pipelines: Array<AssistPipeline>;
  currentPipeline: AssistPipeline | null;
  setPipelines: (pipelines: Array<AssistPipeline>) => void;
  setCurrentPipeline: (pipeline: AssistPipeline | null) => void;
};

export const useHomeAssistantPipelinesStore = create<HomeAssistantPipelinesStore>()(
  persist(
    (set) => ({
      pipelines: [],
      currentPipeline: null,
      setPipelines: (pipelines) => set({ pipelines }),
      setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
      }),
      {
        name: "home-assistant-pipeline",
        storage: createJSONStorage(() => localStorage),
        version: 1,
      },
    ),
  );
