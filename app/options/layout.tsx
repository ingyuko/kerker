import type { Metadata } from "next";

import { OptionsDataProvider } from "@/components/options/options-data";
import { OptionsShell } from "@/components/options/options-shell";

export const metadata: Metadata = {
  title: "選擇權每日損益",
  description:
    "追蹤手機版 thinkorswim 下的選擇權單，看清楚每天的已實現與未實現損益。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "選擇權損益",
  },
};

export default function OptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OptionsDataProvider>
      <OptionsShell>{children}</OptionsShell>
    </OptionsDataProvider>
  );
}
