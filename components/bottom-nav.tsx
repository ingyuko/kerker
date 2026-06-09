"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Map, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Browse", icon: Home },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/map", label: "Map", icon: Map },
  { href: "/saved", label: "Saved", icon: Heart },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sand/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
                  active ? "text-ink" : "text-ink/45 hover:text-ink/70",
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2 : 1.5}
                  fill={active && label === "Saved" ? "currentColor" : "none"}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
