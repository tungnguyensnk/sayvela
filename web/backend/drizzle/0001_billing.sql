CREATE TABLE IF NOT EXISTS "billing_customers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_customers_stripe_customer_id_unique" ON "billing_customers" ("stripe_customer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255) NOT NULL,
	"stripe_subscription_id" varchar(255) NOT NULL,
	"status" varchar(64) NOT NULL,
	"price_id" varchar(255) NOT NULL,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_unique" ON "subscriptions" ("stripe_subscription_id");
--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stripe_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" varchar(128) NOT NULL,
	"stripe_created_at" timestamp,
	"processed_at" timestamp DEFAULT now()
);

