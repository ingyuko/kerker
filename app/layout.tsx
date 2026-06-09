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
  title: "Ingyu's 3daysofdesign Guide",
  description:
    "A personal, mobile-first design guide for Copenhagen 3daysofdesign — discover exhibitions, filter by interest, plan daily routes, and save favorites.",
  applicationName: "3daysofdesign Guide",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "3dod Guide",
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
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
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
