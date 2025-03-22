import Link from "next/link"
import { Button } from "~/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="container max-w-2xl mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        <p className="text-muted-foreground">
          This is a placeholder settings page. Add your settings functionality here.
        </p>
      </div>
    </div>
  )
}

