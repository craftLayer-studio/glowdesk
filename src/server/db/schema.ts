import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey();
const orgId = () => text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

/** One outlet (salon) = one tenant in the MVP. */
export const orgs = pgTable("orgs", {
  id: id(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull().default(""),
  chairs: integer("chairs").notNull(),
  openMinute: integer("open_minute").notNull(),
  closeMinute: integer("close_minute").notNull(),
  gstPercent: integer("gst_percent").notNull().default(18),
  gstin: text("gstin").notNull().default(""),
  upiVpa: text("upi_vpa").notNull().default(""),
  googleReviewUrl: text("google_review_url").notNull().default(""),
  followUpOffer: text("follow_up_offer").notNull().default(""),
  /** Unguessable token printed in the reception/mirror QR. */
  qrToken: text("qr_token").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("orgs_qr_token_uq").on(t.qrToken)]);

export const users = pgTable("users", {
  id: id(),
  orgId: orgId(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "staff"] }).notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("users_phone_uq").on(t.phone)]);

export const otpCodes = pgTable("otp_codes", {
  id: id(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumed: boolean("consumed").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("otp_phone_idx").on(t.phone)]);

export const stylists = pgTable("stylists", {
  id: id(),
  orgId: orgId(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  title: text("title").notNull().default(""),
  commissionType: text("commission_type", { enum: ["percent", "flat"] }).notNull().default("percent"),
  /** Percent for "percent", paise for "flat". */
  commissionValue: integer("commission_value").notNull().default(0),
  packagePercent: integer("package_percent").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index("stylists_org_idx").on(t.orgId)]);

export const services = pgTable("services", {
  id: id(),
  orgId: orgId(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  gender: text("gender", { enum: ["women", "men", "unisex"] }).notNull().default("unisex"),
  pricePaise: integer("price_paise").notNull(),
  durationMin: integer("duration_min").notNull(),
  cycleDays: integer("cycle_days").notNull().default(0),
  commissionOverridePercent: integer("commission_override_percent"),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("services_org_idx").on(t.orgId)]);

export const customers = pgTable("customers", {
  id: id(),
  orgId: orgId(),
  /** E.164, e.g. +919876543210. */
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("customers_org_phone_uq").on(t.orgId, t.phone)]);

export const consentRecords = pgTable("consent_records", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["service_updates", "marketing"] }).notNull(),
  granted: boolean("granted").notNull(),
  noticeVersion: text("notice_version").notNull(),
  channel: text("channel", { enum: ["qr", "staff", "whatsapp"] }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("consent_customer_idx").on(t.orgId, t.customerId)]);

export const queueEntries = pgTable("queue_entries", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  serviceId: text("service_id").notNull().references(() => services.id),
  preferredStylistId: text("preferred_stylist_id").references(() => stylists.id),
  stylistId: text("stylist_id").references(() => stylists.id),
  status: text("status", { enum: ["waiting", "in_chair", "done", "left"] }).notNull().default("waiting"),
  ticketNo: integer("ticket_no").notNull(),
  /** Unguessable token for the client's live ticket page. */
  publicToken: text("public_token").notNull(),
  joinedAt: ts("joined_at").notNull().defaultNow(),
  startedAt: ts("started_at"),
  doneAt: ts("done_at"),
}, (t) => [index("queue_org_status_idx").on(t.orgId, t.status), uniqueIndex("queue_token_uq").on(t.publicToken)]);

export const appointments = pgTable("appointments", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  stylistId: text("stylist_id").notNull().references(() => stylists.id),
  serviceId: text("service_id").notNull().references(() => services.id),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  status: text("status", { enum: ["booked", "checked_in", "completed", "cancelled", "no_show"] }).notNull().default("booked"),
  source: text("source", { enum: ["qr", "link", "walkin", "phone"] }).notNull(),
  publicToken: text("public_token").notNull(),
  reminded24At: ts("reminded_24_at"),
  reminded2At: ts("reminded_2_at"),
  createdAt: createdAt(),
}, (t) => [index("appt_org_stylist_idx").on(t.orgId, t.stylistId, t.startAt), uniqueIndex("appt_token_uq").on(t.publicToken)]);

export const visits = pgTable("visits", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  stylistId: text("stylist_id").notNull().references(() => stylists.id),
  appointmentId: text("appointment_id").references(() => appointments.id),
  queueEntryId: text("queue_entry_id").references(() => queueEntries.id),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull(),
  taxable: integer("taxable").notNull(),
  gst: integer("gst").notNull(),
  total: integer("total").notNull(),
  commission: integer("commission").notNull(),
  serviceMinutes: integer("service_minutes").notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "upi", "card", "wallet"] }).notNull(),
  billNo: integer("bill_no").notNull(),
  createdAt: createdAt(),
}, (t) => [index("visits_org_created_idx").on(t.orgId, t.createdAt), index("visits_customer_idx").on(t.orgId, t.customerId)]);

export const visitLines = pgTable("visit_lines", {
  id: id(),
  orgId: orgId(),
  visitId: text("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id),
  name: text("name").notNull(),
  listPrice: integer("list_price").notNull(),
  discount: integer("discount").notNull(),
  net: integer("net").notNull(),
  customerPackageId: text("customer_package_id"),
  commission: integer("commission").notNull(),
}, (t) => [index("visit_lines_visit_idx").on(t.orgId, t.visitId)]);

export const packages = pgTable("packages", {
  id: id(),
  orgId: orgId(),
  name: text("name").notNull(),
  serviceId: text("service_id").notNull().references(() => services.id),
  sessions: integer("sessions").notNull(),
  pricePaise: integer("price_paise").notNull(),
  validityDays: integer("validity_days").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const membershipPlans = pgTable("membership_plans", {
  id: id(),
  orgId: orgId(),
  name: text("name").notNull(),
  pricePaise: integer("price_paise").notNull(),
  walletCreditPaise: integer("wallet_credit_paise").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  validityDays: integer("validity_days").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const customerPackages = pgTable("customer_packages", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  packageId: text("package_id").notNull().references(() => packages.id),
  sessionsLeft: integer("sessions_left").notNull(),
  expiresAt: ts("expires_at").notNull(),
  soldByStylistId: text("sold_by_stylist_id").references(() => stylists.id),
  pricePaise: integer("price_paise").notNull(),
  commission: integer("commission").notNull().default(0),
  paymentMethod: text("payment_method").notNull(),
  createdAt: createdAt(),
}, (t) => [index("cust_pkg_idx").on(t.orgId, t.customerId)]);

export const memberships = pgTable("memberships", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  planId: text("plan_id").notNull().references(() => membershipPlans.id),
  walletBalancePaise: integer("wallet_balance_paise").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  expiresAt: ts("expires_at").notNull(),
  soldByStylistId: text("sold_by_stylist_id").references(() => stylists.id),
  pricePaise: integer("price_paise").notNull(),
  commission: integer("commission").notNull().default(0),
  paymentMethod: text("payment_method").notNull(),
  createdAt: createdAt(),
}, (t) => [index("memberships_idx").on(t.orgId, t.customerId)]);

/** Simulated messaging: every WhatsApp/SMS the app would send lands here. */
export const outbox = pgTable("outbox", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").references(() => customers.id),
  channel: text("channel", { enum: ["whatsapp", "sms"] }).notNull(),
  purpose: text("purpose", { enum: ["utility", "marketing", "otp"] }).notNull(),
  template: text("template").notNull(),
  toPhone: text("to_phone").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["simulated", "blocked"] }).notNull().default("simulated"),
  createdAt: createdAt(),
}, (t) => [index("outbox_org_idx").on(t.orgId, t.createdAt)]);

export const rebookNudges = pgTable("rebook_nudges", {
  id: id(),
  orgId: orgId(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  serviceId: text("service_id").notNull().references(() => services.id),
  lastVisitId: text("last_visit_id").notNull().references(() => visits.id),
  kind: text("kind", { enum: ["first", "follow_up"] }).notNull(),
  dueAt: ts("due_at").notNull(),
  sentAt: ts("sent_at").notNull(),
  outboxId: text("outbox_id").references(() => outbox.id),
  bookedVisitId: text("booked_visit_id").references(() => visits.id),
  recoveredPaise: integer("recovered_paise").notNull().default(0),
}, (t) => [index("nudges_org_idx").on(t.orgId, t.customerId)]);

export const reviews = pgTable("reviews", {
  id: id(),
  orgId: orgId(),
  visitId: text("visit_id").notNull().references(() => visits.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  token: text("token").notNull(),
  rating: integer("rating"),
  comment: text("comment").notNull().default(""),
  route: text("route", { enum: ["google", "private"] }),
  requestedAt: ts("requested_at").notNull().defaultNow(),
  answeredAt: ts("answered_at"),
}, (t) => [uniqueIndex("reviews_token_uq").on(t.token), index("reviews_org_idx").on(t.orgId)]);
