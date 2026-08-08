import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  authenticate,
  issueSession,
  verifyPasscode,
} from "@/lib/options/auth";

export const runtime = "nodejs";

/** Whether the browser currently holds a valid session. */
export async function GET() {
  const auth = await authenticate();
  if (auth.status === "misconfigured") {
    return NextResponse.json({ error: auth.message }, { status: 500 });
  }
  return NextResponse.json({ authenticated: auth.status === "ok" });
}

/** Exchanges the passcode for a signed session cookie. */
export async function POST(request: Request) {
  let passcode = "";
  try {
    const body = (await request.json()) as { passcode?: unknown };
    passcode = typeof body.passcode === "string" ? body.passcode : "";
  } catch {
    return NextResponse.json({ error: "請求格式錯誤。" }, { status: 400 });
  }

  if (!process.env.APP_PASSCODE) {
    return NextResponse.json(
      { error: "伺服器尚未設定 APP_PASSCODE。" },
      { status: 500 },
    );
  }

  if (!verifyPasscode(passcode)) {
    return NextResponse.json({ error: "通行碼不正確。" }, { status: 401 });
  }

  const session = issueSession();
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}

/** Signs out by clearing the cookie. */
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
