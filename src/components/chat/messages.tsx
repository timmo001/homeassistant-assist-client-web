"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  MessagesFormattedSchema,
  type MessageFormatted,
} from "~/lib/message/types";
import { useMessagesStore } from "~/components/hooks/use-messages";
import { useHomeAssistant } from "~/components/hooks/use-home-assistant";
import { Markdown } from "~/components/ui/markdown";
import { Button } from "~/components/ui/button";

const messageClasses: Record<MessageFormatted["sender"], string> = {
  system:
    "bg-secondary text-secondary-foreground rounded-2xl max-w-full w-full",
  user: "bg-primary text-primary-foreground rounded-2xl rounded-br-xs",
  server: "bg-muted rounded-2xl rounded-bl-xs",
};

export function ChatMessages() {
  const { messages } = useMessagesStore();
  const { processUserMessage } = useHomeAssistant();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Track if we need to auto-scroll after messages update
  const shouldScrollRef = useRef(true);

  // Process user messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === "user") {
      void processUserMessage(lastMessage.content);
    }
  }, [processUserMessage, messages]);

  // Format messages
  const messagesFormatted = useMemo<Array<MessageFormatted>>(
    () => MessagesFormattedSchema.parse(messages),
    [messages],
  );

  // Check if scrolled to bottom
  const checkScrollPosition = () => {
    if (messagesContainerRef.current && !isAutoScrolling) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const atBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 20;
      setIsAtBottom(atBottom);

      // Update the ref when we check manually
      shouldScrollRef.current = atBottom;
    }
  };

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      setIsAutoScrolling(true);
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;

      // Reset auto-scrolling flag after animation and update bottom state
      setTimeout(() => {
        setIsAutoScrolling(false);
        checkScrollPosition();
      }, 100);
    }
  };

  // Auto-scroll when messages change if we're at the bottom
  useEffect(() => {
    if (shouldScrollRef.current) {
      scrollToBottom();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Handle button click for scrolling
  const handleScrollButtonClick = () => {
    shouldScrollRef.current = true;
    scrollToBottom();
  };

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Initial check and set initial scroll position
      setTimeout(() => {
        checkScrollPosition();
        if (shouldScrollRef.current) {
          scrollToBottom();
        }
      }, 0);

      const handleScroll = () => {
        checkScrollPosition();
      };

      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={messagesContainerRef}
        className="absolute inset-0 overflow-y-auto"
      >
        <div className="flex min-h-full flex-col justify-end">
          <div className="space-y-4 p-4">
            <AnimatePresence>
              {messagesFormatted.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex",
                    message.sender === "system" &&
                      "border-border w-full max-w-full border-b-2 border-dashed pb-4",
                    message.sender === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[80%] flex-col gap-1 rounded-2xl p-3",
                      messageClasses[message.sender],
                    )}
                  >
                    <Markdown>{message.content}</Markdown>
                    {message.actions && (
                      <div className="flex justify-end gap-2">
                        {message.actions.map((action, index) => (
                          <Fragment key={index}>{action}</Fragment>
                        ))}
                      </div>
                    )}
                    <p className="text-xs opacity-70" suppressHydrationWarning>
                      {message.timestampFormatted}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-28 left-1/2 z-10 -translate-x-1/2"
          >
            <Button
              className="flex items-center gap-2 rounded-full shadow-md"
              aria-label="Scroll to bottom"
              onClick={handleScrollButtonClick}
            >
              <ArrowDownIcon className="h-4 w-4" />
              <span>New messages</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
