"use client";
import { type UseFormReturn } from "react-hook-form";

import { type Settings } from "~/lib/setting/types";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function ThemeFormItems({ form }: { form: UseFormReturn<Settings> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="theme"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Theme</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="System" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>Set the application theme</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
