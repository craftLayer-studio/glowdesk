import { StoreError } from "./store/errors";
import { clientKey, rateLimit } from "./rate-limit";

/** Run a store call and turn the result or a StoreError into a JSON response. */
export async function handle(fn: () => unknown): Promise<Response> {
  try {
    return Response.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof StoreError || err instanceof BadRequest) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export class BadRequest extends Error {
  readonly status = 400;
}

/** Throttle public QR endpoints per client IP. */
export function limit(request: Request, bucket: string, max = 30, windowMs = 60_000) {
  if (!rateLimit(`${bucket}:${clientKey(request)}`, max, windowMs)) throw new StoreError("Too many requests. Try again in a minute", 429);
}

const MAX_BODY_BYTES = 16_000;

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new BadRequest("Request too large");
  let value: unknown;
  try {
    value = text ? JSON.parse(text) : {};
  } catch {
    throw new BadRequest("Body must be JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new BadRequest("Body must be a JSON object");
  return value as Record<string, unknown>;
}

export function str(body: Record<string, unknown>, key: string, max = 200): string {
  const v = body[key];
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max) throw new BadRequest(`${key} is required`);
  return v.trim();
}

export function optStr(body: Record<string, unknown>, key: string, max = 500): string | undefined {
  const v = body[key];
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || v.length > max) throw new BadRequest(`${key} must be text up to ${max} characters`);
  return v.trim();
}

export function text(body: Record<string, unknown>, key: string, max = 500): string {
  return optStr(body, key, max) ?? "";
}

export function int(body: Record<string, unknown>, key: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const v = body[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) throw new BadRequest(`${key} must be a whole number from ${min} to ${max}`);
  return v;
}

export function optInt(body: Record<string, unknown>, key: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const v = body[key];
  if (v === undefined || v === null || v === "") return null;
  return int(body, key, min, max);
}

export function bool(body: Record<string, unknown>, key: string): boolean {
  const v = body[key];
  if (v === undefined) return false;
  if (typeof v !== "boolean") throw new BadRequest(`${key} must be true or false`);
  return v;
}

export function oneOf<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = body[key];
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new BadRequest(`${key} must be one of ${allowed.join(", ")}`);
  return v as T;
}

export function idList(body: Record<string, unknown>, key: string, max = 10): string[] {
  const v = body[key];
  if (!Array.isArray(v) || v.length === 0 || v.length > max || v.some((x) => typeof x !== "string" || x.length > 64)) throw new BadRequest(`${key} must be a list of 1 to ${max} ids`);
  return v as string[];
}
