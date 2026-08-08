"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Map, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", key: "browse", zh: "瀏覽", en: "Browse", icon: Home },
  { href: "/planner", key: "planner", zh: "行程", en: "Planner", icon: CalendarDays },
  { href: "/map", key: "map", zh: "地圖", en: "Map", icon: Map },
  { href: "/saved", key: "saved", zh: "收藏", en: "Saved", icon: Heart },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // The options tracker is a separate app under /options with its own nav.
  if (pathname.startsWith("/options")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sand/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ITEMS.map(({ href, key, zh, en, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-ink" : "text-ink/45 hover:text-ink/70",
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2 : 1.5}
                  fill={active && key === "saved" ? "currentColor" : "none"}
                />
                <span className="text-[0.7rem] font-medium leading-none">
                  {zh}
                </span>
                <span className="text-[0.55rem] leading-none opacity-70">
                  {en}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
