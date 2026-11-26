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

## Code

MVP web app: Next.js 16.4.6 App Router, React 19.3, TypeScript strict, Astryx 0.7.17 (theme `chocolate`), Drizzle ORM on PGlite (dev/tests) or Postgres (`DATABASE_URL`). See README for how to run.

### Structure

| Path | What |
|---|---|
| `src/domain/` | Pure business rules with Vitest tests: money (paise), IST time, phone (E.164), booking overlap and slots, queue position, bill/GST, commission, rebooking nudge planner, reminders, consent, review routing, dashboard metrics, OTP, UPI links |
| `src/server/db/` | Drizzle schema, client (PGlite or pg), SQL migrations (`migrations/`), demo seed |
| `src/server/store/` | Use cases and data access; every query filters by `org_id`; multi-step writes in transactions. `store.test.ts` runs against in-memory PGlite |
| `src/server/adapters/messaging.ts` | Messaging interface; the `simulated` sender writes to `outbox` |
| `src/server/http.ts`, `session.ts`, `rate-limit.ts` | Input parsing, JSON errors, signed httpOnly session cookie and role checks, in-memory limiter for public endpoints |
| `src/app/api/` | Thin route handlers: `public/[qr]` (QR flows, rate-limited), `reviews`, `auth`, `staff/*` (staff role), `owner/*` (owner role) |
| `src/app/`, `src/components/` | Pages: `/` landing, `/q/[qr]` client page, `/login`, `/staff`, `/owner`, `/owner/qr`, `/r/[token]` |

### Commands

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`, then `pnpm exec astryx doctor --built .`. `pnpm db:generate` after schema changes (commit the SQL). Dev servers on ports 3101-3199 only.

### Rules

- Money is integer paise; times are UTC `timestamptz`, shown in Asia/Kolkata.
- Never trust client totals: bills are priced on the server from the menu, packages and memberships.
- Every business row has `org_id`; every query filters by it. Public links use unguessable tokens.
- Marketing messages only to clients whose latest `consent_records` row for `marketing` is granted. Max 2 per 30 days.
- New integrations go behind an adapter with a simulated implementation. No third-party network calls.
- UI: Astryx components and tokens only, no raw `div`/`span`, hex or px; brand via the theme. Demo data stays labelled Demo.
- Commits: conventional subjects. No `Co-Authored-By` or "Generated with" lines.

## Rules for agents editing this folder

- Follow [CONVENTIONS.md](https://github.com/craftLayer-studio/craftlayer-products/blob/main/CONVENTIONS.md).
- Every new number needs a source link with access date, or the label **(estimate)** with reasoning.
- Tie every new feature to one metric: acquisition, activation, retention, revenue or referral.
- Reference core modules instead of re-specifying them.

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->
