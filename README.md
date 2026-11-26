# GlowDesk

**Tagline:** Fill every chair, bring every client back.

GlowDesk is a QR-first front desk and repeat-business engine for Indian salons, spas, barbershops, beauty parlours and nail studios. A client scans the QR at reception or on the mirror, joins the walk-in queue or books a slot, picks a stylist and service, and opts in to WhatsApp. The owner gets a client CRM, stylist commission tracking and automatic "time for your next haircut" rebooking nudges.

## Who it is for (ICP)

- Independent salons and unisex parlours with 2–10 chairs in Tier 1–3 Indian cities.
- Barbershops with heavy walk-in traffic and weekend queues.
- Small spas and nail or lash studios that sell packages and memberships.
- Owner-operated, run on a register, a paper diary and personal WhatsApp today.

Not for: 20+ outlet chains that need full ERP (Zenoti's market), or solo home-service artists with no premises.

## Top features (MVP)

| Feature | Metric it moves |
|---|---|
| Mirror/reception QR: walk-in queue with live position on the client's phone | Activation |
| QR booking: service menu with prices, stylist choice, slot | Acquisition, revenue |
| WhatsApp reminders and rebooking nudges by service cycle | Retention |
| Stylist commission and daily sales report | Activation (staff adoption), retention |
| Packages and memberships with prepaid balance | Revenue (ARPU), retention |
| Google review funnel after each visit | Acquisition |

Full list with P0/P1/P2 priorities: [docs/01-product-plan.md](docs/01-product-plan.md).

## Pricing (per outlet, INR excluding 18% GST)

| Tier | Monthly | Annual (2 months free) | For |
|---|---|---|---|
| Queue (free) | ₹0 | ₹0 | QR walk-in queue + menu, GlowDesk branding, 100 clients |
| Starter | ₹799 (~$9) | ₹7,990 | 1–3 chairs: booking, CRM, reminders, reviews |
| Growth | ₹1,499 (~$18) | ₹14,990 | 4–10 chairs: commissions, packages, rebooking nudges, inventory |
| Pro | ₹2,999 (~$35) | ₹29,990 | Multi-outlet, memberships, campaigns, before/after gallery |

WhatsApp messages are billed as prepaid credits at Meta's rate plus a margin. Details: [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md).

## Why it can win

- Indian salon software sits at ₹799–₹2,500 per month (Invoay, DINGG, MioSalon, Salonist) but sells billing and POS first. GlowDesk sells **more repeat visits** first, measured in rupees on the dashboard.
- Global tools are priced for the US: Fresha's Team plan is $14.95 per bookable member per month; Zenoti is about $300 per month and up.
- The free Queue tier puts a QR on the mirror on day one and converts on visible results.

## Status

**MVP, demo data, simulated messaging and payments.** Live at [glowdesk.craftlayer.store](https://glowdesk.craftlayer.store) once deployed. Support: glowdesk@craftlayer.store. The demo salon ("Kesar Glow Unisex Salon", Indore) and all its clients are fictional and labelled Demo. WhatsApp and SMS go to an outbox table shown in the app; nothing leaves the machine. Payments are recorded, with a free UPI intent link; no gateway.

## How to run

Needs Node 20.9+ and pnpm 11.

```bash
pnpm install
cp .env.example .env.local   # set APP_URL=http://localhost:3141 and a SESSION_SECRET
pnpm dev --port 3141         # next dev --webpack; migrates and seeds ./.data/pglite on first request
```

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js 16 with webpack |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | Quality gates (CI runs the same) |
| `pnpm exec astryx doctor --built .` | Astryx design-system check |
| `pnpm db:generate` | New SQL migration from `src/server/db/schema.ts` (drizzle-kit) |
| `pnpm db:seed` / `pnpm db:seed --reset` | Seed an empty DB / rebuild the demo salon |

Set `DATABASE_URL` to use real Postgres (node-postgres) instead of PGlite. `DEMO_MODE=false` hides OTP codes on screen.

## Demo walkthrough

| Step | URL |
|---|---|
| Landing page | `/` |
| Client scans the reception QR: join queue, book a slot, menu | `/q/demo-kesar-glow-7Hq2xP` |
| Live ticket with queue position (after joining) | `/q/<qr>/t/<ticket>` |
| Booking page with cancel and opt-out | `/q/<qr>/b/<booking>` |
| Staff sign-in (phone + OTP, code shown on screen in demo) | `/login`: owner 98260 00001, reception 98260 00002 |
| Front desk: live queue, today's diary, checkout, clients CRM, sell packages | `/staff` |
| Owner: dashboard, rebooking nudges, menu, stylists, packages, WhatsApp outbox, settings | `/owner` |
| Printable QR standees | `/owner/qr` |
| Review funnel (link sent after each bill) | `/r/<token>` |

## Built vs planned

| Feature (docs/01 #) | Status |
|---|---|
| 1 QR walk-in queue with live position | Built |
| 2 Service menu with prices, durations, category | Built |
| 3 Booking by service, stylist and slot; no overlaps per stylist (row lock + check) | Built |
| 4 DPDP consent: two unticked opt-ins, consent log, opt-out | Built |
| 5 Client CRM: history, spend, favourite stylist, notes | Built |
| 6 WhatsApp confirmations and 24 h / 2 h reminders | Built (simulated outbox) |
| 7 Service-cycle rebooking nudges, follow-up, 2/month cap, recovered revenue | Built (simulated outbox) |
| 8 Billing with GST, cash/UPI/card/wallet, UPI intent link | Built (one method per bill; no split tender) |
| 9 Stylist commission rules (percent/flat, service override, package sales), daily report | Built |
| 10 Review funnel (4-5 stars to Google, 1-3 private) | Built |
| 11 Owner daily WhatsApp summary | Built (on demand; no scheduler yet) |
| 12 Packages and memberships with prepaid wallet | Built (P1, pulled forward) |
| Owner dashboard: chair utilisation, revenue by stylist, repeat rate | Built |
| P1/P2: inventory, loyalty, birthday offers, gallery, deposits, win-back, multi-outlet | Planned |

Not yet: real WhatsApp BSP, payment gateway, a cron for daily jobs (owner presses "Send due reminders and nudges"), setup wizard for new salons.

## Documents

| Doc | Contents |
|---|---|
| [AGENTS.md](AGENTS.md) | Brief for AI agents, glossary, decisions, open questions |
| [01 Product plan](docs/01-product-plan.md) | Vision, personas, journeys, features by phase, data model, metrics |
| [02 Problems and benefits](docs/02-problems-and-benefits.md) | Problem, solution, benefit per stakeholder |
| [03 Pros, cons, risks](docs/03-pros-cons-risks.md) | Risks, mitigations, kill criteria |
| [04 Market research](docs/04-market-research.md) | Market size, competitors, pricing, trends, regulation, sources |
| [05 Pricing and revenue](docs/05-pricing-and-revenue.md) | Tiers, add-ons, unit economics, 12-month scenarios |
| [06 Go-to-market and onboarding](docs/06-go-to-market-and-onboarding.md) | First 10 customers, sales script, onboarding checklist, retention |

Shared platform modules: [core](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md).

## Licence

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Personal, educational, research and non-profit use is free. **Any commercial use requires a paid licence or written permission from CraftLayer Studio.** See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Part of the [CraftLayer Products](https://github.com/craftLayer-studio/craftlayer-products) portfolio.
