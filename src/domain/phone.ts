/**
 * Indian mobile numbers to E.164 ("+91XXXXXXXXXX").
 * Accepts "98765 43210", "+91 98765-43210", "09876543210", "919876543210".
 * Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.
 */
export function toE164India(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  let local: string;
  if (/^\+91\d{10}$/.test(digits)) local = digits.slice(3);
  else if (/^91\d{10}$/.test(digits)) local = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) local = digits.slice(1);
  else if (/^\d{10}$/.test(digits)) local = digits;
  else return null;
  if (!/^[6-9]/.test(local)) return null;
  return `+91${local}`;
}

/** "+919876543210" -> "+91 98765 43210". */
export function formatPhone(e164: string): string {
  if (!/^\+91\d{10}$/.test(e164)) return e164;
  return `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
}

/** "+919876543210" -> "+91 ••••• •3210" for public screens. */
export function maskPhone(e164: string): string {
  return `+91 ••••• •${e164.slice(-4)}`;
}
