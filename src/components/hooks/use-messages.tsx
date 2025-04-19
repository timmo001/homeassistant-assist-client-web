import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  type Message,
  MessageSchema,
  MessagesSchema,
} from "~/lib/message/types";

export const INITIAL_MESSAGES: Array<Message> = MessagesSchema.parse([
  {
    id: "welcome",
    content: `#### 👋 Hi there!

Welcome to Home Assistant Assist by \`@timmo001\`.

I'm here to help you interact with your Home Assistant instance using the Assist interface.

> [!NOTE]
> This is a third party tool and is not affiliated with Home Assistant.
`,
    sender: "system",
    timestamp: Date.now(),
  },
] as Message[]);

type MessagesStore = {
  messages: Array<Message>;
  clearMessages: () => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessageIfExists: (id: string) => void;
};

export const useMessagesStore = create<MessagesStore>()(
  persist(
    (set, get) => ({
      messages: INITIAL_MESSAGES,
      clearMessages: () => set({ messages: INITIAL_MESSAGES }),
      addMessage: (message: Message) => {
        const current = get().messages;

        if (current.findIndex((m: Message) => m.id === message.id) > -1) {
          // Remove existing message
          current.splice(
            current.findIndex((m: Message) => m.id === message.id),
            1,
          );
        }

        set({
          messages: [...current, MessageSchema.parse(message)],
        });
      },
      removeMessageIfExists: (id: string) => {
        const current = get().messages;
        const index = current.findIndex((m: Message) => m.id === id);

        if (index > -1) {
          current.splice(index, 1);
          set({ messages: current });
        }
      },
      updateMessage: (message: Message) => {
        const current = get().messages;
        const index = current.findIndex((m: Message) => m.id === message.id);
        if (index > -1) {
          current[index] = message;
          set({ messages: current });
        } else {
          console.error(`Message with id ${message.id} not found`);
        }
      },
    }),
    {
      name: "messages-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

// Export rehydrate function
export const rehydrateMessages = async () => {
  await useMessagesStore.persist.rehydrate();
};
