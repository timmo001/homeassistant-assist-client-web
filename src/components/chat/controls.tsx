import { ChatInput } from "~/components/chat/input";
import { ChatPipelines } from "~/components/chat/pipelines";

export async function ChatControls() {
  return (
    <div className="border-border flex flex-col items-stretch gap-2 rounded-t-md border p-2">
      <ChatInput />

      <div className="flex items-center justify-between gap-2">
        <ChatPipelines />
      </div>
    </div>
  );
}
