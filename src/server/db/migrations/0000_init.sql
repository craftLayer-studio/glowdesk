CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"stylist_id" text NOT NULL,
	"service_id" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"source" text NOT NULL,
	"public_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"notice_version" text NOT NULL,
	"channel" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"package_id" text NOT NULL,
	"sessions_left" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"sold_by_stylist_id" text,
	"price_paise" integer NOT NULL,
	"commission" integer DEFAULT 0 NOT NULL,
	"payment_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"price_paise" integer NOT NULL,
	"wallet_credit_paise" integer NOT NULL,
	"discount_percent" integer NOT NULL,
	"validity_days" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"wallet_balance_paise" integer NOT NULL,
	"discount_percent" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"sold_by_stylist_id" text,
	"price_paise" integer NOT NULL,
	"commission" integer DEFAULT 0 NOT NULL,
	"payment_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"chairs" integer NOT NULL,
	"open_minute" integer NOT NULL,
	"close_minute" integer NOT NULL,
	"gst_percent" integer DEFAULT 18 NOT NULL,
	"gstin" text DEFAULT '' NOT NULL,
	"upi_vpa" text DEFAULT '' NOT NULL,
	"google_review_url" text DEFAULT '' NOT NULL,
	"follow_up_offer" text DEFAULT '' NOT NULL,
	"qr_token" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text,
	"channel" text NOT NULL,
	"purpose" text NOT NULL,
	"template" text NOT NULL,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'simulated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"service_id" text NOT NULL,
	"sessions" integer NOT NULL,
	"price_paise" integer NOT NULL,
	"validity_days" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"service_id" text NOT NULL,
	"preferred_stylist_id" text,
	"stylist_id" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"ticket_no" integer NOT NULL,
	"public_token" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rebook_nudges" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"service_id" text NOT NULL,
	"last_visit_id" text NOT NULL,
	"kind" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"outbox_id" text,
	"booked_visit_id" text,
	"recovered_paise" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"token" text NOT NULL,
	"rating" integer,
	"comment" text DEFAULT '' NOT NULL,
	"route" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"gender" text DEFAULT 'unisex' NOT NULL,
	"price_paise" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"cycle_days" integer DEFAULT 0 NOT NULL,
	"commission_override_percent" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stylists" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"commission_type" text DEFAULT 'percent' NOT NULL,
	"commission_value" integer DEFAULT 0 NOT NULL,
	"package_percent" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"visit_id" text NOT NULL,
	"service_id" text NOT NULL,
	"name" text NOT NULL,
	"list_price" integer NOT NULL,
	"discount" integer NOT NULL,
	"net" integer NOT NULL,
	"customer_package_id" text,
	"commission" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"stylist_id" text NOT NULL,
	"appointment_id" text,
	"queue_entry_id" text,
	"subtotal" integer NOT NULL,
	"discount" integer NOT NULL,
	"taxable" integer NOT NULL,
	"gst" integer NOT NULL,
	"total" integer NOT NULL,
	"commission" integer NOT NULL,
	"service_minutes" integer NOT NULL,
	"payment_method" text NOT NULL,
	"bill_no" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_sold_by_stylist_id_stylists_id_fk" FOREIGN KEY ("sold_by_stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_sold_by_stylist_id_stylists_id_fk" FOREIGN KEY ("sold_by_stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_preferred_stylist_id_stylists_id_fk" FOREIGN KEY ("preferred_stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebook_nudges" ADD CONSTRAINT "rebook_nudges_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebook_nudges" ADD CONSTRAINT "rebook_nudges_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebook_nudges" ADD CONSTRAINT "rebook_nudges_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebook_nudges" ADD CONSTRAINT "rebook_nudges_last_visit_id_visits_id_fk" FOREIGN KEY ("last_visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebook_nudges" ADD CONSTRAINT "rebook_nudges_outbox_id_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."outbox"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebook_nudges" ADD CONSTRAINT "rebook_nudges_booked_visit_id_visits_id_fk" FOREIGN KEY ("booked_visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stylists" ADD CONSTRAINT "stylists_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_lines" ADD CONSTRAINT "visit_lines_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_lines" ADD CONSTRAINT "visit_lines_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_lines" ADD CONSTRAINT "visit_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_queue_entry_id_queue_entries_id_fk" FOREIGN KEY ("queue_entry_id") REFERENCES "public"."queue_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appt_org_stylist_idx" ON "appointments" USING btree ("org_id","stylist_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appt_token_uq" ON "appointments" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "consent_customer_idx" ON "consent_records" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE INDEX "cust_pkg_idx" ON "customer_packages" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_phone_uq" ON "customers" USING btree ("org_id","phone");--> statement-breakpoint
CREATE INDEX "memberships_idx" ON "memberships" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_qr_token_uq" ON "orgs" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "otp_phone_idx" ON "otp_codes" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "outbox_org_idx" ON "outbox" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "queue_org_status_idx" ON "queue_entries" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "queue_token_uq" ON "queue_entries" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "nudges_org_idx" ON "rebook_nudges" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_token_uq" ON "reviews" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reviews_org_idx" ON "reviews" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "services_org_idx" ON "services" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stylists_org_idx" ON "stylists" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "visit_lines_visit_idx" ON "visit_lines" USING btree ("org_id","visit_id");--> statement-breakpoint
CREATE INDEX "visits_org_created_idx" ON "visits" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "visits_customer_idx" ON "visits" USING btree ("org_id","customer_id");