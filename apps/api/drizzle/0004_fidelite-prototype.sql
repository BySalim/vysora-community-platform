ALTER TABLE "utilisateur" ADD COLUMN "nom_affiche" varchar(60);--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "format_resultat" varchar(60);--> statement-breakpoint
ALTER TABLE "creation" ADD COLUMN "a_adapter" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "echange" ADD COLUMN "titre" varchar(100);--> statement-breakpoint
ALTER TABLE "moment_cle" ADD COLUMN "titre" varchar(100);--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD COLUMN "outil_id" bigint;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD COLUMN "modele_id" bigint;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD COLUMN "modele_non_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "sujet" ADD COLUMN "outil_id" bigint;--> statement-breakpoint
ALTER TABLE "sujet" ADD COLUMN "modele_id" bigint;--> statement-breakpoint
ALTER TABLE "sujet" ADD COLUMN "modele_non_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_outil_id_outil_id_fk" FOREIGN KEY ("outil_id") REFERENCES "public"."outil"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_modele_id_modele_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_outil_id_outil_id_fk" FOREIGN KEY ("outil_id") REFERENCES "public"."outil"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_modele_id_modele_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cas_bon_reflexe_outil_idx" ON "cas_bon_reflexe" USING btree ("outil_id");--> statement-breakpoint
CREATE INDEX "sujet_outil_idx" ON "sujet" USING btree ("outil_id");--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_modele_check" CHECK ("cas_bon_reflexe"."modele_id" is null or "cas_bon_reflexe"."modele_non_reference" is null);--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_outil_check" CHECK ("cas_bon_reflexe"."outil_id" is not null or ("cas_bon_reflexe"."modele_id" is null and "cas_bon_reflexe"."modele_non_reference" is null));--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_modele_check" CHECK ("sujet"."modele_id" is null or "sujet"."modele_non_reference" is null);--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_outil_check" CHECK ("sujet"."outil_id" is not null or ("sujet"."modele_id" is null and "sujet"."modele_non_reference" is null));