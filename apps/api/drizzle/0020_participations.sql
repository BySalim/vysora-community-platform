CREATE TABLE "participation" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'PARTICIPATION' NOT NULL,
	"defi_id" bigint NOT NULL,
	"titre" varchar(100) NOT NULL,
	"idee" varchar(300),
	"outil_id" bigint,
	"modele" varchar(100),
	"prompts" jsonb NOT NULL,
	"essais" smallint DEFAULT 1 NOT NULL,
	"moment" varchar(600),
	"jeu" text,
	"jeu_nom" varchar(120),
	"date_publication" timestamp with time zone DEFAULT now() NOT NULL,
	"rang_final" smallint,
	CONSTRAINT "participation_type_contenu_check" CHECK ("participation"."type_contenu" = 'PARTICIPATION'),
	CONSTRAINT "participation_essais_check" CHECK ("participation"."essais" between 1 and 50),
	CONSTRAINT "participation_jeu_check" CHECK ("participation"."jeu" is null or length("participation"."jeu") <= 200000)
);
--> statement-breakpoint
ALTER TABLE "contenu" DROP CONSTRAINT "contenu_type_check";--> statement-breakpoint
ALTER TABLE "participation" ADD CONSTRAINT "participation_defi_id_defi_id_fk" FOREIGN KEY ("defi_id") REFERENCES "public"."defi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participation" ADD CONSTRAINT "participation_outil_id_outil_id_fk" FOREIGN KEY ("outil_id") REFERENCES "public"."outil"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participation" ADD CONSTRAINT "participation_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participation_defi_idx" ON "participation" USING btree ("defi_id");--> statement-breakpoint
ALTER TABLE "contenu" ADD CONSTRAINT "contenu_type_check" CHECK ("contenu"."type_contenu" in ('CREATION', 'SUJET', 'MESSAGE', 'COMMENTAIRE', 'REPRODUCTION', 'CAS_BON_REFLEXE', 'PARTICIPATION'));