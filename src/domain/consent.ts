/** Version of the privacy notice shown at capture. Bump when the notice text changes. */
export const NOTICE_VERSION = "2026-11-v1";

export const CONSENT_PURPOSES = ["service_updates", "marketing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_CHANNELS = ["qr", "staff", "whatsapp"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export interface ConsentEvent {
  purpose: ConsentPurpose;
  granted: boolean;
  at: number;
}

/** Current consent state: the latest event per purpose wins; no event means no consent. */
export function currentConsent(events: readonly ConsentEvent[]): Record<ConsentPurpose, boolean> {
  const out: Record<ConsentPurpose, boolean> = { service_updates: false, marketing: false };
  const latest: Partial<Record<ConsentPurpose, number>> = {};
  for (const e of events) {
    if ((latest[e.purpose] ?? -Infinity) <= e.at) {
      latest[e.purpose] = e.at;
      out[e.purpose] = e.granted;
    }
  }
  return out;
}

export const NOTICE_TEXT =
  "We use your name and phone number to manage your queue place, booking and bill. If you tick offers and reminders, we will also send WhatsApp messages when you are due for your next service and occasional offers (at most 2 a month). You can opt out at any time by replying STOP or from your ticket page. We never sell your data.";
