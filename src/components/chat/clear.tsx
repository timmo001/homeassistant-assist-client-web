"use client";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useMessagesStore } from "~/components/hooks/use-messages";
import { useHomeAssistant } from "~/components/hooks/use-home-assistant";

export function ChatClear() {
  const { clearMessages } = useMessagesStore();
  const { reconnect } = useHomeAssistant();

  function onClear() {
    clearMessages();
    reconnect();
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Clear" onClick={onClear}>
      <RotateCcwIcon className="h-5 w-5" />
    </Button>
  );
}
