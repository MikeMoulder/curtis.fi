import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Three faces, three jobs.
 *
 * Instrument Sans carries the display type at 600. The earlier serif treatment
 * was set too large and leaned on an italic to mark emphasis, which put three
 * words on three lines and read as decoration rather than structure. A tight
 * grotesque holds a headline on two lines at this size, and emphasis is carried
 * by colour instead of a second face.
 *
 * Space Grotesk handles UI and prose. JetBrains Mono carries every number, so
 * figures align in columns and never jitter as they update.
 */
const display = Instrument_Sans({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-face",
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
      className={`${display.variable} ${grotesk.variable} ${mono.variable}`}
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
