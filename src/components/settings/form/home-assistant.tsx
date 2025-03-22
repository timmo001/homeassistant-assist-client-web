"use client";
import { type UseFormReturn } from "react-hook-form";

import { type Settings } from "~/lib/setting/types";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";

export function HomeAssistantFormItems({
  form,
}: {
  form: UseFormReturn<Settings>;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="homeAssistantUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Home Assistant URL</FormLabel>
            <Input type="url" {...field} />
            <FormDescription>
              The <b>HTTPS</b> URL of your Home Assistant instance.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="homeAssistantAccessToken"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Home Assistant Access Token</FormLabel>
            <Input type="password" {...field} />
            <FormDescription>
              Your Long-lived access token. You can create a Long-lived access
              token in your Home Assistant profile.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
