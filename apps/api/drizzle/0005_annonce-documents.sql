ALTER TABLE "document_legal" ADD COLUMN "date_annonce" timestamp with time zone;--> statement-breakpoint
-- RG-90 (EMAIL-01) : les versions déjà en vigueur avant l'annonce par e-mail ne sont pas annoncées après coup.
UPDATE "document_legal" SET "date_annonce" = now() WHERE "date_effet" <= current_date;
