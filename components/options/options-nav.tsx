"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Layers, PlusCircle, Receipt } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/options", label: "每日", icon: CalendarDays, exact: true },
  { href: "/options/add", label: "新增", icon: PlusCircle, exact: false },
  { href: "/options/positions", label: "部位", icon: Layers, exact: false },
  { href: "/options/trades", label: "紀錄", icon: Receipt, exact: false },
] as const;

export function OptionsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="選擇權損益追蹤"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sand/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
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
                <Icon className="size-5" strokeWidth={active ? 2 : 1.5} />
                <span className="text-[0.7rem] font-medium leading-none">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
