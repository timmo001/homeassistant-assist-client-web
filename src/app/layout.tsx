import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { VercelToolbar } from "@vercel/toolbar/next";

import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/theme-provider";
import { HomeAssistantProvider } from "~/components/hooks/use-home-assistant";

export const metadata: Metadata = {
  title: "Home Assistant Assist",
  description: "A client for Home Assistant Assist",
  icons: [{ rel: "icon", url: "/icon" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const shouldInjectToolbar = process.env.NODE_ENV === "development";

  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <HomeAssistantProvider>
            <main className="mx-auto flex h-screen w-full max-w-3xl flex-col">
              {children}
            </main>
          </HomeAssistantProvider>

          <Toaster />

          {shouldInjectToolbar && <VercelToolbar />}
        </ThemeProvider>
      </body>
    </html>
  );
}
