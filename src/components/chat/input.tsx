"use client";
import {
  useState,
  useRef,
  type KeyboardEvent,
  type FormEvent,
  useMemo,
} from "react";
import { SendIcon, XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useMessagesStore } from "~/components/hooks/use-messages";

export function ChatInput() {
  const { messages, addMessage } = useMessagesStore();

  const [inputValue, setInputValue] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (inputValue.trim() === "") return;

    addMessage({
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: Date.now(),
    });

    setInputValue("");

    // Focus back on textarea after sending and reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function clearInput() {
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }

  // Auto-resize textarea
  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);

    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = "auto";
    // Set the height to scrollHeight to expand the textarea
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  }

  const lastMessageWasSystem = useMemo<boolean>(() => {
    return messages[messages.length - 1]?.sender === "system";
  }, [messages]);

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-2">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          className="focus:ring-primary max-h-40 min-h-10 w-full resize-none rounded-md border-0 px-3 py-2 focus:ring-2 focus:outline-none"
          placeholder="Type your message here..."
          disabled={lastMessageWasSystem}
          style={{ overflow: "hidden" }}
          rows={1}
          value={inputValue}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 bottom-2.5 flex items-center justify-center space-x-1">
          {inputValue && (
            <Button
              className="h-8 w-8"
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearInput}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="h-8 w-8"
            disabled={!inputValue.trim()}
            type="submit"
            size="icon"
            variant="ghost"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
