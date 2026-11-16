CREATE TABLE "audience_compteur" (
	"jour" date NOT NULL,
	"mesure" varchar(20) NOT NULL,
	"valeur" varchar(160) NOT NULL,
	"detail" varchar(160) DEFAULT '' NOT NULL,
	"nombre" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "audience_compteur_jour_mesure_valeur_detail_pk" PRIMARY KEY("jour","mesure","valeur","detail"),
	CONSTRAINT "audience_compteur_mesure_check" CHECK ("audience_compteur"."mesure" in ('PAGE', 'VISITEURS', 'PROVENANCE', 'APPAREIL', 'NAVIGATEUR', 'SYSTEME', 'INTROUVABLE', 'ERREUR_PAGE', 'ERREUR_API', 'ERREUR_NAVIGATEUR'))
);
--> statement-breakpoint
CREATE TABLE "audience_visiteur" (
	"jour" date NOT NULL,
	"empreinte" varchar(64) NOT NULL,
	CONSTRAINT "audience_visiteur_jour_empreinte_pk" PRIMARY KEY("jour","empreinte")
);
--> statement-breakpoint
CREATE TABLE "parcours_etape" (
	"visite_id" uuid NOT NULL,
	"rang" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"nature" varchar(10) NOT NULL,
	"valeur" varchar(160) NOT NULL,
	"detail" varchar(160) DEFAULT '' NOT NULL,
	CONSTRAINT "parcours_etape_visite_id_rang_pk" PRIMARY KEY("visite_id","rang"),
	CONSTRAINT "parcours_etape_nature_check" CHECK ("parcours_etape"."nature" in ('PAGE', 'EVENEMENT', 'ERREUR'))
);
--> statement-breakpoint
CREATE TABLE "parcours_visite" (
	"id" uuid PRIMARY KEY NOT NULL,
	"debut" timestamp with time zone DEFAULT now() NOT NULL,
	"derniere" timestamp with time zone DEFAULT now() NOT NULL,
	"provenance" varchar(100) NOT NULL,
	"appareil" varchar(12) NOT NULL,
	"navigateur" varchar(12) NOT NULL,
	"systeme" varchar(12) NOT NULL,
	"nb_etapes" integer DEFAULT 0 NOT NULL,
	"nb_pages" integer DEFAULT 0 NOT NULL,
	"nb_erreurs" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "parcours_visite_appareil_check" CHECK ("parcours_visite"."appareil" in ('ORDINATEUR', 'MOBILE', 'TABLETTE')),
	CONSTRAINT "parcours_visite_navigateur_check" CHECK ("parcours_visite"."navigateur" in ('CHROME', 'SAFARI', 'FIREFOX', 'EDGE', 'OPERA', 'SAMSUNG', 'AUTRE')),
	CONSTRAINT "parcours_visite_systeme_check" CHECK ("parcours_visite"."systeme" in ('WINDOWS', 'MACOS', 'IOS', 'ANDROID', 'LINUX', 'CHROMEOS', 'AUTRE'))
);
--> statement-breakpoint
ALTER TABLE "parcours_etape" ADD CONSTRAINT "parcours_etape_visite_id_parcours_visite_id_fk" FOREIGN KEY ("visite_id") REFERENCES "public"."parcours_visite"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parcours_visite_debut_idx" ON "parcours_visite" USING btree ("debut");