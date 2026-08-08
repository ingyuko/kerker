import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import { marketDate } from "./contract";
import type { Execution, ExecutionInput, Mark } from "./types";

/**
 * Persistence for executions and marks.
 *
 * Production runs on Postgres (`DATABASE_URL`). With no connection string set,
 * a JSON file under `.data/` stands in so `npm run dev` works before any
 * database exists — that fallback is refused in production so a misconfigured
 * deploy fails loudly instead of silently writing to an ephemeral disk.
 */
export interface Store {
  listExecutions(): Promise<Execution[]>;
  insertExecutions(inputs: ExecutionInput[]): Promise<Execution[]>;
  updateExecution(
    id: string,
    patch: Partial<ExecutionInput>,
  ): Promise<Execution | null>;
  deleteExecution(id: string): Promise<boolean>;
  listMarks(): Promise<Mark[]>;
  upsertMark(contractKey: string, price: number): Promise<Mark>;
  deleteMark(contractKey: string): Promise<boolean>;
}

/** Fills in the fields the caller may omit and normalises free-text values. */
function materialise(input: ExecutionInput): Execution {
  const tradedAt = new Date(input.tradedAt).toISOString();
  return {
    id: input.id ?? randomUUID(),
    tradedAt,
    tradeDate: input.tradeDate ?? marketDate(tradedAt),
    underlying: input.underlying.trim().toUpperCase(),
    expiry: input.expiry,
    strike: input.strike,
    right: input.right,
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    fees: input.fees ?? 0,
    multiplier: input.multiplier ?? 100,
    kind: input.kind ?? "TRADE",
    groupId: input.groupId ?? null,
    strategy: input.strategy ?? null,
    note: input.note ?? null,
    source: input.source ?? "manual",
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

const SCHEMA = `
create table if not exists option_executions (
  id           text primary key,
  traded_at    timestamptz not null,
  trade_date   date        not null,
  underlying   text        not null,
  expiry       date        not null,
  strike       numeric(14,4) not null,
  opt_right    char(1)     not null,
  side         text        not null,
  quantity     integer     not null,
  price        numeric(14,4) not null,
  fees         numeric(14,4) not null default 0,
  multiplier   integer     not null default 100,
  kind         text        not null default 'TRADE',
  group_id     text,
  strategy     text,
  note         text,
  source       text        not null default 'manual',
  created_at   timestamptz not null default now()
);
create index if not exists option_executions_trade_date_idx
  on option_executions (trade_date desc);

create table if not exists option_marks (
  contract_key text primary key,
  price        numeric(14,4) not null,
  updated_at   timestamptz not null default now()
);
`;

/** Column shape of `option_executions`, as postgres.js hands it back. */
interface ExecutionRow {
  id: string;
  traded_at: Date | string;
  trade_date: Date | string;
  underlying: string;
  expiry: Date | string;
  strike: string | number;
  opt_right: Execution["right"];
  side: Execution["side"];
  quantity: string | number;
  price: string | number;
  fees: string | number;
  multiplier: string | number;
  kind: Execution["kind"];
  group_id: string | null;
  strategy: string | null;
  note: string | null;
  source: Execution["source"];
  created_at: Date | string;
}

interface MarkRow {
  contract_key: string;
  price: string | number;
  updated_at: Date | string;
}

function rowToExecution(r: ExecutionRow): Execution {
  return {
    id: r.id,
    tradedAt: new Date(r.traded_at).toISOString(),
    // `date` columns come back as a Date at UTC midnight; formatting in UTC
    // preserves the stored calendar day.
    tradeDate: toDateString(r.trade_date),
    underlying: r.underlying,
    expiry: toDateString(r.expiry),
    strike: Number(r.strike),
    right: r.opt_right,
    side: r.side,
    quantity: Number(r.quantity),
    price: Number(r.price),
    fees: Number(r.fees),
    multiplier: Number(r.multiplier),
    kind: r.kind,
    groupId: r.group_id,
    strategy: r.strategy,
    note: r.note,
    source: r.source,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function toDateString(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 10);
  return (value as Date).toISOString().slice(0, 10);
}

function createPostgresStore(connectionString: string): Store {
  // One connection per serverless invocation; Neon/Supabase pooled URLs handle
  // the fan-out. `prepare: false` keeps transaction-mode poolers happy.
  const sql = postgres(connectionString, { max: 1, prepare: false });

  let migrated: Promise<void> | null = null;
  const ready = () => {
    if (!migrated) {
      migrated = sql.unsafe(SCHEMA).then(
        () => undefined,
        (err) => {
          // Let the next request retry rather than caching the failure.
          migrated = null;
          throw err;
        },
      );
    }
    return migrated;
  };

  return {
    async listExecutions() {
      await ready();
      const rows = await sql<ExecutionRow[]>`
        select * from option_executions
        order by traded_at desc, id desc
      `;
      return rows.map(rowToExecution);
    },

    async insertExecutions(inputs) {
      await ready();
      const records = inputs.map(materialise);
      if (records.length === 0) return [];
      await sql`
        insert into option_executions ${sql(
          records.map((e) => ({
            id: e.id,
            traded_at: e.tradedAt,
            trade_date: e.tradeDate,
            underlying: e.underlying,
            expiry: e.expiry,
            strike: e.strike,
            opt_right: e.right,
            side: e.side,
            quantity: e.quantity,
            price: e.price,
            fees: e.fees,
            multiplier: e.multiplier,
            kind: e.kind,
            group_id: e.groupId,
            strategy: e.strategy,
            note: e.note,
            source: e.source,
            created_at: e.createdAt,
          })),
        )}
      `;
      return records;
    },

    async updateExecution(id, patch) {
      await ready();
      const [existing] = await sql<ExecutionRow[]>`
        select * from option_executions where id = ${id}
      `;
      if (!existing) return null;

      const merged = materialise({
        ...rowToExecution(existing),
        ...patch,
        id,
      });
      await sql`
        update option_executions set
          traded_at  = ${merged.tradedAt},
          trade_date = ${merged.tradeDate},
          underlying = ${merged.underlying},
          expiry     = ${merged.expiry},
          strike     = ${merged.strike},
          opt_right  = ${merged.right},
          side       = ${merged.side},
          quantity   = ${merged.quantity},
          price      = ${merged.price},
          fees       = ${merged.fees},
          multiplier = ${merged.multiplier},
          kind       = ${merged.kind},
          group_id   = ${merged.groupId},
          strategy   = ${merged.strategy},
          note       = ${merged.note}
        where id = ${id}
      `;
      // Keep the original creation time; materialise() stamps a fresh one.
      return { ...merged, createdAt: new Date(existing.created_at).toISOString() };
    },

    async deleteExecution(id) {
      await ready();
      const rows = await sql`
        delete from option_executions where id = ${id} returning id
      `;
      return rows.length > 0;
    },

    async listMarks() {
      await ready();
      const rows = await sql<MarkRow[]>`select * from option_marks`;
      return rows.map((r) => ({
        contractKey: r.contract_key,
        price: Number(r.price),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    },

    async upsertMark(contractKey, price) {
      await ready();
      const updatedAt = new Date().toISOString();
      await sql`
        insert into option_marks (contract_key, price, updated_at)
        values (${contractKey}, ${price}, ${updatedAt})
        on conflict (contract_key) do update
          set price = excluded.price, updated_at = excluded.updated_at
      `;
      return { contractKey, price, updatedAt };
    },

    async deleteMark(contractKey) {
      await ready();
      const rows = await sql`
        delete from option_marks where contract_key = ${contractKey}
        returning contract_key
      `;
      return rows.length > 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Local JSON fallback (development only)
// ---------------------------------------------------------------------------

interface FileShape {
  executions: Execution[];
  marks: Mark[];
}

function createFileStore(file: string): Store {
  // Serialises reads and writes so two concurrent requests can't interleave a
  // read-modify-write and lose one of the changes.
  let chain: Promise<unknown> = Promise.resolve();

  const read = async (): Promise<FileShape> => {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileShape>;
      return { executions: parsed.executions ?? [], marks: parsed.marks ?? [] };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return { executions: [], marks: [] };
      }
      throw err;
    }
  };

  const write = async (data: FileShape) => {
    await mkdir(path.dirname(file), { recursive: true });
    // Write-then-rename so a crash mid-write can't truncate the store.
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, file);
  };

  const transact = <T>(fn: (data: FileShape) => Promise<T> | T): Promise<T> => {
    const run = chain.then(async () => {
      const data = await read();
      const result = await fn(data);
      await write(data);
      return result;
    });
    chain = run.catch(() => undefined);
    return run;
  };

  return {
    async listExecutions() {
      const { executions } = await read();
      return [...executions].sort(
        (a, b) => b.tradedAt.localeCompare(a.tradedAt) || b.id.localeCompare(a.id),
      );
    },

    insertExecutions(inputs) {
      return transact((data) => {
        const records = inputs.map(materialise);
        data.executions.push(...records);
        return records;
      });
    },

    updateExecution(id, patch) {
      return transact((data) => {
        const index = data.executions.findIndex((e) => e.id === id);
        if (index === -1) return null;
        const existing = data.executions[index];
        const merged = {
          ...materialise({ ...existing, ...patch, id }),
          createdAt: existing.createdAt,
        };
        data.executions[index] = merged;
        return merged;
      });
    },

    deleteExecution(id) {
      return transact((data) => {
        const before = data.executions.length;
        data.executions = data.executions.filter((e) => e.id !== id);
        return data.executions.length < before;
      });
    },

    async listMarks() {
      const { marks } = await read();
      return marks;
    },

    upsertMark(contractKey, price) {
      return transact((data) => {
        const mark: Mark = {
          contractKey,
          price,
          updatedAt: new Date().toISOString(),
        };
        const index = data.marks.findIndex((m) => m.contractKey === contractKey);
        if (index === -1) data.marks.push(mark);
        else data.marks[index] = mark;
        return mark;
      });
    },

    deleteMark(contractKey) {
      return transact((data) => {
        const before = data.marks.length;
        data.marks = data.marks.filter((m) => m.contractKey !== contractKey);
        return data.marks.length < before;
      });
    },
  };
}

// ---------------------------------------------------------------------------

let instance: Store | null = null;

export function getStore(): Store {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;
  if (url) {
    instance = createPostgresStore(url);
    return instance;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. The options tracker needs a Postgres " +
        "connection string in production — see README 選擇權損益追蹤器.",
    );
  }

  instance = createFileStore(path.join(process.cwd(), ".data", "options.json"));
  return instance;
}

/** True when running on the local JSON fallback rather than Postgres. */
export function isEphemeralStore(): boolean {
  return !process.env.DATABASE_URL;
}
