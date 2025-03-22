import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { SettingsForm } from "~/components/settings/form";

export default async function SettingsPage() {
  return (
    <>
      <header className="mx-auto flex w-full items-center gap-2 pt-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <SettingsForm />
    </>
  );
}
