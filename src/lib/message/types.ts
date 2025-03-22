import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  sender: z.enum(["system", "user", "server"]),
  timestamp: z.number(),
  actions: z.array(z.any()).optional(),
  isToday: z.boolean().optional(),
  timestampFormatted: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const MessagesSchema = z.array(MessageSchema);

export type Messages = z.infer<typeof MessagesSchema>;

export const MessageFormattedSchema = MessageSchema.superRefine((message) => {
  const today = new Date();
  const messageDate = new Date(message.timestamp);
  const messageDateFormatted = messageDate.toLocaleDateString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayDateFormatted = today.toLocaleDateString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  message.isToday = messageDateFormatted === todayDateFormatted;
  message.timestampFormatted = message.isToday
    ? messageDate.toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : messageDate.toLocaleString([], {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  return message;
});

export type MessageFormatted = z.infer<typeof MessageFormattedSchema>;

export const MessagesFormattedSchema = z.array(MessageFormattedSchema);

export type MessagesFormatted = z.infer<typeof MessagesFormattedSchema>;
