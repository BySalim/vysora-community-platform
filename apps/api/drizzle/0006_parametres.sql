ALTER TABLE "notification" ADD COLUMN "email_en_attente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "utilisateur" ADD COLUMN "date_mot_de_passe" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "notification_email_en_attente_idx" ON "notification" USING btree ("id") WHERE "notification"."email_en_attente";