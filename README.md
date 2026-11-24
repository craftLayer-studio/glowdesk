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

Shared platform modules: [core](../core/README.md).
