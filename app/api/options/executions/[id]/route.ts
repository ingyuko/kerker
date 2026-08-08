import { fail, guarded, readJson } from "@/lib/options/api";
import { getStore } from "@/lib/options/store";
import { ValidationError, parseExecutionInput } from "@/lib/options/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Replaces an execution. The whole record is revalidated rather than patched
 * field by field, so a correction can never leave a half-valid row behind.
 */
export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  return guarded(async () => {
    const body = await readJson(request);
    const input = parseExecutionInput(body);
    const updated = await getStore().updateExecution(id, input);
    if (!updated) {
      throw new ValidationError(`找不到這筆交易（${id}）。`);
    }
    return { execution: updated };
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const response = await guarded(async () => {
    const removed = await getStore().deleteExecution(id);
    return { deleted: removed };
  });

  // A delete that matched nothing is a 404, not a silent success.
  if (response.ok) {
    const body = (await response.clone().json()) as { deleted?: boolean };
    if (body.deleted === false) return fail(`找不到這筆交易（${id}）。`, 404);
  }
  return response;
}
