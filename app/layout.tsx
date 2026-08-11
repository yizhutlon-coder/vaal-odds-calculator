import type { Metadata } from "next";
import { Cinzel, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vaal-odds-calculator.thelordofnerds.chatgpt.site"),
  title: "Vaal Odds — PoE Corruption Calculator",
  description: "Calculate weighted Vaal Orb and Locus odds, project costs, and simulate corrupting real Path of Exile equipment.",
  openGraph: {
    title: "Vaal Odds — Corrupt It Yourself",
    description: "Calculate the odds, simulate the slam, and share your corruption luck.",
    type: "website",
    images: [{ url: "/og.png", width: 1728, height: 896, alt: "Vaal Odds — Corrupt It Yourself" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaal Odds — Corrupt It Yourself",
    description: "Calculate the odds, simulate the slam, and share your corruption luck.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
