"use client";
import { useEffect, useMemo, useState } from "react";
import { BugIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useHomeAssistant } from "~/components/hooks/use-home-assistant";

import { cn } from "~/lib/utils";
import { Markdown } from "~/components/ui/markdown";
import { Button } from "~/components/ui/button";
import { useMessagesStore } from "~/components/hooks/use-messages";

function sanitizeData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeData(value);
  }
  return sanitized;
}

export function ChatDebug() {
  const { config, currentPipeline, pipelines } = useHomeAssistant();
  const { messages } = useMessagesStore();
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const markdownContent = useMemo<string>(
    () => `### Home Assistant

#### Config

\`\`\`json
${JSON.stringify(sanitizeData(config), null, 2)}
\`\`\`

#### Current Pipeline

\`\`\`json
${JSON.stringify(sanitizeData(currentPipeline), null, 2)}
\`\`\`

#### Pipelines

\`\`\`json
${JSON.stringify(sanitizeData(pipelines), null, 2)}
\`\`\`

### Chat

#### Messages

\`\`\`json
${JSON.stringify(sanitizeData(messages), null, 2)}
\`\`\``,
    [config, currentPipeline, pipelines, messages],
  );

  if (!mounted || process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex">
      <div
        className={cn(
          "flex h-[calc(100vh-32px)] w-[90vw] flex-col overflow-hidden rounded-lg border bg-red-900/30 transition-all duration-200 lg:w-[50vw] xl:w-[40vw] 2xl:w-[30vw]",
          !isVisible && "w-0 border-0 xl:w-0 2xl:w-0",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <BugIcon className="size-4" />
            <span className="font-mono text-base leading-none">Debug</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 cursor-pointer p-0"
            onClick={() => setIsVisible(false)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-4">
            <Markdown>{markdownContent}</Markdown>
          </div>
        </div>
      </div>
      {!isVisible && (
        <Button
          className="border bg-red-900/30"
          size="icon"
          variant="secondary"
          onClick={() => setIsVisible(true)}
        >
          <ChevronRightIcon />
        </Button>
      )}
    </div>
  );
}
