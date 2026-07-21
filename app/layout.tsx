import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chanthaburi Utility Dashboard",
  description: "แดชบอร์ดสภาพอากาศและเครื่องมือช่วยเหลือระบบความคืบหน้าของจันทบุรี",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${prompt.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          {/* Ambient Glowing Blobs */}
          <div className="bg-glow bg-glow-1"></div>
          <div className="bg-glow bg-glow-2"></div>
          <div className="bg-glow bg-glow-3"></div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
