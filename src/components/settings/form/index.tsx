"use client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";

import { SettingsSchema, type Settings } from "~/lib/setting/types";
import { Button } from "~/components/ui/button";
import { Form } from "~/components/ui/form";
import { useSettingsStore } from "~/components/hooks/use-settings";
import { HomeAssistantFormItems } from "~/components/settings/form/home-assistant";
import { ThemeFormItems } from "~/components/settings/form/theme";

export function SettingsForm({
  show = {
    theme: true,
    homeAssistant: true,
  },
}: {
  show?: {
    theme?: boolean;
    homeAssistant?: boolean;
  };
}) {
  const { setTheme } = useTheme();
  const { settings, setSettings } = useSettingsStore();

  const form = useForm<Settings>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(data: Settings) {
    try {
      setSettings(data);
      setTheme(data.theme);
      form.reset(data);
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to save settings");
    }
  }

  return (
    <Form {...form}>
      <form
        className="mx-auto flex w-full flex-col gap-4 py-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {show.theme && <ThemeFormItems form={form} />}

        {show.homeAssistant && <HomeAssistantFormItems form={form} />}

        <Button
          className="w-full"
          disabled={!form.formState.isDirty}
          type="submit"
        >
          Save
        </Button>
      </form>
    </Form>
  );
}
