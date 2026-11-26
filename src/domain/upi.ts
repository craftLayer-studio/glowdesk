import type { Paise } from "./money";

/** UPI intent link (free path; opens the client's UPI app). Amount in rupees with 2 decimals. */
export function upiLink(input: { vpa: string; payeeName: string; amount: Paise; note: string }): string {
  const params = new URLSearchParams({
    pa: input.vpa,
    pn: input.payeeName,
    am: (input.amount / 100).toFixed(2),
    cu: "INR",
    tn: input.note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

/** wa.me click-to-chat link (free path). */
export function waMeLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace("+", "")}?text=${encodeURIComponent(text)}`;
}
