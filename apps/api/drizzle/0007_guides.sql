CREATE TABLE "demande_guide" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "demande_guide_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"libelle" varchar(120) NOT NULL,
	"categorie_id" bigint,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	"date_cloture" timestamp with time zone,
	CONSTRAINT "demande_guide_libelle_unique" UNIQUE("libelle")
);
--> statement-breakpoint
CREATE TABLE "guide" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guide_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" varchar(80) NOT NULL,
	"titre" varchar(150) NOT NULL,
	"titre_court" varchar(80) NOT NULL,
	"categorie_id" bigint NOT NULL,
	"mots_cles" text[] DEFAULT '{}'::text[] NOT NULL,
	"lacunes" text[] DEFAULT '{}'::text[] NOT NULL,
	"date_publication" timestamp with time zone,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	"date_modification" timestamp with time zone,
	CONSTRAINT "guide_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "guide_contenu" (
	"guide_id" bigint NOT NULL,
	"contenu_id" bigint NOT NULL,
	"ordre" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "guide_contenu_guide_id_contenu_id_pk" PRIMARY KEY("guide_id","contenu_id")
);
--> statement-breakpoint
CREATE TABLE "guide_etape" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guide_etape_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"guide_id" bigint NOT NULL,
	"ordre" smallint NOT NULL,
	"titre" varchar(150) NOT NULL,
	"conseil" text NOT NULL,
	"citation_creation_id" bigint,
	"citation_texte" text,
	CONSTRAINT "guide_etape_ordre_unique" UNIQUE("guide_id","ordre"),
	CONSTRAINT "guide_etape_citation_check" CHECK ("guide_etape"."citation_creation_id" is null or "guide_etape"."citation_texte" is not null)
);
--> statement-breakpoint
CREATE TABLE "guide_etape_source" (
	"etape_id" bigint NOT NULL,
	"creation_id" bigint NOT NULL,
	CONSTRAINT "guide_etape_source_etape_id_creation_id_pk" PRIMARY KEY("etape_id","creation_id")
);
--> statement-breakpoint
CREATE TABLE "guide_piege" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guide_piege_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"guide_id" bigint NOT NULL,
	"ordre" smallint NOT NULL,
	"titre" varchar(200) NOT NULL,
	"solution" text NOT NULL,
	"etape_id" bigint,
	"sujet_id" bigint,
	"cas_id" bigint,
	CONSTRAINT "guide_piege_ordre_unique" UNIQUE("guide_id","ordre")
);
--> statement-breakpoint
CREATE TABLE "guide_piege_source" (
	"piege_id" bigint NOT NULL,
	"creation_id" bigint NOT NULL,
	CONSTRAINT "guide_piege_source_piege_id_creation_id_pk" PRIMARY KEY("piege_id","creation_id")
);
--> statement-breakpoint
CREATE TABLE "liste_controle" (
	"utilisateur_id" bigint NOT NULL,
	"guide_id" bigint NOT NULL,
	"etapes" bigint[] DEFAULT '{}'::bigint[] NOT NULL,
	"pieges" bigint[] DEFAULT '{}'::bigint[] NOT NULL,
	"date_modification" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "liste_controle_utilisateur_id_guide_id_pk" PRIMARY KEY("utilisateur_id","guide_id")
);
--> statement-breakpoint
CREATE TABLE "proposition_piege" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "proposition_piege_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"guide_id" bigint NOT NULL,
	"auteur_id" bigint NOT NULL,
	"titre" varchar(300) NOT NULL,
	"solution" varchar(1500),
	"etape_id" bigint,
	"outil" varchar(100),
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"statut" text DEFAULT 'EN_RELECTURE' NOT NULL,
	"relecteur_id" bigint,
	"date_relecture" timestamp with time zone,
	CONSTRAINT "proposition_piege_statut_check" CHECK ("proposition_piege"."statut" in ('EN_RELECTURE', 'RETENUE', 'ECARTEE')),
	CONSTRAINT "proposition_piege_relecture_check" CHECK (("proposition_piege"."statut" = 'EN_RELECTURE') = ("proposition_piege"."date_relecture" is null))
);
--> statement-breakpoint
CREATE TABLE "soutien_demande" (
	"demande_id" bigint NOT NULL,
	"utilisateur_id" bigint NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "soutien_demande_demande_id_utilisateur_id_pk" PRIMARY KEY("demande_id","utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "demande_guide" ADD CONSTRAINT "demande_guide_categorie_id_categorie_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categorie"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide" ADD CONSTRAINT "guide_categorie_id_categorie_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categorie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_contenu" ADD CONSTRAINT "guide_contenu_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_contenu" ADD CONSTRAINT "guide_contenu_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_etape" ADD CONSTRAINT "guide_etape_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_etape" ADD CONSTRAINT "guide_etape_citation_creation_id_creation_id_fk" FOREIGN KEY ("citation_creation_id") REFERENCES "public"."creation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_etape_source" ADD CONSTRAINT "guide_etape_source_etape_id_guide_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."guide_etape"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_etape_source" ADD CONSTRAINT "guide_etape_source_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_piege" ADD CONSTRAINT "guide_piege_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_piege" ADD CONSTRAINT "guide_piege_etape_id_guide_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."guide_etape"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_piege" ADD CONSTRAINT "guide_piege_sujet_id_sujet_id_fk" FOREIGN KEY ("sujet_id") REFERENCES "public"."sujet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_piege" ADD CONSTRAINT "guide_piege_cas_id_cas_bon_reflexe_id_fk" FOREIGN KEY ("cas_id") REFERENCES "public"."cas_bon_reflexe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_piege_source" ADD CONSTRAINT "guide_piege_source_piege_id_guide_piege_id_fk" FOREIGN KEY ("piege_id") REFERENCES "public"."guide_piege"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_piege_source" ADD CONSTRAINT "guide_piege_source_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_controle" ADD CONSTRAINT "liste_controle_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liste_controle" ADD CONSTRAINT "liste_controle_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposition_piege" ADD CONSTRAINT "proposition_piege_guide_id_guide_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposition_piege" ADD CONSTRAINT "proposition_piege_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposition_piege" ADD CONSTRAINT "proposition_piege_etape_id_guide_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."guide_etape"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposition_piege" ADD CONSTRAINT "proposition_piege_relecteur_id_utilisateur_id_fk" FOREIGN KEY ("relecteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soutien_demande" ADD CONSTRAINT "soutien_demande_demande_id_demande_guide_id_fk" FOREIGN KEY ("demande_id") REFERENCES "public"."demande_guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soutien_demande" ADD CONSTRAINT "soutien_demande_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guide_categorie_idx" ON "guide" USING btree ("categorie_id");--> statement-breakpoint
CREATE INDEX "guide_contenu_contenu_idx" ON "guide_contenu" USING btree ("contenu_id");--> statement-breakpoint
CREATE INDEX "proposition_piege_guide_idx" ON "proposition_piege" USING btree ("guide_id","statut");--> statement-breakpoint
CREATE INDEX "proposition_piege_auteur_idx" ON "proposition_piege" USING btree ("auteur_id","statut");--> statement-breakpoint
CREATE INDEX "soutien_demande_utilisateur_idx" ON "soutien_demande" USING btree ("utilisateur_id");