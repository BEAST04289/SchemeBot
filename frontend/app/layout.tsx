import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sarthi Kalyan | सार्थी कल्याण — AI Government Scheme Discovery",
  description: "AI-powered Indian government welfare scheme discovery. Instantly check eligibility for 100+ central and state schemes. Built with Gemini for XPRIZE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoDevanagari.variable}`}>
      <body className="antialiased min-h-screen bg-slate-50 text-navy flex flex-col">
        {/* Tricolour Stripe at top */}
        <div className="tricolour-bar sticky top-0 z-50 shadow-sm" />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
