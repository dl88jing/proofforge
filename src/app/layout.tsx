import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { OperatorProvider } from "@/components/operator-switch";
import { Shell } from "@/components/shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Northbridge ProofForge",
  description:
    "Mission intake, proof node, verifier, Proof Pack, human accept, then Solana settle. Operated by Avery and Morgan of the Northbridge household.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <OperatorProvider>
            <Shell>{children}</Shell>
            <Toaster />
          </OperatorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
