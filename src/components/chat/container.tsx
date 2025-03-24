import Link from "next/link";
import { SettingsIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ChatClear } from "~/components/chat/clear";
import { ChatControls } from "~/components/chat/controls";
import { ChatMessages } from "~/components/chat/messages";
import { ChatDebug } from "~/components/chat/debug";

export async function ChatContainer() {
  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-end p-4">
        <ChatClear />
        <Link href="/settings">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* Chat messages */}
      <ChatMessages />

      {/* Chat controls */}
      <ChatControls />

      <ChatDebug />
    </>
  );
}
