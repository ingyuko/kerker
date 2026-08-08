import { NextResponse } from "next/server";

import { authenticate } from "./auth";
import { ValidationError } from "./validate";

/** Uniform JSON error shape so the client can always read `error`. */
export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Runs a route handler behind the passcode gate and turns thrown errors into
 * JSON. Every options API route goes through here — an unauthenticated request
 * must never reach the store.
 */
export async function guarded<T>(
  handler: () => Promise<T>,
): Promise<NextResponse> {
  const auth = await authenticate();
  if (auth.status === "misconfigured") {
    return fail(auth.message, 500);
  }
  if (auth.status === "unauthenticated") {
    return fail("請先輸入通行碼。", 401);
  }

  try {
    return NextResponse.json(await handler());
  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(err.message, 400);
    }
    // Log the detail server-side; return something the phone can act on.
    console.error("[options api]", err);
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return fail(message, 500);
  }
}

/** Parses a JSON request body, rejecting anything unparseable. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Request body was not valid JSON.");
  }
}
