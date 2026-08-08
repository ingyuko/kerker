import Anthropic from "@anthropic-ai/sdk";

/**
 * Reads thinkorswim mobile screenshots into structured option legs.
 *
 * Mobile thinkorswim has no API and no CSV export, so a screenshot is the only
 * practical way off the phone. Claude does the reading; the result is always
 * shown for confirmation before anything is saved — OCR of money is not
 * something to trust silently.
 */

const MODEL = "claude-opus-5";

export const SUPPORTED_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export interface ScreenshotImage {
  mediaType: SupportedMediaType;
  /** Raw base64, no `data:` prefix. */
  data: string;
}

export interface ParsedLeg {
  underlying: string;
  expiry: string;
  strike: number;
  right: "C" | "P";
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
  /** ISO 8601, or "" when the screenshot shows no timestamp. */
  tradedAt: string;
  kind: "TRADE" | "EXPIRE" | "ASSIGN" | "EXERCISE";
  /** 0–1. Anything below ~0.8 deserves a careful look before saving. */
  confidence: number;
  /** The exact text this leg was read from, for eyeballing against the image. */
  sourceText: string;
}

export interface ParseResult {
  screenshotType:
    | "order_confirmation"
    | "working_order"
    | "position"
    | "activity"
    | "account_statement"
    | "other";
  legs: ParsedLeg[];
  /**
   * Net price of a multi-leg order when only the combined price is shown.
   * Zero when per-leg prices were readable.
   */
  netPrice: number;
  netPriceDirection: "CREDIT" | "DEBIT" | "NONE";
  /** Things the reader could not determine — surfaced above the review form. */
  warnings: string[];
  notes: string;
}

const LEG_SCHEMA = {
  type: "object",
  properties: {
    underlying: {
      type: "string",
      description: "Underlying ticker in upper case, e.g. SPY, TSLA, NVDA.",
    },
    expiry: {
      type: "string",
      description:
        "Expiration date as YYYY-MM-DD. thinkorswim writes these as '17 APR 26' or 'APR 26'; expand to a full date. If only a month is shown, use the standard monthly expiry (the third Friday).",
    },
    strike: { type: "number", description: "Strike price." },
    right: {
      type: "string",
      enum: ["C", "P"],
      description: "C for CALL, P for PUT.",
    },
    side: {
      type: "string",
      enum: ["BUY", "SELL"],
      description:
        "BUY for BOT/BUY/+quantity rows, SELL for SOLD/SELL/-quantity rows. Report the direction of this fill only; do not try to decide whether it opens or closes a position.",
    },
    quantity: {
      type: "integer",
      description:
        "Number of contracts as a positive whole number. A '-2' row is quantity 2 with side SELL.",
    },
    price: {
      type: "number",
      description:
        "Premium per share, positive, exactly as thinkorswim displays it (1.85 means $185 per contract). Use 0 when the screenshot shows only a combined price for the whole order, and add a warning.",
    },
    fees: {
      type: "number",
      description:
        "Commission plus exchange fees for this leg in dollars. Use 0 when not shown.",
    },
    tradedAt: {
      type: "string",
      description:
        "Fill time as an ISO 8601 timestamp with offset. thinkorswim shows Eastern time, so use the -05:00 or -04:00 offset as appropriate for that date. Use an empty string when no time is visible.",
    },
    kind: {
      type: "string",
      enum: ["TRADE", "EXPIRE", "ASSIGN", "EXERCISE"],
      description:
        "TRADE for an ordinary fill. EXPIRE, ASSIGN or EXERCISE when the row explicitly says the contract expired, was assigned, or was exercised.",
    },
    confidence: {
      type: "number",
      description:
        "How confident you are in this leg, from 0 to 1. Lower it whenever a field was inferred rather than read.",
    },
    sourceText: {
      type: "string",
      description:
        "The literal line of text from the screenshot that this leg came from.",
    },
  },
  required: [
    "underlying",
    "expiry",
    "strike",
    "right",
    "side",
    "quantity",
    "price",
    "fees",
    "tradedAt",
    "kind",
    "confidence",
    "sourceText",
  ],
  additionalProperties: false,
} as const;

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    screenshotType: {
      type: "string",
      enum: [
        "order_confirmation",
        "working_order",
        "position",
        "activity",
        "account_statement",
        "other",
      ],
      description: "Which thinkorswim screen this appears to be.",
    },
    legs: { type: "array", items: LEG_SCHEMA },
    netPrice: {
      type: "number",
      description:
        "For a multi-leg order shown with one combined price, that price as a positive number. 0 when each leg has its own price.",
    },
    netPriceDirection: {
      type: "string",
      enum: ["CREDIT", "DEBIT", "NONE"],
      description:
        "CREDIT when the combined price was received, DEBIT when paid, NONE when netPrice is 0.",
    },
    warnings: {
      type: "array",
      items: { type: "string" },
      description:
        "Anything unreadable, missing, ambiguous, or inferred. Write these in Traditional Chinese for a Taiwanese reader.",
    },
    notes: {
      type: "string",
      description:
        "One short sentence in Traditional Chinese describing what the screenshot shows. Empty string if nothing useful to add.",
    },
  },
  required: ["screenshotType", "legs", "netPrice", "netPriceDirection", "warnings", "notes"],
  additionalProperties: false,
} as const;

function systemPrompt(todayInNewYork: string): string {
  return [
    "You read screenshots of the thinkorswim mobile app and extract option executions.",
    "",
    `Today's date in New York is ${todayInNewYork}. Use it to resolve two-digit years and relative dates such as "Today" or "Yesterday".`,
    "",
    "How thinkorswim writes things:",
    '- A contract looks like "SPY 100 (Weeklys) 17 APR 26 500 PUT" — 100 is the contract multiplier, not a strike.',
    '- Order rows read "BOT +1" / "SOLD -1", sometimes "BUY_TO_OPEN" / "SELL_TO_CLOSE".',
    "- Prices are per share. 1.85 on a standard contract is $185.",
    '- A spread row such as "VERTICAL SPY 100 17 APR 26 500/495 PUT" is two legs. The higher strike is listed first. For a PUT vertical sold for a credit, the higher strike is the SELL leg; for a CALL vertical sold for a credit, the lower strike is the SELL leg. If the screenshot states the direction of each leg, use that instead of inferring.',
    "- Combined spread prices are common. When you cannot see a price for each individual leg, set every leg price to 0, report the combined price in netPrice with its direction, and add a warning.",
    "",
    "Rules:",
    "- Extract only what is actually visible. Never invent a price, a fee, or a time.",
    "- Report each fill separately, one entry per contract per fill.",
    "- Working or cancelled orders are not fills. If the screen shows an order that has not filled, return no legs and explain in warnings.",
    "- Stock and futures rows are not options. Skip them and note it in warnings.",
    "- If the image is not a thinkorswim screen, or is too blurry to read, return no legs and say so in warnings.",
    "- Lower confidence whenever you infer rather than read. The person reviews everything before it is saved, so an honest low score is far more useful than a confident guess.",
  ].join("\n");
}

export class ScreenshotParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenshotParseError";
  }
}

/**
 * Sends the screenshots to Claude and returns the structured legs.
 *
 * Server-side refusal fallback is requested by default; if the deployment's
 * API access does not carry that beta, the call is retried once without it
 * rather than failing the parse.
 */
export async function parseScreenshots(
  images: ScreenshotImage[],
  options: { apiKey?: string; today?: string } = {},
): Promise<ParseResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ScreenshotParseError(
      "ANTHROPIC_API_KEY is not set, so screenshots cannot be read. Enter the trade manually, or set the key in the deployment environment.",
    );
  }
  if (images.length === 0) {
    throw new ScreenshotParseError("No image was provided.");
  }

  const client = new Anthropic({ apiKey });
  const today =
    options.today ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const content = [
    ...images.map((image) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: image.mediaType,
        data: image.data,
      },
    })),
    {
      type: "text" as const,
      text:
        images.length > 1
          ? "Extract every option execution across these screenshots. They may be several scrolled parts of one screen, so do not report the same fill twice."
          : "Extract every option execution in this screenshot.",
    },
  ];

  const request = {
    model: MODEL,
    max_tokens: 16000,
    system: systemPrompt(today),
    messages: [{ role: "user" as const, content }],
    output_config: {
      format: { type: "json_schema" as const, schema: RESULT_SCHEMA },
    },
  };

  let message;
  try {
    message = await client.beta.messages.create({
      ...request,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (!isBetaUnsupported(err)) throw toParseError(err);
    // The fallback beta is not available to this key — the parse itself is
    // unaffected, so run it on the standard endpoint.
    try {
      message = await client.messages.create(request);
    } catch (retryErr) {
      throw toParseError(retryErr);
    }
  }

  if (message.stop_reason === "refusal") {
    throw new ScreenshotParseError(
      "Claude declined to read this image. Please enter the trade manually.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new ScreenshotParseError(
      "The screenshot held more rows than one pass can return. Split it into smaller screenshots and try again.",
    );
  }

  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") {
    throw new ScreenshotParseError("Claude returned no readable result.");
  }

  let parsed: ParseResult;
  try {
    parsed = JSON.parse(text.text) as ParseResult;
  } catch {
    throw new ScreenshotParseError("Claude's result was not valid JSON.");
  }

  return normalise(parsed);
}

function isBetaUnsupported(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false;
  if (err.status !== 400 && err.status !== 403 && err.status !== 404) return false;
  const message = String(err.message ?? "").toLowerCase();
  return (
    message.includes("beta") ||
    message.includes("fallback") ||
    message.includes("unsupported")
  );
}

function toParseError(err: unknown): ScreenshotParseError {
  if (err instanceof Anthropic.RateLimitError) {
    return new ScreenshotParseError(
      "Claude is rate limited right now. Wait a moment and try again.",
    );
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return new ScreenshotParseError(
      "ANTHROPIC_API_KEY was rejected. Check the key in the deployment environment.",
    );
  }
  if (err instanceof Anthropic.APIError) {
    return new ScreenshotParseError(`Claude API error (${err.status}): ${err.message}`);
  }
  return new ScreenshotParseError(
    err instanceof Error ? err.message : "Unknown error while reading the screenshot.",
  );
}

/** Clamps and squares up the model's output so the review form never breaks. */
function normalise(result: ParseResult): ParseResult {
  const legs = (result.legs ?? [])
    .filter((leg) => leg && leg.underlying && leg.expiry)
    .map((leg) => ({
      ...leg,
      underlying: String(leg.underlying).toUpperCase().trim(),
      strike: Math.abs(Number(leg.strike) || 0),
      quantity: Math.max(1, Math.round(Math.abs(Number(leg.quantity) || 1))),
      price: Math.abs(Number(leg.price) || 0),
      fees: Math.abs(Number(leg.fees) || 0),
      confidence: Math.min(1, Math.max(0, Number(leg.confidence) || 0)),
      sourceText: String(leg.sourceText ?? ""),
    }));

  return {
    screenshotType: result.screenshotType ?? "other",
    legs,
    netPrice: Math.abs(Number(result.netPrice) || 0),
    netPriceDirection: result.netPriceDirection ?? "NONE",
    warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],
    notes: String(result.notes ?? ""),
  };
}
