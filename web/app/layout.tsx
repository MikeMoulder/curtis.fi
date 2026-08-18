import type { Metadata, Viewport } from "next";
import {
  Instrument_Serif,
  Bodoni_Moda,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Three faces, three jobs.
 *
 * Instrument Serif carries the display type. It is the deliberate departure —
 * near every DeFi front end sets its headlines in the same geometric sans, and
 * a high-contrast serif reads as considered before a single word is read.
 * Space Grotesk handles UI and prose; JetBrains Mono carries every number, so
 * figures align in columns and never jitter as they update.
 */
const serifDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-display",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Curtis · autonomous liquidity on BDEX",
  description:
    "Curtis chooses the range, re-centres it as price moves, and compounds the fees, inside limits your vault enforces on-chain.",
};

export const viewport: Viewport = {
  themeColor: "#060709",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${serifDisplay.variable} ${grotesk.variable} ${mono.variable}`}
    >
      <body>
        <div className="fog" aria-hidden="true">
          <div className="fog-mass fog-a" />
          <div className="fog-mass fog-b" />
          <div className="fog-mass fog-c" />
        </div>
        <div className="grain" aria-hidden="true" />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
