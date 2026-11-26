import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { currentConsent, NOTICE_VERSION, toE164India, type ConsentChannel, type ConsentPurpose } from "@/domain";
import type { Conn } from "../db/client";
import { consentRecords, customers } from "../db/schema";
import { StoreError } from "./errors";
import { newId } from "./ids";

export function requirePhone(input: string): string {
  const phone = toE164India(input);
  if (!phone) throw new StoreError("Enter a valid 10-digit Indian mobile number");
  return phone;
}

export function cleanName(input: string): string {
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) throw new StoreError("Enter your name (2 to 60 characters)");
  return name;
}

/** Find or create a customer by phone within an org. Updates the name if given. */
export async function upsertCustomer(conn: Conn, orgId: string, phone: string, name: string) {
  const [existing] = await conn.select().from(customers).where(and(eq(customers.orgId, orgId), eq(customers.phone, phone)));
  if (existing) {
    if (existing.name !== name) await conn.update(customers).set({ name }).where(and(eq(customers.orgId, orgId), eq(customers.id, existing.id)));
    return { ...existing, name };
  }
  const row = { id: newId(), orgId, phone, name, notes: "" };
  await conn.insert(customers).values(row);
  return row;
}

export async function recordConsent(
  conn: Conn,
  orgId: string,
  customerId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  channel: ConsentChannel,
  at = new Date(),
) {
  await conn.insert(consentRecords).values({ id: newId(), orgId, customerId, purpose, granted, noticeVersion: NOTICE_VERSION, channel, createdAt: at });
}

export async function consentFor(conn: Conn, orgId: string, customerIds: string[]) {
  const out = new Map<string, Record<ConsentPurpose, boolean>>();
  if (customerIds.length === 0) return out;
  const rows = await conn
    .select()
    .from(consentRecords)
    .where(and(eq(consentRecords.orgId, orgId), inArray(consentRecords.customerId, customerIds)))
    .orderBy(asc(consentRecords.createdAt));
  const grouped = new Map<string, { purpose: ConsentPurpose; granted: boolean; at: number }[]>();
  for (const r of rows) {
    const list = grouped.get(r.customerId) ?? [];
    list.push({ purpose: r.purpose, granted: r.granted, at: r.createdAt.getTime() });
    grouped.set(r.customerId, list);
  }
  for (const id of customerIds) out.set(id, currentConsent(grouped.get(id) ?? []));
  return out;
}

export async function consentHistory(conn: Conn, orgId: string, customerId: string) {
  return conn
    .select()
    .from(consentRecords)
    .where(and(eq(consentRecords.orgId, orgId), eq(consentRecords.customerId, customerId)))
    .orderBy(desc(consentRecords.createdAt));
}
