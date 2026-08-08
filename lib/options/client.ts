/** Browser-side wrappers around the options API. */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  // `body` is a plain value here, JSON-encoded below — not RequestInit's BodyInit.
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, ...rest } = init ?? {};
  let response: Response;

  try {
    response = await fetch(path, {
      ...rest,
      headers:
        body === undefined
          ? rest.headers
          : { "content-type": "application/json", ...rest.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("連不上伺服器，請確認網路後再試。", 0);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `伺服器錯誤（${response.status}）`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/**
 * Shrinks a picked image before upload: phone screenshots are several
 * megabytes and taller than the model reads at full resolution anyway, so
 * scaling down here saves upload time and image tokens without losing text.
 */
export async function prepareImage(
  file: File,
  maxEdge = 2400,
): Promise<{ mediaType: "image/jpeg"; data: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("這個瀏覽器無法處理圖片，請改用手動輸入。");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // 0.92 keeps small ticker and price text crisp enough to read reliably.
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return {
    mediaType: "image/jpeg",
    data: dataUrl.slice(dataUrl.indexOf(",") + 1),
    preview: dataUrl,
  };
}
