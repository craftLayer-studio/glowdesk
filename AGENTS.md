# GlowDesk — brief for AI agents

## Context

GlowDesk is the salon, spa, barbershop and beauty-studio product in the CraftLayer portfolio. It runs on the shared CraftLayer core (QR engine, booking engine, CRM, WhatsApp messaging, loyalty, reviews, payments, staff app, analytics). This folder documents only what is specific to beauty and grooming businesses.

The commercial thesis: Indian salons do not lack billing software, they lack **repeat visits**. Most clients return on a predictable cycle (haircut about 4–6 weeks, beard trim about 2 weeks, colour touch-up about 6–8 weeks, facial about 4 weeks; all estimates from common salon practice). Nobody nudges them, so they drift to the salon next door. GlowDesk captures the phone number with consent at the QR, then sends the nudge at the right time and shows the owner the rupees it brought back.

## Reading order

1. [README.md](README.md) — one-page summary.
2. [docs/01-product-plan.md](docs/01-product-plan.md) — what to build and in what order.
3. [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md) — what to charge and the unit economics.
4. [docs/06-go-to-market-and-onboarding.md](docs/06-go-to-market-and-onboarding.md) — how to sell the first 10.
5. [docs/04-market-research.md](docs/04-market-research.md) — sources for every number.
6. [docs/02-problems-and-benefits.md](docs/02-problems-and-benefits.md) and [docs/03-pros-cons-risks.md](docs/03-pros-cons-risks.md).

## Glossary

| Term | Meaning |
|---|---|
| Outlet | One physical salon location. Pricing is per outlet. |
| Chair | One working station. Proxy for salon size. |
| Stylist | Any service provider: hairdresser, barber, beautician, therapist, nail tech. |
| Walk-in queue | Clients without appointments waiting in order; shown live on their phone after a QR scan. |
| Service cycle | Expected days until a client needs the same service again. Set per service. Drives rebooking nudges. |
| Rebooking nudge | WhatsApp marketing template sent when a client's service cycle is due. |
| Package | Prepaid bundle of sessions (for example 6 facials). |
| Membership | Prepaid wallet or annual plan with a discount on all services. |
| Commission rule | Percentage or flat amount a stylist earns per service, product or package sold. |
| Recovered revenue | Bill value of visits that followed a GlowDesk nudge within 14 days. The headline ROI metric. |
| Mirror QR | Acrylic QR standee or sticker at each mirror or reception. |

## Decisions made

1. **India-first, per-outlet flat pricing**, not per-stylist. Indian owners resist per-seat pricing. Fresha and Booksy charge per member; that is our wedge.
2. **Free Queue tier** exists for acquisition. It is capped at 100 clients in the CRM and shows GlowDesk branding.
3. **WhatsApp is the primary channel.** SMS only as a fallback for OTP. WhatsApp cost is passed through as prepaid credits with a margin, never bundled unlimited.
4. **No marketplace commission.** We do not take a cut of bookings (Fresha takes 20% on new marketplace clients). This is a sales line.
5. **Recovered revenue is the north-star metric** shown on the owner dashboard and in the weekly WhatsApp summary to the owner.
6. **Consent at capture.** Every phone number enters via an explicit opt-in screen that follows DPDP Act 2023 and DPDP Rules 2025. Marketing opt-in is a separate checkbox from booking updates.
7. **Before/after photos require per-photo consent** from the client before showing them in the public gallery.

## Open questions

1. **Name conflict.** A small salon software brand called "GlowDesk" already exists (UK-based, listed on Capterra, sells a £79/month "AI Pro" tier at glow-desk.myaifrontdesk.com; see [04 market research](docs/04-market-research.md)). It is not a major brand, but it is the same category and could block trademark registration or confuse search. Folder slug stays `glowdesk`. Alternatives to check with a trademark search (Class 9 and 42) and domain check before launch:
   - **ChairLoop** — says "chair filled again and again".
   - **GlowBack** — says "clients come back".
2. Should the free tier allow online booking, or only the walk-in queue? Test both with the first 30 salons.
3. Do we build our own GST invoice and POS, or integrate with what the salon already uses? MVP plan: simple GST bill only; no inventory valuation.
4. Who owns the WhatsApp Business number: the salon (own WABA via our BSP) or a shared GlowDesk number? Default is salon-owned for trust and deliverability; confirm onboarding time is acceptable.
5. Is ₹799 Starter too cheap to cover field-sales CAC in Tier 2–3? Revisit after 50 customers.
6. Home-service beauticians (huge segment) — separate light plan later, or out of scope?

## Rules for agents editing this folder

- Follow [CONVENTIONS.md](https://github.com/craftLayer-studio/craftlayer-products/blob/main/CONVENTIONS.md).
- Every new number needs a source link with access date, or the label **(estimate)** with reasoning.
- Tie every new feature to one metric: acquisition, activation, retention, revenue or referral.
- Reference core modules instead of re-specifying them.
