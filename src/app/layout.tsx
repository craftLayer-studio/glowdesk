import type { Metadata, Viewport } from "next";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://glowdesk.craftlayer.store"),
  title: { default: "GlowDesk: fill every chair, bring every client back", template: "%s | GlowDesk" },
  description:
    "QR walk-in queue, booking, stylist commissions, packages and WhatsApp rebooking nudges for Indian salons, spas and barbershops. By CraftLayer Studio.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
