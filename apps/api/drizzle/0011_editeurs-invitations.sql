ALTER TABLE "editeur" ADD COLUMN "slug" varchar(100);--> statement-breakpoint
-- Clé stable des éditeurs déjà chargés : leur nom passé comme slugifier() du paquet partagé (accents
-- courants ôtés, minuscules, tirets) ; un doublon ou un nom sans lettre ni chiffre reçoit l'identifiant.
WITH cle AS (
	SELECT "id", trim(BOTH '-' FROM regexp_replace(lower(translate(replace(replace("nom", '’', ' '), '''', ' '),
		'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
		'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')), '[^a-z0-9]+', '-', 'g')) AS "slug"
	FROM "editeur"
), unique_cle AS (
	SELECT "id", CASE
		WHEN "slug" = '' THEN 'editeur-' || "id"
		WHEN row_number() OVER (PARTITION BY "slug" ORDER BY "id") > 1 THEN left("slug", 80) || '-' || "id"
		ELSE left("slug", 80)
	END AS "slug"
	FROM cle
)
UPDATE "editeur" e SET "slug" = u."slug" FROM unique_cle u WHERE u."id" = e."id";--> statement-breakpoint
ALTER TABLE "editeur" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "date_desactivation" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "editeur" ADD CONSTRAINT "editeur_slug_unique" UNIQUE("slug");
