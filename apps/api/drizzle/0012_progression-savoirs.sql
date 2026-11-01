CREATE TABLE "progression_savoir" (
	"utilisateur_id" bigint NOT NULL,
	"savoir" varchar(80) NOT NULL,
	"date_acquis" date,
	"choix" smallint,
	"correcte" boolean,
	"date_verification" date,
	CONSTRAINT "progression_savoir_utilisateur_id_savoir_pk" PRIMARY KEY("utilisateur_id","savoir"),
	CONSTRAINT "progression_savoir_choix_check" CHECK ("progression_savoir"."choix" is null or "progression_savoir"."choix" between 0 and 4),
	CONSTRAINT "progression_savoir_verification_check" CHECK (("progression_savoir"."choix" is null) = ("progression_savoir"."correcte" is null) and ("progression_savoir"."choix" is null) = ("progression_savoir"."date_verification" is null)),
	CONSTRAINT "progression_savoir_contenu_check" CHECK ("progression_savoir"."date_acquis" is not null or "progression_savoir"."choix" is not null)
);
--> statement-breakpoint
ALTER TABLE "progression_savoir" ADD CONSTRAINT "progression_savoir_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;