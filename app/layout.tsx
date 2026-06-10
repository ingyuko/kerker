import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";

import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Ingyu 的 3daysofdesign 設計週指南",
  description:
    "哥本哈根 3daysofdesign 個人行動指南 — 探索展覽、依興趣篩選、規劃每日路線、收藏最愛。A personal, mobile-first design guide for Copenhagen 3daysofdesign.",
  applicationName: "3daysofdesign Guide",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "3dod 指南",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F5F2EB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        {/* App is mobile-first; constrain width on larger screens. */}
        <div className="mx-auto min-h-screen max-w-2xl bg-sand pb-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
