"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { useOptionsData } from "./options-data";
import { OptionsNav } from "./options-nav";
import { PasscodeGate } from "./passcode-gate";

/** Gates the app on session and initial load before rendering any page. */
export function OptionsShell({ children }: { children: React.ReactNode }) {
  const { status, error, ephemeral, refresh } = useOptionsData();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-ink/30" />
      </div>
    );
  }

  if (status === "locked") {
    return <PasscodeGate />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="mb-4 size-8 text-loss" strokeWidth={1.5} />
        <h1 className="font-serif text-xl text-ink">載入失敗</h1>
        <p className="mt-2 max-w-sm text-sm text-ink/60">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-6 rounded-md border border-line bg-paper px-4 py-2 text-sm text-ink"
        >
          重試
        </button>
      </div>
    );
  }

  return (
    <>
      {ephemeral ? (
        <p className="bg-loss/10 px-4 py-2 text-center text-xs text-loss">
          尚未設定 DATABASE_URL，資料暫存在本機檔案，換裝置不會同步。
        </p>
      ) : null}
      {children}
      <OptionsNav />
    </>
  );
}
