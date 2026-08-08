import { fail, readJson } from "@/lib/options/api";
import { authenticate } from "@/lib/options/auth";
import {
  SUPPORTED_MEDIA_TYPES,
  ScreenshotParseError,
  type ScreenshotImage,
  type SupportedMediaType,
  parseScreenshots,
} from "@/lib/options/parse-screenshot";
import { ValidationError } from "@/lib/options/validate";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reading a screenshot is a single model call, but a slow one.
export const maxDuration = 120;

const MAX_IMAGES = 4;
/** Base64 characters, roughly 5 MB of image data. */
const MAX_BASE64_LENGTH = 7_000_000;

function parseImages(raw: unknown): ScreenshotImage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ValidationError("請至少提供一張截圖。");
  }
  if (raw.length > MAX_IMAGES) {
    throw new ValidationError(`一次最多 ${MAX_IMAGES} 張截圖。`);
  }

  return raw.map((item, i) => {
    const image = item as { mediaType?: unknown; data?: unknown };
    const mediaType = String(image.mediaType ?? "");
    if (!SUPPORTED_MEDIA_TYPES.includes(mediaType as SupportedMediaType)) {
      throw new ValidationError(
        `第 ${i + 1} 張圖片格式不支援（${mediaType}）。支援 PNG、JPEG、WebP、GIF。`,
      );
    }

    const data = String(image.data ?? "").replace(/^data:[^,]+,/, "");
    if (!data) {
      throw new ValidationError(`第 ${i + 1} 張圖片沒有內容。`);
    }
    if (data.length > MAX_BASE64_LENGTH) {
      throw new ValidationError(
        `第 ${i + 1} 張圖片太大，請縮小後再上傳（上限約 5MB）。`,
      );
    }
    return { mediaType: mediaType as SupportedMediaType, data };
  });
}

/**
 * Reads screenshots into draft legs. Nothing is written here — the client
 * shows the result for confirmation and POSTs to /executions afterwards.
 */
export async function POST(request: Request) {
  const auth = await authenticate();
  if (auth.status === "misconfigured") return fail(auth.message, 500);
  if (auth.status === "unauthenticated") return fail("請先輸入通行碼。", 401);

  try {
    const body = (await readJson(request)) as { images?: unknown };
    const images = parseImages(body.images);
    const result = await parseScreenshots(images);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    if (err instanceof ScreenshotParseError) return fail(err.message, 502);
    console.error("[options parse-screenshot]", err);
    return fail("讀取截圖時發生未預期的錯誤。", 500);
  }
}
