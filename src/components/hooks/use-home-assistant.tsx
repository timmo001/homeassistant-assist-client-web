"use client";
import { useContext } from "react";
import {
  HomeAssistantContext,
  type HomeAssistantContextType,
} from "~/components/providers/home-assistant-provider";

export function useHomeAssistant(): HomeAssistantContextType {
  const context = useContext(HomeAssistantContext);
  if (!context) {
    throw new Error(
      "useHomeAssistant must be used within a HomeAssistantProvider",
    );
  }
  return context;
}
