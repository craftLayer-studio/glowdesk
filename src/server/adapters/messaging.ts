import type { Conn } from "../db/client";
import { outbox } from "../db/schema";
import { newId } from "../store/ids";

export interface OutgoingMessage {
  orgId: string;
  customerId: string | null;
  channel: "whatsapp" | "sms";
  purpose: "utility" | "marketing" | "otp";
  template: string;
  toPhone: string;
  body: string;
}

/** A messaging channel (WhatsApp BSP, SMS gateway). Real adapters plug in here later. */
export interface MessageSender {
  send(conn: Conn, msg: OutgoingMessage): Promise<{ id: string }>;
}

/** Writes every message to the outbox table instead of calling a provider. No network calls. */
export const simulatedSender: MessageSender = {
  async send(conn, msg) {
    const id = newId();
    await conn.insert(outbox).values({ id, ...msg, status: "simulated" });
    return { id };
  },
};

let current: MessageSender = simulatedSender;
export const messaging = () => current;
export function setMessageSender(sender: MessageSender) {
  current = sender;
}
