ALTER TABLE "creation" ADD COLUMN "resultat_texte" text;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "resultat_nature" text;--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "resultat_nom" varchar(120);--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_resultat_nature_check" CHECK ("creation"."resultat_nature" in ('TEXTE', 'CODE'));--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_resultat_check" CHECK (("creation"."resultat_texte" is null) = ("creation"."resultat_nature" is null) and ("creation"."resultat_nom" is null or "creation"."resultat_texte" is not null));