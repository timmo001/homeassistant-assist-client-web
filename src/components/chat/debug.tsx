"use client";
import { useMemo } from "react";
import { useHomeAssistant } from "~/components/hooks/use-home-assistant";

import { Markdown } from "~/components/ui/markdown";
import { useMessagesStore } from "~/components/hooks/use-messages";

export function ChatDebug() {
  const { config, currentPipeline, pipelines } = useHomeAssistant();
  const { messages } = useMessagesStore();

  const markdownContent = useMemo<string>(
    () => `
    # Config
    ${JSON.stringify(config, null, 2)}
    
    # Current Pipeline
    ${JSON.stringify(currentPipeline, null, 2)}
    
    # Pipelines
    ${JSON.stringify(pipelines, null, 2)}
    
    # Messages
    ${JSON.stringify(messages, null, 2)}
    `,
    [config, currentPipeline, pipelines, messages],
  );

  return (
    <>
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-4 bottom-4 left-4 z-50 flex items-center justify-center">
          <div className="hidden max-h-[80vh] items-center justify-center overflow-y-auto rounded-sm bg-red-500/40 p-4 lg:flex xl:max-w-[20vw] 2xl:max-w-[30vw]">
            <Markdown>{markdownContent}</Markdown>
          </div>
        </div>
      )}
    </>
  );
}
