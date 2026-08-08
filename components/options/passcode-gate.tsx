"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

import { useOptionsData } from "./options-data";

/**
 * Passcode screen. The tracker sits behind a public URL, so nothing loads
 * until the shared passcode is accepted.
 */
export function PasscodeGate() {
  const { unlock } = useOptionsData();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!passcode || busy) return;

    setBusy(true);
    setError(null);
    try {
      await unlock(passcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPasscode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <KeyRound className="mx-auto mb-4 size-8 text-ink/40" strokeWidth={1.5} />
          <h1 className="font-serif text-2xl text-ink">選擇權損益</h1>
          <p className="mt-2 text-sm text-ink/55">
            這是私人交易紀錄，請輸入通行碼。
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            inputMode="text"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="通行碼"
            aria-label="通行碼"
            className="w-full rounded-md border border-line bg-paper px-4 py-3 text-center text-lg tracking-widest text-ink outline-none focus:border-ink/40"
          />

          {error ? (
            <p role="alert" className="text-center text-sm text-loss">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || passcode.length === 0}
            className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-sand transition-opacity disabled:opacity-40"
          >
            {busy ? "驗證中…" : "進入"}
          </button>
        </form>
      </div>
    </div>
  );
}
