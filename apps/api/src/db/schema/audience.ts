import { APPAREILS, MESURES_AUDIENCE, NATURES_ETAPE, NAVIGATEURS, SYSTEMES } from '@vysora/shared';
import { date, index, integer, pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';
import { horodatage, valeursPermises } from './_outils.js';

/* LEG-03 : mesure d'audience de l'équipe, hors MCD (données techniques, ENF-12). Aucune adresse IP,
   aucun nom de navigateur complet, aucun lien avec un compte : seulement des compteurs par jour, des
   empreintes du jour effacées le surlendemain et, pour les personnes qui l'ont accepté, les étapes de
   leurs visites, désignées par un identifiant tiré au hasard. */

/** Compteurs anonymes par jour, mesure et valeur (page, domaine, catégorie d'appareil, route…) ;
    conservés DELAIS.conservationAudienceMois mois. `detail` précise une valeur (message d'une erreur
    de script pour sa page), vide sinon. */
export const audienceCompteur = pgTable(
  'audience_compteur',
  {
    jour: date({ mode: 'string' }).notNull(),
    mesure: varchar({ length: 20 }).notNull(),
    valeur: varchar({ length: 160 }).notNull(),
    detail: varchar({ length: 160 }).notNull().default(''),
    nombre: integer().notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.jour, t.mesure, t.valeur, t.detail] }),
    valeursPermises('audience_compteur_mesure_check', t.mesure, MESURES_AUDIENCE),
  ],
);

/** Visiteurs déjà comptés aujourd'hui : empreinte salée du jour (adresse IP et navigateur), qui ne
    permet ni de retrouver la personne ni de la suivre d'un jour à l'autre ; effacée après
    DELAIS.conservationVisiteursJours jours. */
export const audienceVisiteur = pgTable(
  'audience_visiteur',
  {
    jour: date({ mode: 'string' }).notNull(),
    empreinte: varchar({ length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.jour, t.empreinte] })],
);

/** Visite suivie, avec l'accord de la personne : identifiant de son cookie de visite, provenance et
    catégories d'appareil ; effacée avec ses étapes DELAIS.conservationParcoursMois mois après. */
export const parcoursVisite = pgTable(
  'parcours_visite',
  {
    id: uuid().primaryKey(),
    debut: horodatage().notNull().defaultNow(),
    derniere: horodatage().notNull().defaultNow(),
    provenance: varchar({ length: 100 }).notNull(),
    appareil: varchar({ length: 12 }).notNull(),
    navigateur: varchar({ length: 12 }).notNull(),
    systeme: varchar({ length: 12 }).notNull(),
    nbEtapes: integer().notNull().default(0),
    nbPages: integer().notNull().default(0),
    nbErreurs: integer().notNull().default(0),
  },
  (t) => [
    index('parcours_visite_debut_idx').on(t.debut),
    valeursPermises('parcours_visite_appareil_check', t.appareil, APPAREILS),
    valeursPermises('parcours_visite_navigateur_check', t.navigateur, NAVIGATEURS),
    valeursPermises('parcours_visite_systeme_check', t.systeme, SYSTEMES),
  ],
);

/** Étapes d'une visite suivie, dans l'ordre : page servie, action réussie ou erreur rencontrée. */
export const parcoursEtape = pgTable(
  'parcours_etape',
  {
    visiteId: uuid()
      .notNull()
      .references(() => parcoursVisite.id, { onDelete: 'cascade' }),
    rang: integer().notNull(),
    date: horodatage().notNull().defaultNow(),
    nature: varchar({ length: 10 }).notNull(),
    valeur: varchar({ length: 160 }).notNull(),
    detail: varchar({ length: 160 }).notNull().default(''),
  },
  (t) => [
    primaryKey({ columns: [t.visiteId, t.rang] }),
    valeursPermises('parcours_etape_nature_check', t.nature, NATURES_ETAPE),
  ],
);
