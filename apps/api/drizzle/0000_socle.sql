CREATE TABLE "badge" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badge_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(40) NOT NULL,
	"libelle" varchar(60) NOT NULL,
	"description" text NOT NULL,
	"critere" text NOT NULL,
	"categorie" text NOT NULL,
	"icone" varchar(40) NOT NULL,
	"ton" text NOT NULL,
	"est_actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "badge_code_unique" UNIQUE("code"),
	CONSTRAINT "badge_categorie_check" CHECK ("badge"."categorie" in ('CONTRIBUTION', 'APPRENTISSAGE', 'COMMUNAUTE')),
	CONSTRAINT "badge_ton_check" CHECK ("badge"."ton" in ('BLEU', 'VERT', 'AMBRE', 'ENCRE'))
);
--> statement-breakpoint
CREATE TABLE "categorie" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categorie_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"libelle" varchar(60) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"description" text,
	"icone" varchar(40),
	"ordre_affichage" smallint DEFAULT 0 NOT NULL,
	"est_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categorie_libelle_unique" UNIQUE("libelle"),
	CONSTRAINT "categorie_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "document_legal" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "document_legal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"version" varchar(20) NOT NULL,
	"date_effet" date NOT NULL,
	"url" varchar(2048) NOT NULL,
	"acceptation_requise" boolean DEFAULT true NOT NULL,
	"resume_changements" text,
	"texte" text,
	CONSTRAINT "document_legal_type_check" CHECK ("document_legal"."type" in ('CGU', 'CONFIDENTIALITE', 'CHARTE'))
);
--> statement-breakpoint
CREATE TABLE "editeur" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "editeur_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"nom" varchar(100) NOT NULL,
	"site_web" varchar(2048),
	"est_actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "editeur_nom_unique" UNIQUE("nom")
);
--> statement-breakpoint
CREATE TABLE "etiquette" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "etiquette_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"libelle" varchar(40) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"est_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "etiquette_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "licence" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "licence_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(30) NOT NULL,
	"libelle" varchar(100) NOT NULL,
	"resume" varchar(200),
	"url" varchar(2048) NOT NULL,
	"autorise_variantes" boolean NOT NULL,
	"est_par_defaut" boolean DEFAULT false NOT NULL,
	"est_active" boolean DEFAULT true NOT NULL,
	"ordre_affichage" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "licence_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "modele" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "modele_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"editeur_id" bigint NOT NULL,
	"nom" varchar(100) NOT NULL,
	"nom_court" varchar(60) NOT NULL,
	"date_sortie" date,
	"statut" text DEFAULT 'DISPONIBLE' NOT NULL,
	CONSTRAINT "modele_statut_check" CHECK ("modele"."statut" in ('DISPONIBLE', 'RETIRE'))
);
--> statement-breakpoint
CREATE TABLE "niveau" (
	"rang" smallint PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"libelle" varchar(30) NOT NULL,
	"seuil_points" integer NOT NULL,
	"creations_par24h" integer,
	"sujets_par24h" integer,
	"reponses_et_commentaires_par24h" integer,
	"liens_par_contenu" integer,
	"compte_dans_masquage_automatique" boolean NOT NULL,
	"peut_proposer_un_cas" boolean NOT NULL,
	CONSTRAINT "niveau_code_unique" UNIQUE("code"),
	CONSTRAINT "niveau_seuilPoints_unique" UNIQUE("seuil_points"),
	CONSTRAINT "niveau_rang_check" CHECK ("niveau"."rang" between 1 and 5),
	CONSTRAINT "niveau_seuil_check" CHECK ("niveau"."seuil_points" >= 0)
);
--> statement-breakpoint
CREATE TABLE "outil" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outil_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"editeur_id" bigint NOT NULL,
	"nom" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" text NOT NULL,
	"famille" text NOT NULL,
	"logo" varchar(80),
	"logo_monochrome" boolean DEFAULT false NOT NULL,
	"alias" text[] DEFAULT '{}'::text[] NOT NULL,
	"est_agent" boolean DEFAULT false NOT NULL,
	"site_web" varchar(2048),
	"statut" text DEFAULT 'ACTIF' NOT NULL,
	CONSTRAINT "outil_nom_unique" UNIQUE("nom"),
	CONSTRAINT "outil_slug_unique" UNIQUE("slug"),
	CONSTRAINT "outil_type_check" CHECK ("outil"."type" in ('ASSISTANT_CONVERSATIONNEL', 'EDITEUR_CODE', 'AGENT_CODE', 'CONSTRUCTEUR_APPLICATION', 'GENERATEUR_IMAGE', 'GENERATEUR_VIDEO', 'GENERATEUR_AUDIO', 'AUTRE')),
	CONSTRAINT "outil_famille_check" CHECK ("outil"."famille" in ('ASSISTANT', 'IMAGE', 'VIDEO', 'AUDIO', 'CODE', 'AUTOMATISATION')),
	CONSTRAINT "outil_statut_check" CHECK ("outil"."statut" in ('ACTIF', 'ARCHIVE'))
);
--> statement-breakpoint
CREATE TABLE "outil_modele" (
	"outil_id" bigint NOT NULL,
	"modele_id" bigint NOT NULL,
	"ordre" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "outil_modele_outil_id_modele_id_pk" PRIMARY KEY("outil_id","modele_id")
);
--> statement-breakpoint
CREATE TABLE "type_vote" (
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"libelle" varchar(50) NOT NULL,
	CONSTRAINT "type_vote_code_check" CHECK ("type_vote"."code" in ('UTILE', 'TESTE_OK'))
);
--> statement-breakpoint
CREATE TABLE "acceptation_document" (
	"utilisateur_id" bigint NOT NULL,
	"document_legal_id" bigint NOT NULL,
	"date_acceptation" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acceptation_document_utilisateur_id_document_legal_id_pk" PRIMARY KEY("utilisateur_id","document_legal_id")
);
--> statement-breakpoint
CREATE TABLE "compte_externe" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "compte_externe_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"utilisateur_id" bigint NOT NULL,
	"fournisseur" text NOT NULL,
	"identifiant_fournisseur" varchar(255) NOT NULL,
	"date_liaison" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compte_externe_fournisseur_check" CHECK ("compte_externe"."fournisseur" in ('GITHUB', 'GOOGLE'))
);
--> statement-breakpoint
CREATE TABLE "demande_droit" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "demande_droit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"utilisateur_id" bigint NOT NULL,
	"type" text NOT NULL,
	"date_demande" timestamp with time zone DEFAULT now() NOT NULL,
	"statut" text DEFAULT 'EN_COURS' NOT NULL,
	"date_traitement" timestamp with time zone,
	"suppression_creations" boolean,
	"fichier_export" varchar(255),
	"date_expiration_export" timestamp with time zone,
	CONSTRAINT "demande_droit_type_check" CHECK ("demande_droit"."type" in ('EXPORT', 'SUPPRESSION')),
	CONSTRAINT "demande_droit_statut_check" CHECK ("demande_droit"."statut" in ('EN_COURS', 'TRAITEE', 'ANNULEE')),
	CONSTRAINT "demande_droit_traitement_check" CHECK ("demande_droit"."statut" <> 'TRAITEE' or "demande_droit"."date_traitement" is not null),
	CONSTRAINT "demande_droit_suppression_check" CHECK (("demande_droit"."type" = 'SUPPRESSION') = ("demande_droit"."suppression_creations" is not null))
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invitation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(40) NOT NULL,
	"createur_id" bigint,
	"utilisateur_id" bigint,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	"date_expiration" timestamp with time zone,
	"date_utilisation" timestamp with time zone,
	CONSTRAINT "invitation_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mouvement_reputation" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mouvement_reputation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"beneficiaire_id" bigint NOT NULL,
	"points" integer NOT NULL,
	"motif" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"contenu_id" bigint,
	"decision_id" bigint,
	"acteur_id" bigint,
	"mouvement_annule_id" bigint,
	CONSTRAINT "mouvement_reputation_motif_check" CHECK ("mouvement_reputation"."motif" in ('VOTE_UTILE_RECU', 'VOTE_TESTE_RECU', 'REPRODUCTION_REUSSIE_RECUE', 'REPONSE_ACCEPTEE', 'ACCEPTATION_REPONSE', 'REPRODUCTION_DECLAREE', 'CAS_VALIDE', 'CAS_REUSSI', 'PARTICIPATION_DEFI', 'PODIUM_DEFI', 'ANNULATION', 'AJUSTEMENT_MODERATION')),
	CONSTRAINT "mouvement_reputation_justification_check" CHECK (("mouvement_reputation"."motif" = 'AJUSTEMENT_MODERATION') = ("mouvement_reputation"."decision_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"destinataire_id" bigint NOT NULL,
	"declencheur_id" bigint,
	"contenu_id" bigint,
	"type" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"est_lue" boolean DEFAULT false NOT NULL,
	"nombre_regroupe" integer DEFAULT 1 NOT NULL,
	"donnees" jsonb,
	"cle_regroupement" varchar(120),
	CONSTRAINT "notification_type_check" CHECK ("notification"."type" in ('COMMENTAIRE_RECU', 'REPONSE_COMMENTAIRE', 'REPONSE_SUJET', 'REPONSE_ACCEPTEE', 'REPRODUCTION_RECUE', 'VARIANTE_PUBLIEE', 'OBSOLESCENCE_SIGNALEE', 'VOTES_UTILE_RECUS', 'BADGE_OBTENU', 'NIVEAU_ATTEINT', 'CAS_VALIDE', 'CAS_REFUSE', 'RESULTAT_DEFI', 'CONTENU_MASQUE', 'CONTENU_RETABLI', 'DECISION_MODERATION')),
	CONSTRAINT "notification_nombre_check" CHECK ("notification"."nombre_regroupe" >= 1)
);
--> statement-breakpoint
CREATE TABLE "obtention_badge" (
	"utilisateur_id" bigint NOT NULL,
	"badge_id" bigint NOT NULL,
	"date_obtention" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obtention_badge_utilisateur_id_badge_id_pk" PRIMARY KEY("utilisateur_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "preference_notification" (
	"utilisateur_id" bigint NOT NULL,
	"evenement" text NOT NULL,
	"application" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	CONSTRAINT "preference_notification_utilisateur_id_evenement_pk" PRIMARY KEY("utilisateur_id","evenement"),
	CONSTRAINT "preference_notification_evenement_check" CHECK ("preference_notification"."evenement" in ('COMMENTAIRE_RECU', 'REPONSE_COMMENTAIRE', 'REPONSE_SUJET', 'REPONSE_ACCEPTEE', 'REPRODUCTION_RECUE', 'VARIANTE_PUBLIEE', 'OBSOLESCENCE_SIGNALEE', 'VOTES_UTILE_RECUS', 'BADGE_OBTENU', 'NIVEAU_ATTEINT', 'CAS_VALIDE', 'CAS_REFUSE', 'RESULTAT_DEFI', 'CONTENU_MASQUE', 'CONTENU_RETABLI', 'DECISION_MODERATION'))
);
--> statement-breakpoint
CREATE TABLE "utilisateur" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "utilisateur_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pseudo" varchar(30) NOT NULL,
	"email" varchar(254),
	"email_verifie" boolean DEFAULT false NOT NULL,
	"empreinte_mot_de_passe" varchar(255),
	"role" text DEFAULT 'MEMBRE' NOT NULL,
	"statut_compte" text DEFAULT 'ACTIF' NOT NULL,
	"avatar" varchar(255),
	"biographie" varchar(500),
	"url_site" varchar(2048),
	"langue_interface" text DEFAULT 'FR' NOT NULL,
	"fuseau_horaire" varchar(64) DEFAULT 'Africa/Dakar' NOT NULL,
	"notifications_email" boolean DEFAULT true NOT NULL,
	"refus_mesure_audience" boolean DEFAULT false NOT NULL,
	"date_inscription" timestamp with time zone DEFAULT now() NOT NULL,
	"date_derniere_connexion" timestamp with time zone,
	CONSTRAINT "utilisateur_role_check" CHECK ("utilisateur"."role" in ('MEMBRE', 'MODERATEUR', 'ADMINISTRATEUR')),
	CONSTRAINT "utilisateur_statut_check" CHECK ("utilisateur"."statut_compte" in ('ACTIF', 'EN_SUPPRESSION', 'SUPPRIME', 'BANNI')),
	CONSTRAINT "utilisateur_langue_check" CHECK ("utilisateur"."langue_interface" in ('FR', 'EN')),
	CONSTRAINT "utilisateur_email_check" CHECK ("utilisateur"."email" is not null or "utilisateur"."statut_compte" = 'SUPPRIME')
);
--> statement-breakpoint
CREATE TABLE "contenu" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contenu_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type_contenu" text NOT NULL,
	"auteur_id" bigint NOT NULL,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	"date_modification" timestamp with time zone,
	"statut" text DEFAULT 'VISIBLE' NOT NULL,
	"nb_vues" integer DEFAULT 0 NOT NULL,
	"date_masquage_automatique" timestamp with time zone,
	CONSTRAINT "contenu_id_type_unique" UNIQUE("id","type_contenu"),
	CONSTRAINT "contenu_type_check" CHECK ("contenu"."type_contenu" in ('CREATION', 'SUJET', 'MESSAGE', 'COMMENTAIRE', 'REPRODUCTION', 'CAS_BON_REFLEXE')),
	CONSTRAINT "contenu_statut_check" CHECK ("contenu"."statut" in ('VISIBLE', 'MASQUE', 'SUPPRIME')),
	CONSTRAINT "contenu_vues_check" CHECK ("contenu"."nb_vues" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contenu_etiquette" (
	"contenu_id" bigint NOT NULL,
	"etiquette_id" bigint NOT NULL,
	CONSTRAINT "contenu_etiquette_contenu_id_etiquette_id_pk" PRIMARY KEY("contenu_id","etiquette_id")
);
--> statement-breakpoint
CREATE TABLE "enregistrement" (
	"utilisateur_id" bigint NOT NULL,
	"contenu_id" bigint NOT NULL,
	"date_enregistrement" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enregistrement_utilisateur_id_contenu_id_pk" PRIMARY KEY("utilisateur_id","contenu_id")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "media_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"televerseur_id" bigint NOT NULL,
	"contenu_id" bigint,
	"echange_id" bigint,
	"fichier" varchar(255) NOT NULL,
	"type_mime" text NOT NULL,
	"taille_octets" integer NOT NULL,
	"largeur" integer,
	"hauteur" integer,
	"variantes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"texte_alternatif" varchar(250) NOT NULL,
	"legende" varchar(300),
	"ordre" smallint DEFAULT 0 NOT NULL,
	"date_televersement" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_type_mime_check" CHECK ("media"."type_mime" in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
	CONSTRAINT "media_taille_check" CHECK ("media"."taille_octets" > 0 and "media"."taille_octets" <= 5242880),
	CONSTRAINT "media_rattachement_check" CHECK ("media"."contenu_id" is null or "media"."echange_id" is null)
);
--> statement-breakpoint
CREATE TABLE "signalement_obsolescence" (
	"utilisateur_id" bigint NOT NULL,
	"contenu_id" bigint NOT NULL,
	"modele_id" bigint NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"remarque" varchar(1000),
	CONSTRAINT "signalement_obsolescence_utilisateur_id_contenu_id_modele_id_pk" PRIMARY KEY("utilisateur_id","contenu_id","modele_id")
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"votant_id" bigint NOT NULL,
	"contenu_id" bigint NOT NULL,
	"type_vote_code" varchar(20) NOT NULL,
	"date_vote" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vote_votant_id_contenu_id_type_vote_code_pk" PRIMARY KEY("votant_id","contenu_id","type_vote_code")
);
--> statement-breakpoint
CREATE TABLE "commentaire" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'COMMENTAIRE' NOT NULL,
	"creation_id" bigint NOT NULL,
	"parent_id" bigint,
	"etape_id" bigint,
	"echange_id" bigint,
	"corps" text NOT NULL,
	CONSTRAINT "commentaire_type_contenu_check" CHECK ("commentaire"."type_contenu" = 'COMMENTAIRE'),
	CONSTRAINT "commentaire_ancrage_check" CHECK ("commentaire"."etape_id" is null or "commentaire"."echange_id" is null),
	CONSTRAINT "commentaire_parent_check" CHECK ("commentaire"."parent_id" is null or "commentaire"."parent_id" <> "commentaire"."id")
);
--> statement-breakpoint
CREATE TABLE "configuration_ia" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "configuration_ia_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"etape_id" bigint NOT NULL,
	"ordre" smallint DEFAULT 0 NOT NULL,
	"outil_id" bigint,
	"modele_id" bigint,
	"modele_non_reference" varchar(100),
	"parametres" text,
	"contexte_cache" text,
	CONSTRAINT "configuration_ia_modele_check" CHECK ("configuration_ia"."modele_id" is null or "configuration_ia"."modele_non_reference" is null)
);
--> statement-breakpoint
CREATE TABLE "creation" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'CREATION' NOT NULL,
	"type_creation" text NOT NULL,
	"titre" varchar(120),
	"slug" varchar(140),
	"objectif" text,
	"limites" text,
	"statut_publication" text DEFAULT 'BROUILLON' NOT NULL,
	"date_publication" timestamp with time zone,
	"date_confirmation_donnees" timestamp with time zone,
	"avertissement_agent" text DEFAULT 'AUCUN' NOT NULL,
	"categorie_id" bigint,
	"licence_id" bigint NOT NULL,
	"source_id" bigint,
	"defi_id" bigint,
	"rang_final_participation" smallint,
	CONSTRAINT "creation_type_contenu_check" CHECK ("creation"."type_contenu" = 'CREATION'),
	CONSTRAINT "creation_type_check" CHECK ("creation"."type_creation" in ('UN_PROMPT', 'ITERATION', 'PROJET')),
	CONSTRAINT "creation_statut_publication_check" CHECK ("creation"."statut_publication" in ('BROUILLON', 'PUBLIEE')),
	CONSTRAINT "creation_avertissement_agent_check" CHECK ("creation"."avertissement_agent" in ('AUCUN', 'AUTEUR', 'MODERATION')),
	CONSTRAINT "creation_publiee_complete_check" CHECK ("creation"."statut_publication" = 'BROUILLON' or ("creation"."titre" is not null and "creation"."objectif" is not null and "creation"."categorie_id" is not null and "creation"."date_publication" is not null)),
	CONSTRAINT "creation_source_check" CHECK ("creation"."source_id" is null or "creation"."source_id" <> "creation"."id"),
	CONSTRAINT "creation_rang_check" CHECK ("creation"."rang_final_participation" is null or "creation"."defi_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "defi" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "defi_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organisateur_id" bigint NOT NULL,
	"titre" varchar(150) NOT NULL,
	"slug" varchar(170) NOT NULL,
	"enonce" text NOT NULL,
	"contraintes" text,
	"date_debut" timestamp with time zone NOT NULL,
	"date_fin" timestamp with time zone NOT NULL,
	"statut" text DEFAULT 'BROUILLON' NOT NULL,
	CONSTRAINT "defi_statut_check" CHECK ("defi"."statut" in ('BROUILLON', 'PUBLIE', 'CLOTURE', 'ANNULE')),
	CONSTRAINT "defi_duree_check" CHECK ("defi"."date_fin" - "defi"."date_debut" between interval '1 day' and interval '30 days')
);
--> statement-breakpoint
CREATE TABLE "echange" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "echange_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"etape_id" bigint NOT NULL,
	"configuration_id" bigint,
	"ordre" smallint NOT NULL,
	"prompt" text,
	"reponse" text,
	"nb_essais" smallint DEFAULT 1 NOT NULL,
	"mode_selection" text DEFAULT 'PREMIER_ESSAI' NOT NULL,
	CONSTRAINT "echange_mode_selection_check" CHECK ("echange"."mode_selection" in ('PREMIER_ESSAI', 'MEILLEUR_ESSAI')),
	CONSTRAINT "echange_essais_check" CHECK ("echange"."nb_essais" >= 1),
	CONSTRAINT "echange_selection_check" CHECK ("echange"."nb_essais" > 1 or "echange"."mode_selection" = 'PREMIER_ESSAI')
);
--> statement-breakpoint
CREATE TABLE "etape" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "etape_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"creation_id" bigint NOT NULL,
	"ordre" smallint NOT NULL,
	"titre" varchar(100),
	"recit" text
);
--> statement-breakpoint
CREATE TABLE "lien_externe" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lien_externe_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"creation_id" bigint NOT NULL,
	"type" text NOT NULL,
	"url" varchar(2048) NOT NULL,
	"libelle" varchar(100),
	"ordre" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "lien_externe_type_check" CHECK ("lien_externe"."type" in ('DEMO', 'DEPOT_CODE', 'VIDEO', 'PREUVE', 'ARTICLE', 'AUTRE')),
	CONSTRAINT "lien_externe_https_check" CHECK ("lien_externe"."url" like 'https://%')
);
--> statement-breakpoint
CREATE TABLE "moment_cle" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "moment_cle_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"etape_id" bigint NOT NULL,
	"echange_id" bigint,
	"type" text NOT NULL,
	"explication" text,
	CONSTRAINT "moment_cle_type_check" CHECK ("moment_cle"."type" in ('CORRECTION', 'REFUS', 'ECHEC', 'CHANGEMENT_OUTIL', 'VERIFICATION', 'DECOUVERTE'))
);
--> statement-breakpoint
CREATE TABLE "reproduction" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'REPRODUCTION' NOT NULL,
	"creation_id" bigint NOT NULL,
	"outil_id" bigint NOT NULL,
	"modele_id" bigint,
	"modele_non_reference" varchar(100),
	"resultat" text NOT NULL,
	"retour" text,
	"reponse_obtenue" text,
	CONSTRAINT "reproduction_type_contenu_check" CHECK ("reproduction"."type_contenu" = 'REPRODUCTION'),
	CONSTRAINT "reproduction_resultat_check" CHECK ("reproduction"."resultat" in ('SUCCES', 'PARTIEL', 'ECHEC')),
	CONSTRAINT "reproduction_modele_check" CHECK ("reproduction"."modele_id" is null or "reproduction"."modele_non_reference" is null),
	CONSTRAINT "reproduction_retour_check" CHECK ("reproduction"."resultat" = 'SUCCES' or char_length(coalesce("reproduction"."retour", '')) >= 20)
);
--> statement-breakpoint
CREATE TABLE "cas_bon_reflexe" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'CAS_BON_REFLEXE' NOT NULL,
	"titre" varchar(150) NOT NULL,
	"slug" varchar(170) NOT NULL,
	"contexte" text NOT NULL,
	"demande_ia" text NOT NULL,
	"reponse_ia" text NOT NULL,
	"question" varchar(300) NOT NULL,
	"explication" text NOT NULL,
	"difficulte" text NOT NULL,
	"statut_validation" text DEFAULT 'PROPOSE' NOT NULL,
	"motif_refus" text,
	"examinateur_id" bigint,
	"date_examen" timestamp with time zone,
	CONSTRAINT "cas_bon_reflexe_type_contenu_check" CHECK ("cas_bon_reflexe"."type_contenu" = 'CAS_BON_REFLEXE'),
	CONSTRAINT "cas_bon_reflexe_difficulte_check" CHECK ("cas_bon_reflexe"."difficulte" in ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE')),
	CONSTRAINT "cas_bon_reflexe_statut_check" CHECK ("cas_bon_reflexe"."statut_validation" in ('PROPOSE', 'VALIDE', 'REFUSE')),
	CONSTRAINT "cas_bon_reflexe_examen_check" CHECK (("cas_bon_reflexe"."statut_validation" = 'PROPOSE') = ("cas_bon_reflexe"."date_examen" is null)),
	CONSTRAINT "cas_bon_reflexe_refus_check" CHECK ("cas_bon_reflexe"."statut_validation" <> 'REFUSE' or "cas_bon_reflexe"."motif_refus" is not null)
);
--> statement-breakpoint
CREATE TABLE "choix_option" (
	"utilisateur_id" bigint NOT NULL,
	"cas_id" bigint NOT NULL,
	"option_id" bigint NOT NULL,
	"date_choix" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "choix_option_utilisateur_id_cas_id_pk" PRIMARY KEY("utilisateur_id","cas_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'MESSAGE' NOT NULL,
	"sujet_id" bigint NOT NULL,
	"corps" text NOT NULL,
	CONSTRAINT "message_type_contenu_check" CHECK ("message"."type_contenu" = 'MESSAGE')
);
--> statement-breakpoint
CREATE TABLE "option_reponse" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "option_reponse_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"cas_id" bigint NOT NULL,
	"ordre" smallint NOT NULL,
	"libelle" varchar(500) NOT NULL,
	"est_correcte" boolean DEFAULT false NOT NULL,
	"explication" text NOT NULL,
	CONSTRAINT "option_reponse_id_cas_unique" UNIQUE("id","cas_id")
);
--> statement-breakpoint
CREATE TABLE "sujet" (
	"id" bigint PRIMARY KEY NOT NULL,
	"type_contenu" text DEFAULT 'SUJET' NOT NULL,
	"type_sujet" text NOT NULL,
	"titre" varchar(150) NOT NULL,
	"slug" varchar(170) NOT NULL,
	"corps" text NOT NULL,
	"exemple_avant" text,
	"exemple_apres" text,
	"creation_id" bigint,
	"message_accepte_id" bigint,
	"date_acceptation_reponse" timestamp with time zone,
	"fermeur_id" bigint,
	"date_fermeture" timestamp with time zone,
	CONSTRAINT "sujet_type_contenu_check" CHECK ("sujet"."type_contenu" = 'SUJET'),
	CONSTRAINT "sujet_type_check" CHECK ("sujet"."type_sujet" in ('QUESTION', 'CLINIQUE', 'ASTUCE', 'RETOUR_EXPERIENCE', 'DISCUSSION')),
	CONSTRAINT "sujet_astuce_check" CHECK ("sujet"."type_sujet" <> 'ASTUCE' or ("sujet"."exemple_avant" is not null and "sujet"."exemple_apres" is not null)),
	CONSTRAINT "sujet_acceptation_type_check" CHECK ("sujet"."message_accepte_id" is null or "sujet"."type_sujet" in ('QUESTION', 'CLINIQUE')),
	CONSTRAINT "sujet_acceptation_date_check" CHECK (("sujet"."message_accepte_id" is null) = ("sujet"."date_acceptation_reponse" is null)),
	CONSTRAINT "sujet_fermeture_check" CHECK ("sujet"."fermeur_id" is null or "sujet"."date_fermeture" is not null)
);
--> statement-breakpoint
CREATE TABLE "decision_moderation" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "decision_moderation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"decideur_id" bigint NOT NULL,
	"contenu_id" bigint,
	"membre_vise_id" bigint,
	"action" text NOT NULL,
	"motif" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"date_fin_suspension" timestamp with time zone,
	"badge_id" bigint,
	CONSTRAINT "decision_moderation_action_check" CHECK ("decision_moderation"."action" in ('AUCUNE', 'MASQUER', 'RETABLIR', 'SUPPRIMER', 'AVERTIR', 'SUSPENDRE', 'AJOUTER_AVERTISSEMENT_AGENT', 'RETIRER_AVERTISSEMENT_AGENT', 'BANNIR', 'AJUSTER_REPUTATION', 'RETIRER_BADGE')),
	CONSTRAINT "decision_moderation_motif_check" CHECK (char_length("decision_moderation"."motif") > 0),
	CONSTRAINT "decision_moderation_cible_check" CHECK (("decision_moderation"."action" not in ('AUCUNE', 'MASQUER', 'RETABLIR', 'SUPPRIMER', 'AJOUTER_AVERTISSEMENT_AGENT', 'RETIRER_AVERTISSEMENT_AGENT') or "decision_moderation"."contenu_id" is not null) and ("decision_moderation"."action" not in ('AVERTIR', 'SUSPENDRE', 'BANNIR', 'AJUSTER_REPUTATION', 'RETIRER_BADGE') or "decision_moderation"."membre_vise_id" is not null)),
	CONSTRAINT "decision_moderation_suspension_check" CHECK (("decision_moderation"."action" = 'SUSPENDRE') = ("decision_moderation"."date_fin_suspension" is not null) and ("decision_moderation"."date_fin_suspension" is null or "decision_moderation"."date_fin_suspension" - "decision_moderation"."date" between interval '1 day' and interval '90 days')),
	CONSTRAINT "decision_moderation_badge_check" CHECK (("decision_moderation"."action" = 'RETIRER_BADGE') = ("decision_moderation"."badge_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "signalement" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "signalement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"signaleur_id" bigint NOT NULL,
	"contenu_id" bigint NOT NULL,
	"motif" text NOT NULL,
	"precision" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"statut" text DEFAULT 'OUVERT' NOT NULL,
	"decision_id" bigint,
	CONSTRAINT "signalement_motif_check" CHECK ("signalement"."motif" in ('SPAM', 'ILLICITE', 'DANGEREUX', 'DONNEES_PERSONNELLES', 'PLAGIAT', 'HARCELEMENT', 'HORS_SUJET', 'AUTRE')),
	CONSTRAINT "signalement_statut_check" CHECK ("signalement"."statut" in ('OUVERT', 'FONDE', 'NON_FONDE')),
	CONSTRAINT "signalement_resolution_check" CHECK (("signalement"."statut" = 'OUVERT') = ("signalement"."decision_id" is null)),
	CONSTRAINT "signalement_precision_check" CHECK ("signalement"."motif" <> 'AUTRE' or "signalement"."precision" is not null)
);
--> statement-breakpoint
CREATE TABLE "double_authentification" (
	"utilisateur_id" bigint PRIMARY KEY NOT NULL,
	"secret_chiffre" text NOT NULL,
	"date_activation" timestamp with time zone,
	"codes_secours" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jeton" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "jeton_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"utilisateur_id" bigint NOT NULL,
	"type" text NOT NULL,
	"empreinte" varchar(64) NOT NULL,
	"email_cible" varchar(254),
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	"date_expiration" timestamp with time zone NOT NULL,
	"date_utilisation" timestamp with time zone,
	CONSTRAINT "jeton_empreinte_unique" UNIQUE("empreinte"),
	CONSTRAINT "jeton_type_check" CHECK ("jeton"."type" in ('VERIFICATION_EMAIL', 'REINITIALISATION_MOT_DE_PASSE', 'CHANGEMENT_EMAIL', 'CONFIRMATION_SUPPRESSION'))
);
--> statement-breakpoint
CREATE TABLE "journal_audit" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "journal_audit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"acteur_id" bigint,
	"action" varchar(60) NOT NULL,
	"cible_type" varchar(40),
	"cible_id" bigint,
	"details" jsonb,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"empreinte_ip" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "message_contact" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"reference" varchar(20) NOT NULL,
	"motif" text NOT NULL,
	"nom" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL,
	"contenu" varchar(2048),
	"message" text NOT NULL,
	"bonne_foi" boolean DEFAULT false NOT NULL,
	"utilisateur_id" bigint,
	"empreinte_ip" varchar(64),
	"statut" text DEFAULT 'NOUVEAU' NOT NULL,
	"date_envoi" timestamp with time zone DEFAULT now() NOT NULL,
	"date_traitement" timestamp with time zone,
	CONSTRAINT "message_contact_reference_unique" UNIQUE("reference"),
	CONSTRAINT "message_contact_motif_check" CHECK ("message_contact"."motif" in ('QUESTION', 'DONNEES', 'SIGNALEMENT', 'CONTESTATION', 'AUTRE')),
	CONSTRAINT "message_contact_statut_check" CHECK ("message_contact"."statut" in ('NOUVEAU', 'EN_COURS', 'TRAITE'))
);
--> statement-breakpoint
CREATE TABLE "recherche_document" (
	"contenu_id" bigint PRIMARY KEY NOT NULL,
	"vecteur" "tsvector" NOT NULL,
	"date_mise_a_jour" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"utilisateur_id" bigint NOT NULL,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	"date_expiration" timestamp with time zone NOT NULL,
	"date_derniere_activite" timestamp with time zone DEFAULT now() NOT NULL,
	"appareil" varchar(120),
	"lieu" varchar(120),
	"empreinte_ip" varchar(64),
	"deux_facteurs_valide" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentative_connexion" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tentative_connexion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"utilisateur_id" bigint,
	"empreinte_ip" varchar(64),
	"reussie" boolean NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vue_contenu" (
	"contenu_id" bigint NOT NULL,
	"empreinte_visiteur" varchar(64) NOT NULL,
	"jour" date NOT NULL,
	CONSTRAINT "vue_contenu_contenu_id_empreinte_visiteur_jour_pk" PRIMARY KEY("contenu_id","empreinte_visiteur","jour")
);
--> statement-breakpoint
ALTER TABLE "modele" ADD CONSTRAINT "modele_editeur_id_editeur_id_fk" FOREIGN KEY ("editeur_id") REFERENCES "public"."editeur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outil" ADD CONSTRAINT "outil_editeur_id_editeur_id_fk" FOREIGN KEY ("editeur_id") REFERENCES "public"."editeur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outil_modele" ADD CONSTRAINT "outil_modele_outil_id_outil_id_fk" FOREIGN KEY ("outil_id") REFERENCES "public"."outil"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outil_modele" ADD CONSTRAINT "outil_modele_modele_id_modele_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptation_document" ADD CONSTRAINT "acceptation_document_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptation_document" ADD CONSTRAINT "acceptation_document_document_legal_id_document_legal_id_fk" FOREIGN KEY ("document_legal_id") REFERENCES "public"."document_legal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compte_externe" ADD CONSTRAINT "compte_externe_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demande_droit" ADD CONSTRAINT "demande_droit_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_createur_id_utilisateur_id_fk" FOREIGN KEY ("createur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvement_reputation" ADD CONSTRAINT "mouvement_reputation_beneficiaire_id_utilisateur_id_fk" FOREIGN KEY ("beneficiaire_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvement_reputation" ADD CONSTRAINT "mouvement_reputation_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvement_reputation" ADD CONSTRAINT "mouvement_reputation_decision_id_decision_moderation_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision_moderation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvement_reputation" ADD CONSTRAINT "mouvement_reputation_acteur_id_utilisateur_id_fk" FOREIGN KEY ("acteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mouvement_reputation" ADD CONSTRAINT "mouvement_reputation_mouvement_annule_id_mouvement_reputation_id_fk" FOREIGN KEY ("mouvement_annule_id") REFERENCES "public"."mouvement_reputation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_destinataire_id_utilisateur_id_fk" FOREIGN KEY ("destinataire_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_declencheur_id_utilisateur_id_fk" FOREIGN KEY ("declencheur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obtention_badge" ADD CONSTRAINT "obtention_badge_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obtention_badge" ADD CONSTRAINT "obtention_badge_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_notification" ADD CONSTRAINT "preference_notification_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contenu" ADD CONSTRAINT "contenu_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contenu_etiquette" ADD CONSTRAINT "contenu_etiquette_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contenu_etiquette" ADD CONSTRAINT "contenu_etiquette_etiquette_id_etiquette_id_fk" FOREIGN KEY ("etiquette_id") REFERENCES "public"."etiquette"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enregistrement" ADD CONSTRAINT "enregistrement_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enregistrement" ADD CONSTRAINT "enregistrement_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_televerseur_id_utilisateur_id_fk" FOREIGN KEY ("televerseur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_echange_id_echange_id_fk" FOREIGN KEY ("echange_id") REFERENCES "public"."echange"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement_obsolescence" ADD CONSTRAINT "signalement_obsolescence_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement_obsolescence" ADD CONSTRAINT "signalement_obsolescence_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement_obsolescence" ADD CONSTRAINT "signalement_obsolescence_modele_id_modele_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_votant_id_utilisateur_id_fk" FOREIGN KEY ("votant_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_type_vote_code_type_vote_code_fk" FOREIGN KEY ("type_vote_code") REFERENCES "public"."type_vote"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_parent_id_commentaire_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."commentaire"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_etape_id_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."etape"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_echange_id_echange_id_fk" FOREIGN KEY ("echange_id") REFERENCES "public"."echange"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_ia" ADD CONSTRAINT "configuration_ia_etape_id_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."etape"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_ia" ADD CONSTRAINT "configuration_ia_outil_id_outil_id_fk" FOREIGN KEY ("outil_id") REFERENCES "public"."outil"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_ia" ADD CONSTRAINT "configuration_ia_modele_id_modele_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_categorie_id_categorie_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categorie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_licence_id_licence_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."licence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_source_id_creation_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."creation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_defi_id_defi_id_fk" FOREIGN KEY ("defi_id") REFERENCES "public"."defi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creation" ADD CONSTRAINT "creation_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defi" ADD CONSTRAINT "defi_organisateur_id_utilisateur_id_fk" FOREIGN KEY ("organisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "echange" ADD CONSTRAINT "echange_etape_id_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."etape"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "echange" ADD CONSTRAINT "echange_configuration_id_configuration_ia_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."configuration_ia"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etape" ADD CONSTRAINT "etape_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lien_externe" ADD CONSTRAINT "lien_externe_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_cle" ADD CONSTRAINT "moment_cle_etape_id_etape_id_fk" FOREIGN KEY ("etape_id") REFERENCES "public"."etape"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_cle" ADD CONSTRAINT "moment_cle_echange_id_echange_id_fk" FOREIGN KEY ("echange_id") REFERENCES "public"."echange"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduction" ADD CONSTRAINT "reproduction_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduction" ADD CONSTRAINT "reproduction_outil_id_outil_id_fk" FOREIGN KEY ("outil_id") REFERENCES "public"."outil"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduction" ADD CONSTRAINT "reproduction_modele_id_modele_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduction" ADD CONSTRAINT "reproduction_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_examinateur_id_utilisateur_id_fk" FOREIGN KEY ("examinateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cas_bon_reflexe" ADD CONSTRAINT "cas_bon_reflexe_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choix_option" ADD CONSTRAINT "choix_option_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choix_option" ADD CONSTRAINT "choix_option_option_fk" FOREIGN KEY ("option_id","cas_id") REFERENCES "public"."option_reponse"("id","cas_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sujet_id_sujet_id_fk" FOREIGN KEY ("sujet_id") REFERENCES "public"."sujet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_reponse" ADD CONSTRAINT "option_reponse_cas_id_cas_bon_reflexe_id_fk" FOREIGN KEY ("cas_id") REFERENCES "public"."cas_bon_reflexe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_creation_id_creation_id_fk" FOREIGN KEY ("creation_id") REFERENCES "public"."creation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_message_accepte_id_message_id_fk" FOREIGN KEY ("message_accepte_id") REFERENCES "public"."message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_fermeur_id_utilisateur_id_fk" FOREIGN KEY ("fermeur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_contenu_fk" FOREIGN KEY ("id","type_contenu") REFERENCES "public"."contenu"("id","type_contenu") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_moderation" ADD CONSTRAINT "decision_moderation_decideur_id_utilisateur_id_fk" FOREIGN KEY ("decideur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_moderation" ADD CONSTRAINT "decision_moderation_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_moderation" ADD CONSTRAINT "decision_moderation_membre_vise_id_utilisateur_id_fk" FOREIGN KEY ("membre_vise_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_moderation" ADD CONSTRAINT "decision_moderation_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_signaleur_id_utilisateur_id_fk" FOREIGN KEY ("signaleur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_decision_id_decision_moderation_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision_moderation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "double_authentification" ADD CONSTRAINT "double_authentification_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeton" ADD CONSTRAINT "jeton_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_acteur_id_utilisateur_id_fk" FOREIGN KEY ("acteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_contact" ADD CONSTRAINT "message_contact_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recherche_document" ADD CONSTRAINT "recherche_document_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentative_connexion" ADD CONSTRAINT "tentative_connexion_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vue_contenu" ADD CONSTRAINT "vue_contenu_contenu_id_contenu_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_legal_type_version_unique" ON "document_legal" USING btree ("type","version");--> statement-breakpoint
CREATE UNIQUE INDEX "etiquette_libelle_unique" ON "etiquette" USING btree (lower("libelle"));--> statement-breakpoint
CREATE UNIQUE INDEX "licence_par_defaut_unique" ON "licence" USING btree ("est_par_defaut") WHERE "licence"."est_par_defaut";--> statement-breakpoint
CREATE UNIQUE INDEX "modele_editeur_nom_unique" ON "modele" USING btree ("editeur_id","nom");--> statement-breakpoint
CREATE INDEX "outil_editeur_idx" ON "outil" USING btree ("editeur_id");--> statement-breakpoint
CREATE INDEX "outil_modele_modele_idx" ON "outil_modele" USING btree ("modele_id");--> statement-breakpoint
CREATE UNIQUE INDEX "compte_externe_fournisseur_unique" ON "compte_externe" USING btree ("fournisseur","identifiant_fournisseur");--> statement-breakpoint
CREATE UNIQUE INDEX "compte_externe_utilisateur_unique" ON "compte_externe" USING btree ("utilisateur_id","fournisseur");--> statement-breakpoint
CREATE UNIQUE INDEX "demande_droit_en_cours_unique" ON "demande_droit" USING btree ("utilisateur_id","type") WHERE "demande_droit"."statut" = 'EN_COURS';--> statement-breakpoint
CREATE INDEX "invitation_createur_idx" ON "invitation" USING btree ("createur_id");--> statement-breakpoint
CREATE INDEX "mouvement_reputation_beneficiaire_date_idx" ON "mouvement_reputation" USING btree ("beneficiaire_id","date");--> statement-breakpoint
CREATE INDEX "mouvement_reputation_date_idx" ON "mouvement_reputation" USING btree ("date");--> statement-breakpoint
CREATE INDEX "mouvement_reputation_contenu_idx" ON "mouvement_reputation" USING btree ("contenu_id");--> statement-breakpoint
CREATE INDEX "notification_destinataire_idx" ON "notification" USING btree ("destinataire_id","est_lue","date");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_regroupement_unique" ON "notification" USING btree ("destinataire_id","cle_regroupement") WHERE "notification"."cle_regroupement" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "utilisateur_pseudo_unique" ON "utilisateur" USING btree (lower("pseudo"));--> statement-breakpoint
CREATE UNIQUE INDEX "utilisateur_email_unique" ON "utilisateur" USING btree (lower("email")) WHERE "utilisateur"."email" is not null;--> statement-breakpoint
CREATE INDEX "contenu_auteur_idx" ON "contenu" USING btree ("auteur_id","type_contenu");--> statement-breakpoint
CREATE INDEX "contenu_etiquette_etiquette_idx" ON "contenu_etiquette" USING btree ("etiquette_id");--> statement-breakpoint
CREATE INDEX "enregistrement_utilisateur_date_idx" ON "enregistrement" USING btree ("utilisateur_id","date_enregistrement");--> statement-breakpoint
CREATE INDEX "media_contenu_idx" ON "media" USING btree ("contenu_id");--> statement-breakpoint
CREATE INDEX "media_echange_idx" ON "media" USING btree ("echange_id");--> statement-breakpoint
CREATE INDEX "signalement_obsolescence_contenu_modele_idx" ON "signalement_obsolescence" USING btree ("contenu_id","modele_id");--> statement-breakpoint
CREATE INDEX "vote_contenu_type_date_idx" ON "vote" USING btree ("contenu_id","type_vote_code","date_vote");--> statement-breakpoint
CREATE INDEX "commentaire_creation_idx" ON "commentaire" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX "commentaire_parent_idx" ON "commentaire" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "configuration_ia_etape_idx" ON "configuration_ia" USING btree ("etape_id");--> statement-breakpoint
CREATE INDEX "configuration_ia_outil_idx" ON "configuration_ia" USING btree ("outil_id");--> statement-breakpoint
CREATE INDEX "configuration_ia_modele_idx" ON "configuration_ia" USING btree ("modele_id");--> statement-breakpoint
CREATE INDEX "creation_publication_idx" ON "creation" USING btree ("statut_publication","date_publication");--> statement-breakpoint
CREATE INDEX "creation_categorie_idx" ON "creation" USING btree ("categorie_id");--> statement-breakpoint
CREATE INDEX "creation_source_idx" ON "creation" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "creation_defi_idx" ON "creation" USING btree ("defi_id");--> statement-breakpoint
CREATE INDEX "defi_statut_dates_idx" ON "defi" USING btree ("statut","date_debut","date_fin");--> statement-breakpoint
CREATE INDEX "echange_etape_idx" ON "echange" USING btree ("etape_id");--> statement-breakpoint
CREATE INDEX "etape_creation_idx" ON "etape" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX "lien_externe_creation_idx" ON "lien_externe" USING btree ("creation_id");--> statement-breakpoint
CREATE INDEX "moment_cle_etape_idx" ON "moment_cle" USING btree ("etape_id");--> statement-breakpoint
CREATE UNIQUE INDEX "moment_cle_echange_unique" ON "moment_cle" USING btree ("echange_id") WHERE "moment_cle"."echange_id" is not null;--> statement-breakpoint
CREATE INDEX "reproduction_creation_idx" ON "reproduction" USING btree ("creation_id","resultat");--> statement-breakpoint
CREATE INDEX "cas_bon_reflexe_statut_idx" ON "cas_bon_reflexe" USING btree ("statut_validation");--> statement-breakpoint
CREATE INDEX "choix_option_option_idx" ON "choix_option" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "message_sujet_idx" ON "message" USING btree ("sujet_id");--> statement-breakpoint
CREATE INDEX "option_reponse_cas_idx" ON "option_reponse" USING btree ("cas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "option_reponse_correcte_unique" ON "option_reponse" USING btree ("cas_id") WHERE "option_reponse"."est_correcte";--> statement-breakpoint
CREATE INDEX "sujet_type_idx" ON "sujet" USING btree ("type_sujet");--> statement-breakpoint
CREATE INDEX "sujet_creation_idx" ON "sujet" USING btree ("creation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sujet_message_accepte_unique" ON "sujet" USING btree ("message_accepte_id") WHERE "sujet"."message_accepte_id" is not null;--> statement-breakpoint
CREATE INDEX "decision_moderation_contenu_idx" ON "decision_moderation" USING btree ("contenu_id");--> statement-breakpoint
CREATE INDEX "decision_moderation_membre_idx" ON "decision_moderation" USING btree ("membre_vise_id","action");--> statement-breakpoint
CREATE INDEX "decision_moderation_decideur_idx" ON "decision_moderation" USING btree ("decideur_id","date");--> statement-breakpoint
CREATE INDEX "decision_moderation_date_idx" ON "decision_moderation" USING btree ("date");--> statement-breakpoint
CREATE INDEX "signalement_file_idx" ON "signalement" USING btree ("statut","date");--> statement-breakpoint
CREATE INDEX "signalement_contenu_idx" ON "signalement" USING btree ("contenu_id","statut");--> statement-breakpoint
CREATE UNIQUE INDEX "signalement_ouvert_unique" ON "signalement" USING btree ("signaleur_id","contenu_id") WHERE "signalement"."statut" = 'OUVERT';--> statement-breakpoint
CREATE INDEX "jeton_utilisateur_type_idx" ON "jeton" USING btree ("utilisateur_id","type");--> statement-breakpoint
CREATE INDEX "journal_audit_date_idx" ON "journal_audit" USING btree ("date");--> statement-breakpoint
CREATE INDEX "journal_audit_acteur_idx" ON "journal_audit" USING btree ("acteur_id","date");--> statement-breakpoint
CREATE INDEX "journal_audit_cible_idx" ON "journal_audit" USING btree ("cible_type","cible_id");--> statement-breakpoint
CREATE INDEX "message_contact_statut_idx" ON "message_contact" USING btree ("statut","date_envoi");--> statement-breakpoint
CREATE INDEX "recherche_document_vecteur_idx" ON "recherche_document" USING gin ("vecteur");--> statement-breakpoint
CREATE INDEX "session_utilisateur_idx" ON "session" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE INDEX "session_expiration_idx" ON "session" USING btree ("date_expiration");--> statement-breakpoint
CREATE INDEX "tentative_connexion_utilisateur_idx" ON "tentative_connexion" USING btree ("utilisateur_id","date");--> statement-breakpoint
CREATE INDEX "tentative_connexion_ip_idx" ON "tentative_connexion" USING btree ("empreinte_ip","date");