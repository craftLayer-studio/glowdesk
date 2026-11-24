# GlowDesk product plan

## Vision

Every independent salon in India knows which clients are due, nudges them on WhatsApp at the right time, and sees the rupees that came back. Software that pays for itself in the first month, visibly.

## Ideal customer profile

| Attribute | Ideal | Acceptable | Avoid (for now) |
|---|---|---|---|
| Type | Unisex salon, men's barbershop, ladies' beauty parlour | Spa, nail or lash studio, bridal studio | Hospital-grade skin clinics, 20+ outlet chains |
| Size | 3–8 chairs, 3–10 staff | 1–2 chairs with strong walk-in traffic | Solo home-service artist |
| Ticket | ₹300–₹1,500 average bill | ₹150–₹300 (barbers, high volume) | Below ₹100 average bill |
| Location | Tier 1–2 city high street or residential market | Tier 3 town main market | Rural, no smartphones among clients |
| Current tools | Paper diary, register, personal WhatsApp | Basic billing app | Locked into Zenoti contract |
| Owner | Owner present daily, phone-first | Manager-run with owner checking weekly | Absentee owner who never opens apps |

## Personas

| Persona | Goal | Pain today | What GlowDesk gives |
|---|---|---|---|
| Owner (Rakesh, 38, 6-chair unisex salon, Indore) | More repeat clients, less leakage | Does not know who stopped coming; stylists take clients when they leave | Due-list, automatic nudges, client data stays with salon |
| Manager or receptionist (Priya, 24) | Run the day without chaos | Phone calls during peak, double bookings, weekend crowd arguing about turn | QR queue, one screen with today's bookings |
| Stylist (Imran, 27, senior barber) | Earn more, get credit | Commission disputes, no record of own regulars | Live commission on staff app, "my clients" list |
| Client (Neha, 29) | Get a slot with her stylist, no waiting | Calls, waits 40 minutes on Sunday | Book on WhatsApp link, see queue position, reminder |

## User journeys

### Walk-in client (P0)

1. Client sees QR on mirror or reception standee: "Scan to join queue — no waiting at the counter."
2. Opens web page (no app). Sees current wait, picks service and optional stylist.
3. Enters name and phone; OTP or WhatsApp click-to-verify. Sees consent notice with two options: booking updates (required for queue) and offers and reminders (optional, unticked).
4. Gets queue number and live position. WhatsApp message "You are 2nd in line" and "Your turn in 5 minutes".
5. After service: bill, optional UPI payment link, review request, rebooking reminder scheduled by service cycle.

### Appointment booking (P0)

1. Client opens salon link from Instagram bio, Google Business Profile or WhatsApp.
2. Picks service (menu with prices and duration), stylist, date and slot.
3. Optional advance payment or token amount (configurable, default off).
4. Reminder 24 hours and 2 hours before (utility template).

### Rebooking loop (P0, the money feature)

1. Each service has a cycle in days (defaults: men's haircut 28, beard 14, women's haircut 45, colour 50, facial 30, waxing 21, manicure 21; all editable; defaults are estimates).
2. At day = cycle, client with marketing opt-in gets "Hi Neha, it has been 6 weeks since your haircut with Imran. Book your slot: [link]".
3. If no booking in 7 days, one follow-up with an optional offer set by owner. Then stop until next cycle. Maximum 2 marketing messages per client per month.
4. Booking within 14 days counts as recovered revenue.

### Owner daily loop (P0)

1. Morning WhatsApp summary: today's bookings, clients due this week, yesterday's revenue and recovered revenue.
2. Evening: day close with cash/UPI split per stylist and commission due.

## Features by phase

Priority: P0 = MVP, sellable in 6–8 weeks. P1 = months 3–5. P2 = months 6–12.

| # | Feature | Priority | Core module | Metric |
|---|---|---|---|---|
| 1 | Mirror/reception QR with walk-in queue and live position | P0 | QR engine, booking engine | Activation |
| 2 | Service menu with prices, duration, gender/category | P0 | Storefront/catalog | Acquisition |
| 3 | Online booking with stylist selection and slots | P0 | Booking engine | Acquisition, revenue |
| 4 | Consent capture (DPDP notice, separate marketing opt-in) | P0 | CRM | Compliance (enables retention) |
| 5 | Client CRM: visit history, spend, favourite stylist, notes (allergies, colour formula) | P0 | CRM | Retention |
| 6 | WhatsApp booking confirmations and reminders | P0 | Messaging | Retention (no-shows) |
| 7 | Service-cycle rebooking nudges with recovered-revenue tracking | P0 | Messaging, analytics | Retention, revenue |
| 8 | Simple billing with GST invoice, UPI/cash/card split | P0 | Payments | Activation |
| 9 | Stylist commission rules and daily commission report (staff app) | P0 | Staff app | Activation (staff adoption) |
| 10 | Google review funnel after visit | P0 | Reviews | Acquisition |
| 11 | Owner daily WhatsApp summary | P0 | Analytics | Retention (of the salon) |
| 12 | Packages and memberships with prepaid balance | P1 | Loyalty, payments | Revenue (salon ARPU, our upsell) |
| 13 | Product upsell prompts (retail products linked to service, e.g. after colour suggest colour-safe shampoo) | P1 | Catalog | Revenue |
| 14 | Consumables inventory with low-stock alert, per-service consumption | P1 | — (product-specific) | Retention |
| 15 | Loyalty points and referral reward | P1 | Loyalty | Referral, retention |
| 16 | Birthday and anniversary offers | P1 | Messaging | Retention |
| 17 | Before/after gallery with per-photo consent | P1 | Storefront | Acquisition |
| 18 | No-show protection: advance deposit for long services (bridal, colour, spa) | P1 | Payments | Revenue |
| 19 | Win-back campaign for clients inactive 90+ days | P1 | Messaging | Retention |
| 20 | Multi-outlet dashboard and shared client base | P2 | Analytics | Revenue (Pro tier) |
| 21 | Staff attendance and leave | P2 | Staff app | Activation |
| 22 | Mini-game at queue wait ("spin for a free head massage") | P2 | Games | Referral |
| 23 | AI WhatsApp reply bot for booking questions | P2 | Messaging | Acquisition |
| 24 | Bridal and event booking with multi-session plans | P2 | Booking engine | Revenue |

### MVP scope (6–8 weeks, 2 developers + founder)

Weeks 1–2: salon setup wizard, service menu, staff list, QR generation, walk-in queue page.
Weeks 3–4: booking engine with stylist slots, consent screen, CRM, WhatsApp templates (confirm, remind, rebook).
Weeks 5–6: billing with GST invoice, commission rules and staff view, review funnel, owner summary.
Weeks 7–8: recovered-revenue dashboard, pilot with 5 salons, fix what breaks.

Out of MVP on purpose: inventory, memberships, multi-outlet, payroll, marketplace.

## Data model (product-specific entities)

Core entities (tenant, customer, consent, message, payment, review) live in [core](../../core/README.md). GlowDesk adds:

| Entity | Key fields |
|---|---|
| Outlet | tenant_id, name, address, chairs, opening_hours, gst_number |
| Stylist | outlet_id, name, phone, skills[], commission_rule_id, active |
| Service | outlet_id, name, category, gender, price, duration_min, cycle_days, commission_override |
| QueueEntry | outlet_id, customer_id, service_ids[], preferred_stylist_id, position, status (waiting, in_chair, done, left), joined_at |
| Appointment | outlet_id, customer_id, stylist_id, service_ids[], start_at, status, source (qr, link, walkin, phone), deposit_paid |
| Visit | appointment_id or queue_entry_id, bill_id, stylist_id, services[], products[], total, payment_split |
| CommissionRule | type (percent, flat), service_rate, product_rate, package_rate |
| Package | name, services[], sessions, price, validity_days |
| CustomerPackage | customer_id, package_id, sessions_left, expires_at |
| Membership | customer_id, plan, wallet_balance, discount_pct, expires_at |
| RebookNudge | customer_id, service_id, due_at, sent_at, booked_visit_id, recovered_amount |
| ConsumableItem | outlet_id, name, unit, stock, reorder_level, per_service_usage |
| GalleryPhoto | visit_id, before_url, after_url, consent_id, public |
| ClientNote | customer_id, type (allergy, formula, preference), text |

## Integrations

| Integration | Purpose | Phase |
|---|---|---|
| WhatsApp Business Platform via a BSP (Gupshup, Interakt, AiSensy or direct Cloud API) | Templates, reminders, nudges | P0 |
| Razorpay / UPI intent and payment links | Payments, deposits | P0 |
| Google Business Profile booking link | Acquisition | P0 (manual link), P2 (API) |
| Instagram bio link | Acquisition | P0 |
| Tally / Excel export | Accountant needs | P1 |
| Thermal printer (bill) | Counter billing | P1 |

## Success metrics

| Stage | Metric | Target |
|---|---|---|
| Activation | Salon has QR live and 30+ clients captured in first 14 days | 70% of new salons |
| Activation | Staff using commission view weekly | 60% of paying salons |
| Retention (client) | Rebooking nudge to booking conversion within 14 days | 15% (estimate; vendor claims run higher) |
| Retention (salon) | Monthly logo churn | under 4% |
| Revenue | Recovered revenue per salon per month | 5x subscription fee |
| Revenue | Free to paid conversion within 60 days | 25% |
| Referral | Paying salons that refer another salon in 6 months | 20% |
