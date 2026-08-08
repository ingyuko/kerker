import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "kerker_options_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Single-user passcode gate.
 *
 * The tracker holds a personal trading record behind a public URL, so every
 * API route requires a signed session cookie. `APP_PASSCODE` is the passcode;
 * without it set, a production deploy refuses all requests rather than serving
 * the record to anyone who finds the URL.
 */
export type AuthState =
  | { status: "ok" }
  | { status: "unauthenticated" }
  | { status: "misconfigured"; message: string };

function secret(): string {
  const passcode = process.env.APP_PASSCODE ?? "";
  // The passcode doubles as the signing key; a separate secret is optional but
  // makes cookies survive a passcode change.
  return `${process.env.APP_SESSION_SECRET ?? ""}:${passcode}`;
}

function sign(expiresAt: number): string {
  return createHmac("sha256", secret()).update(String(expiresAt)).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Builds the cookie value for a freshly issued session. */
export function issueSession(): { value: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return {
    value: `${expiresAt}.${sign(expiresAt)}`,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function verifyPasscode(input: string): boolean {
  const expected = process.env.APP_PASSCODE ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

function verifySession(value: string | undefined): boolean {
  if (!value) return false;
  const [rawExpiry, signature] = value.split(".");
  if (!rawExpiry || !signature) return false;

  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, sign(expiresAt));
}

/** Reads the request's session cookie and decides whether to serve it. */
export async function authenticate(): Promise<AuthState> {
  const passcode = process.env.APP_PASSCODE ?? "";

  if (!passcode) {
    if (process.env.NODE_ENV === "production") {
      return {
        status: "misconfigured",
        message:
          "APP_PASSCODE is not set. Set it in the deployment environment so " +
          "the trading record is not publicly readable.",
      };
    }
    // Local development without a passcode: open, but never in production.
    return { status: "ok" };
  }

  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value)
    ? { status: "ok" }
    : { status: "unauthenticated" };
}

/** True when the browser must show the passcode screen before the app. */
export async function passcodeRequired(): Promise<boolean> {
  const state = await authenticate();
  return state.status !== "ok";
}
