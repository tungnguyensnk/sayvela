ALTER TABLE "session_segments" ALTER COLUMN "source" TYPE varchar(32);
ALTER TABLE "session_segments" ADD COLUMN IF NOT EXISTS "language" varchar(16);
ALTER TABLE "session_segments" ADD COLUMN IF NOT EXISTS "translation_status" varchar(16);
