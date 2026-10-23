-- Migration manuelle : ce que le schéma Drizzle ne sait pas décrire.

-- Recherche plein texte (RG-31) : français, sans distinction d'accents.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION vysora_fr (COPY = french);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION vysora_fr
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;
--> statement-breakpoint

-- Ordres uniques vérifiés en fin de transaction, pour pouvoir réordonner étapes, échanges et options.
ALTER TABLE "etape" ADD CONSTRAINT "etape_ordre_unique"
  UNIQUE ("creation_id", "ordre") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "echange" ADD CONSTRAINT "echange_ordre_unique"
  UNIQUE ("etape_id", "ordre") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "option_reponse" ADD CONSTRAINT "option_reponse_ordre_unique"
  UNIQUE ("cas_id", "ordre") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

-- RG-102 : une décision de modération est journalisée et n'est plus modifiable.
-- Une erreur se corrige par une nouvelle décision (par exemple « rétablir »).
CREATE FUNCTION interdire_modification_decision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Une décision de modération ne peut être ni modifiée ni supprimée (RG-102).';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "decision_moderation_immuable"
  BEFORE UPDATE OR DELETE ON "decision_moderation"
  FOR EACH ROW EXECUTE FUNCTION interdire_modification_decision();
