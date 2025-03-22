import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/theme-provider";
// import { QueryProvider } from "~/components/providers/query";

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
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        {/* <QueryProvider> */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="mx-auto flex h-screen w-full max-w-3xl flex-col">
              {children}
            </main>

            <Toaster />
          </ThemeProvider>
        {/* </QueryProvider> */}
      </body>
    </html>
  );
}
