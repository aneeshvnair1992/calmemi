import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://calmemi.web.app"),
  title: {
    default: "calm.emi — Stress-Free Family Debt & Budget Tracker",
    template: "%s | calm.emi",
  },
  description: "Track family EMIs, calculate your monthly financial breathing room, simulate debt payoffs, and organize installments with zero finance jargon. Clarity over anxiety.",
  keywords: [
    "EMI tracker",
    "family budget planner",
    "debt payoff simulator",
    "breathing room calculator",
    "loan management app",
    "stress-free finance",
    "snowball debt calculator",
    "calmemi",
    "debt-free target"
  ],
  authors: [{ name: "calm.emi Team", url: "https://calmemi.web.app" }],
  creator: "calm.emi",
  publisher: "calm.emi",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://calmemi.web.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://calmemi.web.app",
    title: "calm.emi — Clarity Over Anxiety | Family EMI & Debt Tracker",
    description: "Track family EMIs, calculate your monthly financial breathing room, simulate debt payoffs, and organize installments with zero finance jargon.",
    siteName: "calm.emi",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "calm.emi - Stress-Free Family EMI & Debt Tracker Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "calm.emi — Stress-Free Family Debt & Budget Tracker",
    description: "Track family EMIs, calculate your monthly financial breathing room, and simulate payoffs with zero jargon.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
