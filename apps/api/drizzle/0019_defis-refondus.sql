ALTER TABLE "defi" ADD COLUMN "definition" text;--> statement-breakpoint
ALTER TABLE "defi" ADD COLUMN "cases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "defi" ADD COLUMN "criteres" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "defi" ADD COLUMN "criteres_communs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "defi" ADD COLUMN "pause_depuis" timestamp with time zone;