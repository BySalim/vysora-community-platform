ALTER TABLE "cas_bon_reflexe" ADD COLUMN "categorie_id" bigint;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD COLUMN "duree_minutes" smallint;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_categorie_id_categorie_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categorie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_duree_check" CHECK ("cas_bon_reflexe"."duree_minutes" is null or "cas_bon_reflexe"."duree_minutes" between 1 and 60);