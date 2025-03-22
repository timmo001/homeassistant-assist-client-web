"use client";
import { Fragment, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

import { cn } from "~/lib/utils";
import {
  MessagesFormattedSchema,
  type MessageFormatted,
} from "~/lib/message/types";
import { useMessagesStore } from "~/components/hooks/use-messages";
import { useHomeAssistant } from "~/components/hooks/use-home-assistant";
const messageClasses: Record<MessageFormatted["sender"], string> = {
  system:
    "bg-secondary text-secondary-foreground rounded-2xl max-w-full w-full",
  user: "bg-primary text-primary-foreground rounded-2xl rounded-br-xs",
  server: "bg-muted rounded-2xl rounded-bl-xs",
};

export function ChatMessages() {
  const { messages } = useMessagesStore();
  const { processUserMessage } = useHomeAssistant();

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

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
              <div className="prose prose-sm dark:prose-invert [&>p]:my-4 first:[&>p]:mt-0 last:[&>p]:mb-0 [&>p:last-child]:mb-0">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
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
  );
}
