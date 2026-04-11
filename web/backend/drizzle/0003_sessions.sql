CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"language" varchar(16),
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"summary" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_segments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"speaker" varchar(64),
	"text" text NOT NULL,
	"start_ms" integer DEFAULT 0 NOT NULL,
	"end_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user_created" ON "sessions" ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user_status" ON "sessions" ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_segments_session" ON "session_segments" ("session_id","start_ms");
