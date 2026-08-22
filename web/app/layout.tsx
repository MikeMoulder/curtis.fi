import type { Metadata, Viewport } from "next";
import { Archivo, Newsreader, Martian_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Three faces, one system.
 *
 * The page is built as a measured drawing, so the type is drafting type.
 *
 * Archivo carries display and UI. It ships a width axis (62–125), which is the
 * reason it is here: headlines are set EXPANDED, like lettering stencilled onto
 * an instrument case, while the same family at NORMAL width handles interface
 * text. One family across two widths reads as a system; two unrelated sans
 * faces read as indecision.
 *
 * Newsreader sets every piece of reading prose, with its optical-size axis so
 * long paragraphs and pull-quotes are cut differently rather than scaled. A
 * reading serif on a technical sheet is the deliberate tension in the pairing —
 * it makes the argument feel written rather than shipped.
 *
 * Martian Mono carries measurements. Also a width axis (75–112.5), held
 * condensed: numerals on a graduated scale need to be narrow enough to sit
 * under their own tick without colliding with the next one. Every figure on the
 * site is tabular, so digits never jitter as they update.
 */
const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--f-display",
  display: "swap",
});

const read = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--f-read",
  display: "swap",
});

const meter = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--f-meter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Curtis · liquidity held inside tolerance",
  description:
    "A concentrated liquidity position on BDEX earns only while price sits inside the range you chose. Curtis picks that range, holds it over the market as price moves, and folds the fees back in — inside limits your vault enforces in its own code.",
};

export const viewport: Viewport = {
  themeColor: "#E4E7E2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${read.variable} ${meter.variable}`}
    >
      <body>
        {/* The sheet the drawing sits on: a graduated rule down the binding
            edge, and the faint tooth of the film itself. Both are fixed, both
            are inert, and the rule is hidden on narrow screens where it would
            cost more width than it earns. */}
        <div className="sheet-rule" aria-hidden="true" />
        <div className="sheet-tooth" aria-hidden="true" />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
