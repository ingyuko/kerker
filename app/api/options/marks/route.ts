import { guarded, readJson } from "@/lib/options/api";
import { getStore } from "@/lib/options/store";
import { ValidationError } from "@/lib/options/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return guarded(async () => ({ marks: await getStore().listMarks() }));
}

/** Sets the current premium for one open contract. */
export async function PUT(request: Request) {
  return guarded(async () => {
    const body = (await readJson(request)) as {
      contractKey?: unknown;
      price?: unknown;
    };

    const contractKey =
      typeof body.contractKey === "string" ? body.contractKey.trim() : "";
    if (!contractKey) {
      throw new ValidationError("contractKey is required.");
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new ValidationError(
        `報價必須是不小於 0 的數字（收到 ${String(body.price)}）。`,
      );
    }

    return { mark: await getStore().upsertMark(contractKey, price) };
  });
}

/** Clears a mark, returning the position to "unpriced". */
export async function DELETE(request: Request) {
  return guarded(async () => {
    const contractKey = new URL(request.url).searchParams.get("contractKey");
    if (!contractKey) {
      throw new ValidationError("contractKey query parameter is required.");
    }
    return { deleted: await getStore().deleteMark(contractKey) };
  });
}
