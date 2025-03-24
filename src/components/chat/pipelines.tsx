"use client";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useHomeAssistant } from "~/components/hooks/use-home-assistant";
import { useMessagesStore } from "~/components/hooks/use-messages";
import { useSettingsStore } from "~/components/hooks/use-settings";
import {
  generateHomeAssistantURLFromSettings,
  settingsToHomeAssistantSettings,
} from "~/lib/home-assistant";

export function ChatPipelines() {
  const { currentPipeline, pipelines, setCurrentPipeline } = useHomeAssistant();
  const { addMessage } = useMessagesStore();
  const { settings } = useSettingsStore();

  return (
    <Select
      value={currentPipeline?.id}
      onValueChange={(value) => {
        if (value === "manage") {
          const url = `${generateHomeAssistantURLFromSettings(
            settingsToHomeAssistantSettings(settings),
          )}/config/voice-assistants/assistants`;
          window.open(url, "_blank");
          return;
        }

        const pipeline = pipelines.find((p) => p.id === value);
        if (pipeline) {
          setCurrentPipeline(pipeline);
          toast.success(`Pipeline set to ${pipeline.name}`);
          addMessage({
            id: `ha-pipeline-change-${Date.now()}`,
            content: `Pipeline set to ${pipeline.name}`,
            sender: "system",
            timestamp: Date.now(),
          });
        } else {
          toast.error("Pipeline not found");
        }
      }}
    >
      <SelectTrigger className="min-w-[200px] border-0 bg-transparent dark:bg-transparent">
        <SelectValue placeholder="Select a pipeline" />
      </SelectTrigger>
      <SelectContent>
        {pipelines.map((pipeline) => (
          <SelectItem key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="manage">Manage pipelines</SelectItem>
      </SelectContent>
    </Select>
  );
}
