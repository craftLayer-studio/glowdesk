/** Public base URL for QR codes and share links. Dev falls back to localhost. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3141").replace(/\/$/, "");
}

/** Demo mode shows OTP codes on screen. On unless DEMO_MODE=false. */
export function demoMode(): boolean {
  return process.env.DEMO_MODE !== "false";
}
