import { guarded, readJson } from "@/lib/options/api";
import { getStore, isEphemeralStore } from "@/lib/options/store";
import { parseExecutionInputs } from "@/lib/options/validate";

export const runtime = "nodejs";
// Trading data changes on every write; never serve a cached copy.
export const dynamic = "force-dynamic";

/** All executions, newest fill first, plus the manual marks. */
export async function GET() {
  return guarded(async () => {
    const store = getStore();
    const [executions, marks] = await Promise.all([
      store.listExecutions(),
      store.listMarks(),
    ]);
    return { executions, marks, ephemeral: isEphemeralStore() };
  });
}

/** Creates one or more executions — a multi-leg strategy arrives as one POST. */
export async function POST(request: Request) {
  return guarded(async () => {
    const body = (await readJson(request)) as { executions?: unknown };
    const inputs = parseExecutionInputs(body.executions);
    const created = await getStore().insertExecutions(inputs);
    return { executions: created };
  });
}
