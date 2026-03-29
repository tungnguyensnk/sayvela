CREATE TABLE IF NOT EXISTS "billing_usage_cycles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(16) NOT NULL,
	"minutes_limit" integer NOT NULL,
	"minutes_used" integer DEFAULT 0 NOT NULL,
	"cycle_started_at" timestamp NOT NULL,
	"cycle_ends_at" timestamp NOT NULL,
	"stripe_subscription_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "billing_usage_cycles" ADD CONSTRAINT "billing_usage_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
