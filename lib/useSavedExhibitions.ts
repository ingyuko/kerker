"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ingyu-3dod-saved";
const EVENT = "ingyu-3dod-saved-changed";

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStore(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  // Notify other hook instances in this tab (storage event only fires cross-tab).
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Local-storage backed favorites. Shared across every component instance in the
 * tab via a custom event, and across tabs via the native `storage` event.
 */
export function useSavedExhibitions() {
  const [saved, setSaved] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSaved(readStore());
    setHydrated(true);

    const sync = () => setSaved(readStore());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.includes(id),
    [saved],
  );

  const toggle = useCallback((id: string) => {
    const current = readStore();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    writeStore(next);
    setSaved(next);
  }, []);

  return { saved, isSaved, toggle, hydrated };
}
