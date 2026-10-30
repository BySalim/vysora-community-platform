import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  BAREME_REPUTATION,
  slugifier,
  type MotifMouvementReputation,
  type ResultatReproduction,
  type Role,
  type TypeContenu,
} from '@vysora/shared';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { indexerCas } from '../../modules/apprentissage/contenu-cas.js';
import { DocumentsLegauxService } from '../../modules/auth/documents-legaux.service.js';
import { hacherMotDePasse } from '../../modules/auth/mots-de-passe.service.js';
import { indexer as indexerCreation } from '../../modules/creations/contenu-creation.js';
import { indexerSujet } from '../../modules/forum/contenu-sujet.js';
import { enregistrerImage } from '../../modules/medias/medias.service.js';
import { ecrireDeclinaisons, type Stockage } from '../../modules/medias/stockage.js';
import {
  preparerAvatar,
  preparerImage,
  type ImagePreparee,
} from '../../modules/medias/traitement-images.js';
import type { BaseDeDonnees, Transaction } from '../client.js';
import {
  badge,
  casBonReflexe,
  categorie,
  choixOption,
  commentaire,
  configurationIa,
  contenu,
  contenuEtiquette,
  creation,
  defi,
  demandeGuide,
  echange,
  enregistrement,
  etape,
  etiquette,
  guide,
  guideContenu,
  guideEtape,
  guideEtapeSource,
  guidePiege,
  guidePiegeSource,
  licence,
  lienExterne,
  media,
  message,
  modele,
  momentCle,
  mouvementReputation,
  obtentionBadge,
  optionReponse,
  outil,
  outilModele,
  rechercheDocument,
  reproduction,
  signalementObsolescence,
  soutienDemande,
  sujet,
  utilisateur,
  vote,
} from '../schema/index.js';
import { CAS } from './donnees/bon-reflexe.js';
import { CREATIONS, RETOURS_REPRODUCTION } from './donnees/creations.js';
import { DEFIS } from './donnees/defis.js';
import { SUJETS } from './donnees/forum.js';
import { DEMANDES, GUIDES } from './donnees/guides.js';
import { ENREGISTREMENTS, MEMBRES } from './donnees/membres.js';
import { MOT_DE_PASSE_DEMO } from './identifiants.js';
import type {
  CasDemo,
  ConfigurationDemo,
  CreationDemo,
  GuideDemo,
  ImageDemo,
  SujetDemo,
} from './types.js';

/* DEMO-01 : données de démonstration tirées du prototype, pour le développement et la préproduction.
   - Jamais en production : refus si NODE_ENV vaut production.
   - Idempotent : chaque membre est repéré par son pseudo, chaque contenu par son auteur et son titre ;
     ce qui existe déjà n'est ni modifié ni recréé. Les référentiels de `pnpm db:seed` ne sont pas modifiés
     (les étiquettes absentes sont ajoutées, comme le ferait la saisie d'un membre).
   - Les dates du prototype sont décalées pour que son « maintenant » soit l'heure du chargement.
   - Les compteurs du prototype (412 votes « Utile »…) dépassent le nombre de membres de démonstration :
     chaque vote est celui d'un membre réel ; au-delà de 40, les nombres sont réduits en gardant leur ordre.
   - La réputation est celle du prototype (total, points de chaque semaine, détail quand il existe), pour que
     les niveaux et les classements soient les siens. Ses compteurs ne suivent pas son propre barème (RG-80) :
     les mouvements de démonstration ne sont donc pas rattachés aux votes, essais et réponses chargés.
   - DEMO-02 : les photos de profil et les images du prototype (prototype/assets) passent par le même traitement
     que les envois des membres (MEDIA-01). Elles sont ajoutées aux membres et aux créations qui n'en ont aucune,
     y compris dans une base chargée avant leur arrivée.
   - DEMO-03 : les résultats que le prototype dessinait en HTML (réservation, tableau de bord, schéma, logo,
     affiches typographiques…) sont des captures de ses fiches (db/demo/captures), chargées de la même façon.
   - DEC-01 : les guides d'Explorer et ce que la communauté cherche encore (explorer-data.js) ; les créations
     publiées reçoivent leur document de recherche, y compris dans une base chargée avant leur arrivée. */

/** « Maintenant » du prototype (forum-data.js, classements-data.js). */
export const MAINTENANT_PROTOTYPE = new Date('2026-10-13T16:20:00Z');

/** Domaine des adresses de démonstration (réservé, jamais distribué). */
export const DOMAINE_DEMO = 'example.test';
export const emailDemo = (pseudo: string): string => `${pseudo}@${DOMAINE_DEMO}`;

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;
const SEMAINE = 7 * JOUR;
const VOTES_EXACTS = 40;
const VOTES_MAXIMUM = 48;
const UTILES_MAXIMUM = Math.max(...CREATIONS.map((c) => c.utiles));

export interface OptionsDemo {
  /** Environnement d'exécution (NODE_ENV) : la production est refusée. */
  environnement: 'development' | 'test' | 'production';
  /** Heure de référence du chargement ; par défaut, l'heure courante. */
  maintenant?: Date;
  /** Stockage où écrire les photos de profil et les images (celui de l'API). */
  stockage: Stockage;
}

/** Éléments ajoutés par un chargement (tout à zéro quand les données sont déjà en base). */
export interface BilanDemo {
  membres: number;
  defis: number;
  creations: number;
  reproductions: number;
  commentaires: number;
  sujets: number;
  messages: number;
  cas: number;
  reponsesCas: number;
  votes: number;
  enregistrements: number;
  mouvements: number;
  images: number;
  avatars: number;
  /** Résultats en texte ou en code ajoutés à des créations déjà en base. */
  resultats: number;
  /** Noms affichés, titres, formats, listes « À adapter » et outils ajoutés à des données déjà en base. */
  completes: number;
  /** Notifications tirées des données chargées (NOTIF-01). */
  notifications: number;
  /** Documents de recherche des créations, sujets et cas (RG-31), ajoutés aussi à une base chargée
      avant leur arrivée. */
  documents: number;
  /** Guides d'Explorer et demandes de la communauté (DEC-01). */
  guides: number;
  demandes: number;
}

export class DemoRefusee extends Error {}

export async function chargerDemo(db: BaseDeDonnees, options: OptionsDemo): Promise<BilanDemo> {
  if (options.environnement === 'production')
    throw new DemoRefusee('Données de démonstration refusées : NODE_ENV vaut production.');
  const maintenant = options.maintenant ?? new Date();
  const documents = new DocumentsLegauxService(db);
  return db.transaction(async (tx) => {
    const ctx = await preparer(tx, maintenant);
    await chargerMembres(ctx, documents);
    await chargerDefis(ctx);
    for (const c of CREATIONS) await chargerCreation(ctx, c);
    for (const s of SUJETS) await chargerSujet(ctx, s);
    for (const c of CAS) await chargerCas(ctx, c);
    await chargerEnregistrements(ctx);
    await chargerImages(ctx, options.stockage);
    await completerResultats(ctx);
    await completerFidelite(ctx);
    await chargerCommentaires(ctx);
    await completerRecherche(ctx);
    for (const g of GUIDES) await chargerGuide(ctx, g);
    await chargerDemandes(ctx);
    chargerReputation(ctx);
    for (const lot of lots(ctx.votes)) await tx.insert(vote).values(lot);
    for (const lot of lots(ctx.mouvements)) await tx.insert(mouvementReputation).values(lot);
    ctx.bilan.votes = ctx.votes.length;
    ctx.bilan.mouvements = ctx.mouvements.length;
    await chargerNotifications(ctx);
    return ctx.bilan;
  });
}

export function decrireBilan(bilan: BilanDemo): string {
  const parties: [number, string, string][] = [
    [bilan.membres, 'membre', 'membres'],
    [bilan.creations, 'création', 'créations'],
    [bilan.reproductions, 'reproduction', 'reproductions'],
    [bilan.commentaires, 'commentaire', 'commentaires'],
    [bilan.sujets, 'sujet', 'sujets'],
    [bilan.messages, 'réponse du forum', 'réponses du forum'],
    [bilan.cas, 'cas Bon réflexe', 'cas Bon réflexe'],
    [bilan.defis, 'défi', 'défis'],
    [bilan.votes, 'vote', 'votes'],
    [bilan.mouvements, 'mouvement de réputation', 'mouvements de réputation'],
    [bilan.images, 'image', 'images'],
    [bilan.avatars, 'photo de profil', 'photos de profil'],
    [bilan.resultats, 'résultat en texte ou en code', 'résultats en texte ou en code'],
    [bilan.completes, 'élément complété', 'éléments complétés'],
    [bilan.notifications, 'notification', 'notifications'],
    [bilan.documents, 'document de recherche', 'documents de recherche'],
    [bilan.guides, 'guide d’Explorer', 'guides d’Explorer'],
    [bilan.demandes, 'demande de guide', 'demandes de guide'],
  ];
  const ajoutes = parties.filter(([nombre]) => nombre > 0);
  if (!ajoutes.length) return 'Données de démonstration déjà chargées : rien à ajouter.';
  return `Données de démonstration chargées : ${ajoutes
    .map(([nombre, un, plusieurs]) => `${nombre} ${nombre > 1 ? plusieurs : un}`)
    .join(', ')}.`;
}

/* Contexte ------------------------------------------------------------------ */

interface MembreCharge {
  id: number;
  inscription: Date;
  role: Role;
}

interface ModeleReference {
  id: number;
  nom: string;
  nomCourt: string;
}

interface Contexte {
  tx: Transaction;
  maintenant: Date;
  decalage: number;
  membres: Map<string, MembreCharge>;
  nouveaux: Set<string>;
  /** Créations ajoutées par ce chargement (les autres étaient déjà en base). */
  nouvelles: Set<string>;
  outils: Map<string, { id: number; modeles: ModeleReference[] }>;
  modeles: ModeleReference[];
  categories: Map<string, number>;
  licences: Map<string, number>;
  badges: Map<string, number>;
  etiquettes: Map<string, number>;
  defis: Map<string, { id: number; fin: Date }>;
  creations: Map<string, number>;
  sujets: Map<string, number>;
  cas: Map<string, number>;
  votes: (typeof vote.$inferInsert)[];
  mouvements: (typeof mouvementReputation.$inferInsert)[];
  bilan: BilanDemo;
}

async function preparer(tx: Transaction, maintenant: Date): Promise<Contexte> {
  // Une transaction n'a qu'une connexion : les lectures se suivent.
  const outils = await tx.select({ id: outil.id, nom: outil.nom }).from(outil);
  const modeles = await tx
    .select({ id: modele.id, nom: modele.nom, nomCourt: modele.nomCourt })
    .from(modele);
  const propositions = await tx.select().from(outilModele);
  const categories = await tx
    .select({ id: categorie.id, libelle: categorie.libelle })
    .from(categorie);
  const licences = await tx.select({ id: licence.id, code: licence.code }).from(licence);
  const badges = await tx.select({ id: badge.id, code: badge.code }).from(badge);
  const etiquettes = await tx
    .select({ id: etiquette.id, libelle: etiquette.libelle })
    .from(etiquette);
  if (!outils.length || !licences.length)
    throw new Error('Référentiels absents : lancez d’abord pnpm db:seed.');
  const parId = new Map(modeles.map((m) => [m.id, m]));
  return {
    tx,
    maintenant,
    decalage: maintenant.getTime() - MAINTENANT_PROTOTYPE.getTime(),
    membres: new Map(),
    nouveaux: new Set(),
    nouvelles: new Set(),
    outils: new Map(
      outils.map((o) => [
        o.nom,
        {
          id: o.id,
          modeles: propositions
            .filter((p) => p.outilId === o.id)
            .toSorted((a, b) => a.ordre - b.ordre)
            .map((p) => parId.get(p.modeleId))
            .filter((m) => m !== undefined),
        },
      ]),
    ),
    modeles,
    categories: new Map(categories.map((c) => [c.libelle, c.id])),
    licences: new Map(licences.map((l) => [l.code, l.id])),
    badges: new Map(badges.map((b) => [b.code, b.id])),
    etiquettes: new Map(etiquettes.map((e) => [e.libelle.toLowerCase(), e.id])),
    defis: new Map(),
    creations: new Map(),
    sujets: new Map(),
    cas: new Map(),
    votes: [],
    mouvements: [],
    bilan: {
      membres: 0,
      defis: 0,
      creations: 0,
      reproductions: 0,
      commentaires: 0,
      sujets: 0,
      messages: 0,
      cas: 0,
      reponsesCas: 0,
      votes: 0,
      enregistrements: 0,
      mouvements: 0,
      images: 0,
      avatars: 0,
      resultats: 0,
      completes: 0,
      notifications: 0,
      documents: 0,
      guides: 0,
      demandes: 0,
    },
  };
}

/* Notifications --------------------------------------------------------------- */

/** NOTIF-01 : les notifications que les données chargées auraient fait naître (RG-91) — commentaires,
    réponses, essais, votes « Utile » regroupés par contenu et par jour, réponses du forum et réponses
    acceptées, badges, niveaux atteints —, pour les membres de démonstration qui n'en ont aucune.
    Comme pour un membre qui revient, les trois plus récentes restent non lues. */
async function chargerNotifications(ctx: Contexte): Promise<void> {
  const demo = sql`d.email like ${`%@${DOMAINE_DEMO}`}`;
  const compter = async () => {
    const resultat = await ctx.tx.execute<{ n: number }>(
      sql`select count(*)::int as n from notification x join utilisateur d on d.id = x.destinataire_id where ${demo}`,
    );
    return Number(resultat.rows[0]?.n ?? 0);
  };
  if ((await compter()) > 0) return;

  const pointsVote = BAREME_REPUTATION.voteUtileSurCreation;
  const pointsAutreVote = BAREME_REPUTATION.voteUtileSurAutreContenu;
  const requetes = [
    // Commentaire sur ma création (une seule notification si l'on répond à mon propre commentaire).
    sql`insert into notification (destinataire_id, declencheur_id, contenu_id, type, date)
      select cr.auteur_id, cc.auteur_id, cm.id, 'COMMENTAIRE_RECU', cc.date_creation
      from commentaire cm
      join contenu cc on cc.id = cm.id
      join contenu cr on cr.id = cm.creation_id
      left join contenu pc on pc.id = cm.parent_id
      join utilisateur d on d.id = cr.auteur_id
      where cc.statut = 'VISIBLE' and cc.auteur_id <> cr.auteur_id
        and (pc.id is null or pc.auteur_id <> cr.auteur_id) and ${demo}`,
    // Réponse à mon commentaire.
    sql`insert into notification (destinataire_id, declencheur_id, contenu_id, type, date, donnees)
      select pc.auteur_id, cc.auteur_id, cm.id, 'REPONSE_COMMENTAIRE', cc.date_creation,
        jsonb_build_object('origineId', cm.parent_id)
      from commentaire cm
      join contenu cc on cc.id = cm.id
      join contenu pc on pc.id = cm.parent_id
      join utilisateur d on d.id = pc.auteur_id
      where cc.statut = 'VISIBLE' and cc.auteur_id <> pc.auteur_id and ${demo}`,
    // Reproduction de ma création.
    sql`insert into notification (destinataire_id, declencheur_id, contenu_id, type, date, donnees)
      select cr.auteur_id, rc.auteur_id, r.id, 'REPRODUCTION_RECUE', rc.date_creation,
        case when r.resultat = 'SUCCES'
          then jsonb_build_object('points', ${BAREME_REPUTATION.reproductionReussieRecue}::int) end
      from reproduction r
      join contenu rc on rc.id = r.id
      join contenu cr on cr.id = r.creation_id
      join utilisateur d on d.id = cr.auteur_id
      where rc.statut = 'VISIBLE' and rc.auteur_id <> cr.auteur_id and ${demo}`,
    // Votes « Utile » reçus, regroupés par contenu et par jour (UTC).
    sql`insert into notification (destinataire_id, declencheur_id, contenu_id, type, date,
        nombre_regroupe, donnees, cle_regroupement)
      select c.auteur_id, (array_agg(v.votant_id order by v.date_vote desc))[1], v.contenu_id,
        'VOTES_UTILE_RECUS', max(v.date_vote), count(*)::int,
        jsonb_build_object('points', count(*)::int * case when c.type_contenu = 'CREATION'
          then ${pointsVote}::int else ${pointsAutreVote}::int end),
        'VOTES_UTILE_RECUS:' || v.contenu_id || ':' || to_char(v.date_vote at time zone 'UTC', 'YYYY-MM-DD')
      from vote v
      join contenu c on c.id = v.contenu_id
      join utilisateur d on d.id = c.auteur_id
      where v.type_vote_code = 'UTILE' and v.votant_id <> c.auteur_id and ${demo}
      group by c.auteur_id, v.contenu_id, c.type_contenu,
        to_char(v.date_vote at time zone 'UTC', 'YYYY-MM-DD')`,
    // Réponse à mon sujet du forum.
    sql`insert into notification (destinataire_id, declencheur_id, contenu_id, type, date)
      select sc.auteur_id, mc.auteur_id, m.id, 'REPONSE_SUJET', mc.date_creation
      from message m
      join contenu mc on mc.id = m.id
      join contenu sc on sc.id = m.sujet_id
      join utilisateur d on d.id = sc.auteur_id
      where mc.statut = 'VISIBLE' and mc.auteur_id <> sc.auteur_id and ${demo}`,
    // Ma réponse acceptée.
    sql`insert into notification (destinataire_id, declencheur_id, contenu_id, type, date, donnees)
      select mc.auteur_id, sc.auteur_id, s.message_accepte_id, 'REPONSE_ACCEPTEE',
        coalesce(s.date_acceptation_reponse, mc.date_creation),
        jsonb_build_object('points', ${BAREME_REPUTATION.reponseAcceptee}::int)
      from sujet s
      join contenu sc on sc.id = s.id
      join contenu mc on mc.id = s.message_accepte_id
      join utilisateur d on d.id = mc.auteur_id
      where mc.auteur_id <> sc.auteur_id and ${demo}`,
    // Badge obtenu.
    sql`insert into notification (destinataire_id, type, date, donnees, cle_regroupement)
      select o.utilisateur_id, 'BADGE_OBTENU', o.date_obtention, jsonb_build_object('badge', b.code),
        'BADGE_OBTENU:' || b.code
      from obtention_badge o
      join badge b on b.id = o.badge_id
      join utilisateur d on d.id = o.utilisateur_id
      where ${demo}`,
    // Niveau atteint : le moment où la réputation cumulée a passé le seuil.
    sql`insert into notification (destinataire_id, type, date, donnees, cle_regroupement)
      select c.beneficiaire_id, 'NIVEAU_ATTEINT', min(c.date), jsonb_build_object('niveau', n.code),
        'NIVEAU_ATTEINT:' || n.code
      from (
        select m.beneficiaire_id, m.date,
          sum(m.points) over (partition by m.beneficiaire_id order by m.date, m.id) as total
        from mouvement_reputation m
        join utilisateur d on d.id = m.beneficiaire_id
        where ${demo}
      ) c
      join niveau n on n.seuil_points > 0 and c.total >= n.seuil_points
      group by c.beneficiaire_id, n.code`,
  ];
  for (const requete of requetes) await ctx.tx.execute(requete);

  // Les trois plus récentes de chaque membre restent non lues.
  await ctx.tx.execute(sql`update notification n set est_lue = r.rang > 3
    from (
      select x.id, row_number() over (partition by x.destinataire_id order by x.date desc, x.id desc) as rang
      from notification x join utilisateur d on d.id = x.destinataire_id
      where ${demo}
    ) r
    where r.id = n.id`);
  ctx.bilan.notifications = await compter();
}

/* Outils -------------------------------------------------------------------- */

/** Date du prototype (UTC), décalée sur l'heure du chargement et jamais dans le futur. */
function dater(ctx: Contexte, texte: string, futurPermis = false): Date {
  const brute = new Date(`${texte.length === 10 ? `${texte}T12:00` : texte}:00Z`);
  const date = new Date(brute.getTime() + ctx.decalage);
  return futurPermis || date < ctx.maintenant ? date : new Date(ctx.maintenant.getTime() - MINUTE);
}

const plusTard = (...dates: Date[]): Date => new Date(Math.max(...dates.map((d) => d.getTime())));
const plusTot = (...dates: Date[]): Date => new Date(Math.min(...dates.map((d) => d.getTime())));

/** Dates réparties régulièrement dans [debut, fin]. */
function repartirDates(debut: Date, fin: Date, nombre: number): Date[] {
  const duree = Math.max(0, fin.getTime() - debut.getTime());
  return Array.from(
    { length: nombre },
    (_, i) => new Date(debut.getTime() + (duree * (i + 0.5)) / Math.max(1, nombre)),
  );
}

/** Générateur pseudo-aléatoire déterministe (mulberry32), amorcé par un texte : chaque chargement
    produit les mêmes votants, les mêmes déclarants et les mêmes réponses. */
function aleatoire(graine: string): () => number {
  let a = [...graine].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16_777_619), 2_166_136_261);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function melanger<T>(liste: readonly T[], graine: string): T[] {
  const hasard = aleatoire(graine);
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hasard() * (i + 1));
    [copie[i], copie[j]] = [copie[j] as T, copie[i] as T];
  }
  return copie;
}

function lots<T>(liste: T[], taille = 500): T[][] {
  return Array.from({ length: Math.ceil(liste.length / taille) }, (_, i) =>
    liste.slice(i * taille, (i + 1) * taille),
  );
}

function membre(ctx: Contexte, pseudo: string): MembreCharge {
  const trouve = ctx.membres.get(pseudo);
  if (!trouve) throw new Error(`Membre de démonstration inconnu : ${pseudo}`);
  return trouve;
}

/** Tirage sans remise, dans un ordre aléatoire déterministe, parmi les membres qui contribuent (hors comptes
    de l'équipe et hors exclus) : le premier inscrit avant la date. */
function tirage(
  ctx: Contexte,
  graine: string,
  ...exclus: number[]
): (date: Date) => MembreCharge | undefined {
  const candidats = melanger(
    [...ctx.membres.values()].filter((m) => m.role === 'MEMBRE' && !exclus.includes(m.id)),
    graine,
  );
  return (date) => {
    const rang = candidats.findIndex((m) => m.inscription < date);
    return rang < 0 ? undefined : candidats.splice(rang, 1)[0];
  };
}

/** Un membre différent par date ; sans membre disponible, la date est abandonnée. */
function choisirMembres(
  ctx: Contexte,
  dates: Date[],
  graine: string,
  ...exclus: number[]
): { membre: MembreCharge; date: Date }[] {
  const tirer = tirage(ctx, graine, ...exclus);
  return dates
    .toSorted((a, b) => a.getTime() - b.getTime())
    .flatMap((date) => {
      const elu = tirer(date);
      return elu ? [{ membre: elu, date }] : [];
    });
}

/** Au-delà de 40, le nombre du prototype est réduit (48 au plus), en gardant l'ordre des contenus. */
const nombreDeVotes = (prototype: number): number =>
  prototype <= VOTES_EXACTS
    ? prototype
    : Math.round(
        VOTES_EXACTS +
          ((prototype - VOTES_EXACTS) * (VOTES_MAXIMUM - VOTES_EXACTS)) /
            (UTILES_MAXIMUM - VOTES_EXACTS),
      );

/** RG-40, RG-41 : votes de membres autres que l'auteur ; `recents` tombent dans les 7 derniers jours (RG-32). */
function voter(
  ctx: Contexte,
  cible: { id: number; auteurId: number; graine: string },
  type: 'UTILE' | 'TESTE_OK',
  nombre: number,
  periode: { debut: Date; fin: Date; recents?: number },
): void {
  const semaine = new Date(ctx.maintenant.getTime() - SEMAINE);
  const recents = Math.min(nombre, periode.recents ?? 0);
  const fin = plusTot(periode.fin, ctx.maintenant);
  const debut = plusTot(periode.debut, fin);
  const dates =
    debut >= semaine || periode.recents === undefined
      ? repartirDates(debut, fin, nombre)
      : [
          ...repartirDates(debut, plusTot(semaine, fin), nombre - recents),
          ...repartirDates(plusTard(semaine, debut), fin, recents),
        ];
  for (const { membre: votant, date } of choisirMembres(
    ctx,
    dates,
    `${cible.graine}:${type}`,
    cible.auteurId,
  ))
    ctx.votes.push({
      votantId: votant.id,
      contenuId: cible.id,
      typeVoteCode: type,
      dateVote: date,
    });
}

async function nouveauContenu(
  ctx: Contexte,
  typeContenu: TypeContenu,
  auteurId: number,
  dateCreation: Date,
  autres: Partial<typeof contenu.$inferInsert> = {},
): Promise<number> {
  const [ligne] = await ctx.tx
    .insert(contenu)
    .values({ typeContenu, auteurId, dateCreation, ...autres })
    .returning({ id: contenu.id });
  if (!ligne) throw new Error('Contenu non créé');
  return ligne.id;
}

function outilDe(ctx: Contexte, nom: string): number {
  const trouve = ctx.outils.get(nom);
  if (!trouve) throw new Error(`Outil absent du référentiel : ${nom}`);
  return trouve.id;
}

/** RG-14 : modèle du référentiel (nom court ou complet), sinon texte libre. */
function modeleDe(
  ctx: Contexte,
  nomOutil: string,
  nomModele?: string,
): { modeleId: number | null; modeleNonReference: string | null } {
  if (!nomModele) return { modeleId: null, modeleNonReference: null };
  const correspond = (m: ModeleReference) => m.nomCourt === nomModele || m.nom === nomModele;
  const trouve =
    ctx.outils.get(nomOutil)?.modeles.find(correspond) ??
    ctx.modeles.find((m) => m.nom === nomModele) ??
    ctx.modeles.find(correspond);
  return trouve
    ? { modeleId: trouve.id, modeleNonReference: null }
    : { modeleId: null, modeleNonReference: nomModele };
}

/** Outil et modèle d'un sujet ou d'un cas (comme une configuration, RG-14). */
function outilEtModele(
  ctx: Contexte,
  nomOutil?: string,
  nomModele?: string,
): { outilId: number | null; modeleId: number | null; modeleNonReference: string | null } {
  if (!nomOutil) return { outilId: null, modeleId: null, modeleNonReference: null };
  return { outilId: outilDe(ctx, nomOutil), ...modeleDe(ctx, nomOutil, nomModele) };
}

/** Étiquettes du contenu ; une étiquette absente est ajoutée, comme à la saisie d'un membre. */
async function etiqueter(ctx: Contexte, contenuId: number, libelles: string[]): Promise<void> {
  const ids: number[] = [];
  for (const libelle of libelles) {
    let id = ctx.etiquettes.get(libelle.toLowerCase());
    if (id === undefined) {
      const slug = slugifier(libelle);
      await ctx.tx.insert(etiquette).values({ libelle, slug }).onConflictDoNothing();
      const [ligne] = await ctx.tx
        .select({ id: etiquette.id })
        .from(etiquette)
        .where(eq(etiquette.slug, slug));
      if (!ligne) throw new Error(`Étiquette non créée : ${libelle}`);
      id = ligne.id;
      ctx.etiquettes.set(libelle.toLowerCase(), id);
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length)
    await ctx.tx
      .insert(contenuEtiquette)
      .values(ids.map((etiquetteId) => ({ contenuId, etiquetteId })));
}

/* Membres ------------------------------------------------------------------- */

async function chargerMembres(ctx: Contexte, documents: DocumentsLegauxService): Promise<void> {
  const pseudos = MEMBRES.map((m) => m.pseudo);
  const existants = await ctx.tx
    .select({
      id: utilisateur.id,
      pseudo: utilisateur.pseudo,
      email: utilisateur.email,
      dateInscription: utilisateur.dateInscription,
      role: utilisateur.role,
    })
    .from(utilisateur)
    .where(inArray(sql`lower(${utilisateur.pseudo})`, pseudos));
  for (const e of existants) {
    const pseudo = e.pseudo.toLowerCase();
    if (e.email?.toLowerCase() !== emailDemo(pseudo))
      throw new Error(
        `Le pseudo « ${e.pseudo} » appartient déjà à un compte qui n’est pas de démonstration : renommez-le avant de charger les données.`,
      );
    ctx.membres.set(pseudo, { id: e.id, inscription: e.dateInscription, role: e.role });
  }

  const absents = MEMBRES.filter((m) => !ctx.membres.has(m.pseudo));
  const empreintes = await Promise.all(absents.map(() => hacherMotDePasse(MOT_DE_PASSE_DEMO)));
  for (const [i, m] of absents.entries()) {
    const inscription = dater(ctx, m.inscription);
    const [ligne] = await ctx.tx
      .insert(utilisateur)
      .values({
        pseudo: m.pseudo,
        nomAffiche: m.nom,
        email: emailDemo(m.pseudo),
        emailVerifie: true,
        empreinteMotDePasse: empreintes[i],
        role: m.role ?? 'MEMBRE',
        biographie: m.biographie,
        urlSite: m.urlSite,
        dateInscription: inscription,
      })
      .returning({ id: utilisateur.id });
    if (!ligne) throw new Error(`Membre non créé : ${m.pseudo}`);
    ctx.membres.set(m.pseudo, { id: ligne.id, inscription, role: m.role ?? 'MEMBRE' });
    ctx.nouveaux.add(m.pseudo);
    // RG-03 : documents légaux en vigueur acceptés, comme à l'inscription.
    await documents.accepterEnVigueur(ligne.id, ctx.tx);
    if (m.badges?.length)
      await ctx.tx.insert(obtentionBadge).values(
        m.badges.map((b) => {
          const badgeId = ctx.badges.get(b.code);
          if (!badgeId) throw new Error(`Badge inconnu : ${b.code}`);
          return {
            utilisateurId: ligne.id,
            badgeId,
            dateObtention: plusTard(dater(ctx, b.date), inscription),
          };
        }),
      );
    ctx.bilan.membres += 1;
  }
}

/* Défis --------------------------------------------------------------------- */

async function chargerDefis(ctx: Contexte): Promise<void> {
  // CI-29 : un défi est organisé par un administrateur.
  const organisateur = membre(ctx, 'administration-demo');
  for (const d of DEFIS) {
    const [existant] = await ctx.tx
      .select({ id: defi.id, fin: defi.dateFin })
      .from(defi)
      .where(eq(defi.slug, d.slug));
    if (existant) {
      ctx.defis.set(d.slug, existant);
      continue;
    }
    const [ligne] = await ctx.tx
      .insert(defi)
      .values({
        organisateurId: organisateur.id,
        titre: d.titre,
        slug: d.slug,
        enonce: d.enonce,
        contraintes: d.contraintes,
        dateDebut: dater(ctx, d.debut, true),
        dateFin: dater(ctx, d.fin, true),
        statut: d.statut,
      })
      .returning({ id: defi.id, fin: defi.dateFin });
    if (!ligne) throw new Error(`Défi non créé : ${d.slug}`);
    ctx.defis.set(d.slug, ligne);
    ctx.bilan.defis += 1;
  }
}

/* Créations ----------------------------------------------------------------- */

async function chargerCreation(ctx: Contexte, c: CreationDemo): Promise<void> {
  const auteur = membre(ctx, c.auteur);
  const titre = c.titre || null;
  const [existante] = await ctx.tx
    .select({ id: creation.id })
    .from(creation)
    .innerJoin(contenu, eq(contenu.id, creation.id))
    .where(
      and(
        eq(contenu.auteurId, auteur.id),
        titre ? eq(creation.titre, titre) : isNull(creation.titre),
      ),
    );
  if (existante) {
    ctx.creations.set(c.cle, existante.id);
    return;
  }

  const categorieId = c.categorie ? ctx.categories.get(c.categorie) : null;
  const licenceId = ctx.licences.get(c.licence);
  const defiLie = c.defi ? ctx.defis.get(c.defi) : undefined;
  if (categorieId === undefined) throw new Error(`Catégorie inconnue : ${c.categorie}`);
  if (licenceId === undefined) throw new Error(`Licence inconnue : ${c.licence}`);
  if (c.defi && !defiLie) throw new Error(`Défi inconnu : ${c.defi}`);

  const publication = c.publication ? dater(ctx, c.publication) : undefined;
  const modification = c.modification ? dater(ctx, c.modification) : undefined;
  const reference = publication ?? modification ?? ctx.maintenant;
  const dateCreation = c.creation
    ? dater(ctx, c.creation)
    : plusTard(auteur.inscription, new Date(reference.getTime() - (publication ? 26 : 2) * HEURE));
  const id = await nouveauContenu(ctx, 'CREATION', auteur.id, dateCreation, {
    dateModification: modification,
    nbVues: c.vues ?? 0,
  });
  await ctx.tx.insert(creation).values({
    id,
    typeCreation: c.type,
    titre,
    slug: titre ? slugifier(titre) : null,
    objectif: c.objectif || null,
    limites: c.limites,
    formatResultat: c.formatResultat,
    aAdapter: c.aAdapter ?? [],
    resultatTexte: c.resultat?.texte,
    resultatNature: c.resultat?.nature,
    resultatNom: c.resultat?.nom,
    statutPublication: publication ? 'PUBLIEE' : 'BROUILLON',
    datePublication: publication,
    dateConfirmationDonnees: publication,
    categorieId,
    licenceId,
    defiId: defiLie?.id,
  });
  ctx.creations.set(c.cle, id);
  ctx.nouvelles.add(c.cle);
  ctx.bilan.creations += 1;

  for (const [rang, e] of c.etapes.entries()) {
    const [ligneEtape] = await ctx.tx
      .insert(etape)
      .values({ creationId: id, ordre: rang + 1, titre: e.titre, recit: e.recit })
      .returning({ id: etape.id });
    if (!ligneEtape) throw new Error('Étape non créée');
    const configurations: number[] = [];
    for (const [ordre, conf] of e.configurations.entries())
      configurations.push(await nouvelleConfiguration(ctx, ligneEtape.id, ordre, conf));
    const echanges: number[] = [];
    for (const [ordre, ech] of e.echanges.entries()) {
      const essais = ech.essais ?? 1;
      const [ligne] = await ctx.tx
        .insert(echange)
        .values({
          etapeId: ligneEtape.id,
          configurationId: configurations[ech.configuration ?? 0] ?? null,
          ordre: ordre + 1,
          titre: ech.titre,
          prompt: ech.prompt,
          reponse: ech.reponse,
          nbEssais: essais,
          modeSelection: essais > 1 ? 'MEILLEUR_ESSAI' : 'PREMIER_ESSAI',
        })
        .returning({ id: echange.id });
      if (!ligne) throw new Error('Échange non créé');
      echanges.push(ligne.id);
    }
    if (e.moments.length)
      await ctx.tx.insert(momentCle).values(
        e.moments.map((m) => ({
          etapeId: ligneEtape.id,
          echangeId: m.echange === undefined ? null : echanges[m.echange],
          type: m.type,
          titre: m.titre,
          explication: m.explication,
        })),
      );
  }
  if (c.liens?.length)
    await ctx.tx
      .insert(lienExterne)
      .values(c.liens.map((l, ordre) => ({ creationId: id, ordre, ...l })));
  await etiqueter(ctx, id, c.etiquettes);
  if (!publication) return;

  await chargerReproductions(ctx, c, { id, auteurId: auteur.id, publication });

  // RG-75 : les votes d'une participation tombent pendant le défi.
  const votes = nombreDeVotes(c.utiles);
  voter(ctx, { id, auteurId: auteur.id, graine: c.cle }, 'UTILE', votes, {
    debut: new Date(publication.getTime() + 10 * MINUTE),
    fin: defiLie ? plusTot(ctx.maintenant, defiLie.fin) : ctx.maintenant,
    recents: Math.round((votes * (c.utilesSemaine ?? 0)) / (c.utiles || 1)),
  });

  if (c.obsolescence) {
    const { modeleId } = modeleDe(ctx, '', c.obsolescence.modele);
    if (!modeleId) throw new Error(`Modèle inconnu : ${c.obsolescence.modele}`);
    const dates = repartirDates(
      plusTard(dater(ctx, c.obsolescence.depuis), publication),
      ctx.maintenant,
      c.obsolescence.membres,
    );
    const signaleurs = choisirMembres(ctx, dates, `${c.cle}:obsolescence`, auteur.id);
    if (signaleurs.length)
      await ctx.tx.insert(signalementObsolescence).values(
        signaleurs.map((s) => ({
          utilisateurId: s.membre.id,
          contenuId: id,
          modeleId,
          date: s.date,
        })),
      );
  }
}

/** Commentaires des créations publiées et leurs réponses (F-42), ajoutés aussi aux créations déjà
    en base : un commentaire est reconnu à sa création, son auteur et son texte. */
async function chargerCommentaires(ctx: Contexte): Promise<void> {
  for (const c of CREATIONS) {
    const creationId = ctx.creations.get(c.cle);
    if (!c.publication || creationId === undefined || !c.commentaires?.length) continue;
    const existants = await ctx.tx
      .select({ id: commentaire.id, corps: commentaire.corps, auteurId: contenu.auteurId })
      .from(commentaire)
      .innerJoin(contenu, eq(contenu.id, commentaire.id))
      .where(eq(commentaire.creationId, creationId));
    const ajouter = async (
      com: { auteur: string; date: string; corps: string },
      parentId: number | null,
    ): Promise<number> => {
      const auteur = membre(ctx, com.auteur);
      const deja = existants.find((e) => e.auteurId === auteur.id && e.corps === com.corps);
      if (deja) return deja.id;
      const id = await nouveauContenu(ctx, 'COMMENTAIRE', auteur.id, dater(ctx, com.date));
      await ctx.tx.insert(commentaire).values({ id, creationId, parentId, corps: com.corps });
      ctx.bilan.commentaires += 1;
      return id;
    };
    for (const com of c.commentaires) {
      const id = await ajouter(com, null);
      for (const reponse of com.reponses ?? []) await ajouter(reponse, id);
    }
  }
}

async function nouvelleConfiguration(
  ctx: Contexte,
  etapeId: number,
  ordre: number,
  conf: ConfigurationDemo,
): Promise<number> {
  const [ligne] = await ctx.tx
    .insert(configurationIa)
    .values({
      etapeId,
      ordre,
      outilId: outilDe(ctx, conf.outil),
      ...modeleDe(ctx, conf.outil, conf.modele),
      parametres: conf.parametres,
      contexteCache: conf.contexte,
    })
    .returning({ id: configurationIa.id });
  if (!ligne) throw new Error('Configuration non créée');
  return ligne.id;
}

/** RG-42, RG-43 : essais déclarés par d'autres membres, répartis par configuration comme dans le prototype. */
async function chargerReproductions(
  ctx: Contexte,
  c: CreationDemo,
  cible: { id: number; auteurId: number; publication: Date },
): Promise<void> {
  const r = c.reproductions;
  if (!r) return;
  interface Essai {
    outil: string;
    modele?: string;
    resultat: ResultatReproduction;
    retour?: string;
    auteur?: string;
  }
  const restants = r.configurations.map((x) => ({ ...x }));
  const detailles: Essai[] = [];
  for (const detail of r.retours ?? []) {
    const conf = restants.find((x) => x.outil === detail.outil && x.modele === detail.modele);
    if (!conf) throw new Error(`Configuration inconnue pour un retour : ${c.cle}`);
    conf.essais -= 1;
    if (detail.resultat === 'SUCCES') conf.reussis -= 1;
    detailles.push(detail);
  }
  let rangRetour = 0;
  const autres: Essai[] = [];
  for (const conf of restants)
    for (let i = 0; i < conf.essais; i += 1) {
      const resultat: ResultatReproduction =
        i < conf.reussis ? 'SUCCES' : (i - conf.reussis) % 3 === 2 ? 'ECHEC' : 'PARTIEL';
      const retours = resultat === 'SUCCES' ? [] : RETOURS_REPRODUCTION[resultat];
      autres.push({
        outil: conf.outil,
        modele: conf.modele,
        resultat,
        ...(retours.length && { retour: retours[(rangRetour += 1) % retours.length] }),
      });
    }
  const liste = [...detailles, ...melanger(autres, `${c.cle}:essais`)];
  // Le dernier essai déclaré est celui du prototype (« Dernier essai le 12 oct. »).
  const dernier = r.dernier;
  const rangDernier = dernier
    ? liste.findLastIndex((e) => e.outil === dernier.outil && e.modele === dernier.modele)
    : -1;
  if (rangDernier >= 0) liste.push(...liste.splice(rangDernier, 1));
  // Premiers essais deux heures après la publication, ou au quart du temps écoulé depuis.
  const ecoule = ctx.maintenant.getTime() - cible.publication.getTime();
  const debut = new Date(cible.publication.getTime() + Math.min(2 * HEURE, ecoule / 4));
  const fin = plusTard(
    debut,
    dernier
      ? dater(ctx, dernier.date)
      : plusTot(ctx.maintenant, new Date(cible.publication.getTime() + 4 * JOUR)),
  );
  const dates = repartirDates(debut, fin, liste.length);
  if (dernier && dates.length) dates[dates.length - 1] = fin;

  const designes = liste.flatMap((e) => (e.auteur ? [membre(ctx, e.auteur).id] : []));
  const tirer = tirage(ctx, `${c.cle}:declarants`, cible.auteurId, ...designes);
  for (const [i, essai] of liste.entries()) {
    const date = dates[i];
    const declarant = date && (essai.auteur ? membre(ctx, essai.auteur) : tirer(date));
    if (!declarant || !date) continue;
    const id = await nouveauContenu(ctx, 'REPRODUCTION', declarant.id, date);
    await ctx.tx.insert(reproduction).values({
      id,
      creationId: cible.id,
      outilId: outilDe(ctx, essai.outil),
      ...modeleDe(ctx, essai.outil, essai.modele),
      resultat: essai.resultat,
      retour: essai.retour,
    });
    ctx.bilan.reproductions += 1;
  }
}

/* Forum --------------------------------------------------------------------- */

async function chargerSujet(ctx: Contexte, s: SujetDemo): Promise<void> {
  const auteur = membre(ctx, s.auteur);
  const slug = slugifier(s.titre);
  const [existant] = await ctx.tx
    .select({ id: sujet.id })
    .from(sujet)
    .innerJoin(contenu, eq(contenu.id, sujet.id))
    .where(and(eq(contenu.auteurId, auteur.id), eq(sujet.slug, slug)));
  if (existant) {
    ctx.sujets.set(s.cle, existant.id);
    return;
  }
  const date = dater(ctx, s.date);
  const id = await nouveauContenu(ctx, 'SUJET', auteur.id, date);
  // RG-66 : un sujet concerne au plus une création publiée.
  const creationLiee = s.creation ? ctx.creations.get(s.creation) : undefined;
  if (s.creation && !creationLiee) throw new Error(`Création liée inconnue : ${s.creation}`);
  await ctx.tx.insert(sujet).values({
    id,
    typeSujet: s.type,
    titre: s.titre,
    slug,
    corps: s.corps,
    exempleAvant: s.exempleAvant,
    exempleApres: s.exempleApres,
    ...outilEtModele(ctx, s.outil, s.modele),
    creationId: creationLiee,
    fermeurId: s.fermeture ? membre(ctx, s.fermeture.par).id : undefined,
    dateFermeture: s.fermeture ? dater(ctx, s.fermeture.date) : undefined,
  });
  ctx.sujets.set(s.cle, id);
  ctx.bilan.sujets += 1;
  await etiqueter(ctx, id, s.etiquettes);

  const messages = new Map<string, number>();
  for (const m of s.messages) {
    const auteurMessage = membre(ctx, m.auteur);
    const dateMessage = dater(ctx, m.date);
    const idMessage = await nouveauContenu(ctx, 'MESSAGE', auteurMessage.id, dateMessage);
    await ctx.tx.insert(message).values({ id: idMessage, sujetId: id, corps: m.corps });
    messages.set(m.cle, idMessage);
    ctx.bilan.messages += 1;
    voter(
      ctx,
      { id: idMessage, auteurId: auteurMessage.id, graine: m.cle },
      'UTILE',
      nombreDeVotes(m.utiles),
      { debut: new Date(dateMessage.getTime() + 5 * MINUTE), fin: ctx.maintenant },
    );
  }

  // RG-63 : une réponse acceptée par l'auteur du sujet, parmi celles des autres membres.
  if (s.reponseAcceptee) {
    const accepte = messages.get(s.reponseAcceptee.message);
    if (!accepte) throw new Error(`Réponse acceptée inconnue : ${s.cle}`);
    await ctx.tx
      .update(sujet)
      .set({
        messageAccepteId: accepte,
        dateAcceptationReponse: dater(ctx, s.reponseAcceptee.date),
      })
      .where(eq(sujet.id, id));
  }

  const cible = { id, auteurId: auteur.id, graine: s.cle };
  const periode = { debut: new Date(date.getTime() + 5 * MINUTE), fin: ctx.maintenant };
  voter(ctx, cible, 'UTILE', nombreDeVotes(s.utiles), periode);
  if (s.type === 'ASTUCE' && s.testes)
    voter(ctx, cible, 'TESTE_OK', nombreDeVotes(s.testes), periode);
}

/** RG-31 : document de recherche des créations publiées, des sujets et des cas validés de
    démonstration, visibles, qui n'en ont pas (Explorer, le forum et la liste des cas les trouvent). */
async function completerRecherche(ctx: Contexte): Promise<void> {
  const creations = [...ctx.creations.values()];
  const sujets = [...ctx.sujets.values()];
  const cas = [...ctx.cas.values()];
  const creationsSansDocument = creations.length
    ? await ctx.tx
        .select({ id: creation.id })
        .from(creation)
        .innerJoin(contenu, eq(contenu.id, creation.id))
        .leftJoin(rechercheDocument, eq(rechercheDocument.contenuId, creation.id))
        .where(
          and(
            inArray(creation.id, creations),
            eq(contenu.statut, 'VISIBLE'),
            eq(creation.statutPublication, 'PUBLIEE'),
            isNull(rechercheDocument.contenuId),
          ),
        )
    : [];
  const sujetsSansDocument = sujets.length
    ? await ctx.tx
        .select({ id: sujet.id })
        .from(sujet)
        .innerJoin(contenu, eq(contenu.id, sujet.id))
        .leftJoin(rechercheDocument, eq(rechercheDocument.contenuId, sujet.id))
        .where(
          and(
            inArray(sujet.id, sujets),
            eq(contenu.statut, 'VISIBLE'),
            isNull(rechercheDocument.contenuId),
          ),
        )
    : [];
  const casSansDocument = cas.length
    ? await ctx.tx
        .select({ id: casBonReflexe.id })
        .from(casBonReflexe)
        .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
        .leftJoin(rechercheDocument, eq(rechercheDocument.contenuId, casBonReflexe.id))
        .where(
          and(
            inArray(casBonReflexe.id, cas),
            eq(contenu.statut, 'VISIBLE'),
            eq(casBonReflexe.statutValidation, 'VALIDE'),
            isNull(rechercheDocument.contenuId),
          ),
        )
    : [];
  for (const { id } of creationsSansDocument) await indexerCreation(ctx.tx, id);
  for (const { id } of sujetsSansDocument) await indexerSujet(ctx.tx, id);
  for (const { id } of casSansDocument) await indexerCas(ctx.tx, id);
  ctx.bilan.documents +=
    creationsSansDocument.length + sujetsSansDocument.length + casSansDocument.length;
}

/* Explorer ------------------------------------------------------------------ */

function cleConnue(carte: Map<string, number>, cle: string, nature: string): number {
  const id = carte.get(cle);
  if (id === undefined) throw new Error(`${nature} de démonstration inconnu(e) : ${cle}`);
  return id;
}

/** DEC-01 : guide d'Explorer, repéré par son adresse ; un guide déjà en base n'est pas modifié. */
async function chargerGuide(ctx: Contexte, g: GuideDemo): Promise<void> {
  const [existant] = await ctx.tx.select({ id: guide.id }).from(guide).where(eq(guide.slug, g.cle));
  if (existant) return;
  const categorieId = ctx.categories.get(g.domaine);
  if (categorieId === undefined) throw new Error(`Catégorie inconnue : ${g.domaine}`);
  const creationDe = (cle: string) => cleConnue(ctx.creations, cle, 'Création');
  const [ligne] = await ctx.tx
    .insert(guide)
    .values({
      slug: g.cle,
      titre: g.titre,
      titreCourt: g.titreCourt,
      categorieId,
      motsCles: g.motsCles,
      lacunes: g.lacunes,
      datePublication: ctx.maintenant,
      dateCreation: ctx.maintenant,
    })
    .returning({ id: guide.id });
  if (!ligne) throw new Error('Guide non créé');
  const guideId = ligne.id;

  const contenus = [
    ...g.parcours.map(creationDe),
    ...g.sujets.map((cle) => cleConnue(ctx.sujets, cle, 'Sujet')),
    ...g.cas.map((cle) => cleConnue(ctx.cas, cle, 'Cas')),
  ];
  await ctx.tx
    .insert(guideContenu)
    .values(contenus.map((contenuId, ordre) => ({ guideId, contenuId, ordre })));

  const etapes: number[] = [];
  for (const [ordre, e] of g.etapes.entries()) {
    const [etapeGuide] = await ctx.tx
      .insert(guideEtape)
      .values({
        guideId,
        ordre,
        titre: e.titre,
        conseil: e.conseil,
        citationCreationId: e.citation ? creationDe(e.citation) : null,
        citationTexte: e.citation ? (e.citationTexte ?? null) : null,
      })
      .returning({ id: guideEtape.id });
    if (!etapeGuide) throw new Error('Étape de guide non créée');
    etapes.push(etapeGuide.id);
    if (e.sources.length)
      await ctx.tx
        .insert(guideEtapeSource)
        .values(e.sources.map((cle) => ({ etapeId: etapeGuide.id, creationId: creationDe(cle) })));
  }
  for (const [ordre, p] of g.pieges.entries()) {
    const [piege] = await ctx.tx
      .insert(guidePiege)
      .values({
        guideId,
        ordre,
        titre: p.titre,
        solution: p.solution,
        etapeId: p.etape === undefined ? null : (etapes[p.etape] ?? null),
        sujetId: p.sujet ? cleConnue(ctx.sujets, p.sujet, 'Sujet') : null,
        casId: p.cas ? cleConnue(ctx.cas, p.cas, 'Cas') : null,
      })
      .returning({ id: guidePiege.id });
    if (!piege) throw new Error('Piège de guide non créé');
    if (p.sources.length)
      await ctx.tx
        .insert(guidePiegeSource)
        .values(p.sources.map((cle) => ({ piegeId: piege.id, creationId: creationDe(cle) })));
  }
  ctx.bilan.guides += 1;
}

/** « Ce que la communauté cherche encore » : chaque demande ajoutée est cherchée par autant de
    membres de démonstration que dans le prototype. Les soutiens datent des 14 derniers jours : ils
    restent comptés (30 jours) deux semaines après le chargement. */
async function chargerDemandes(ctx: Contexte): Promise<void> {
  const debut = new Date(ctx.maintenant.getTime() - 14 * JOUR);
  for (const d of DEMANDES) {
    const [ajoutee] = await ctx.tx
      .insert(demandeGuide)
      .values({
        libelle: d.libelle,
        categorieId: ctx.categories.get(d.domaine) ?? null,
        dateCreation: debut,
      })
      .onConflictDoNothing({ target: demandeGuide.libelle })
      .returning({ id: demandeGuide.id });
    if (!ajoutee) continue;
    const soutiens = choisirMembres(
      ctx,
      repartirDates(debut, ctx.maintenant, d.soutiens),
      `demande:${d.libelle}`,
    );
    if (soutiens.length)
      await ctx.tx.insert(soutienDemande).values(
        soutiens.map(({ membre: m, date }) => ({
          demandeId: ajoutee.id,
          utilisateurId: m.id,
          date,
        })),
      );
    ctx.bilan.demandes += 1;
  }
}

/* Bon réflexe --------------------------------------------------------------- */

/** Catégorie d'un cas, désignée par son libellé. */
function categorieDuCas(ctx: { categories: Map<string, number> }, libelle: string): number {
  const id = ctx.categories.get(libelle);
  if (id === undefined) throw new Error(`Catégorie inconnue : ${libelle}`);
  return id;
}

async function chargerCas(ctx: Contexte, c: CasDemo): Promise<void> {
  const auteur = membre(ctx, c.auteur);
  const slug = slugifier(c.titre);
  const [existant] = await ctx.tx
    .select({ id: casBonReflexe.id })
    .from(casBonReflexe)
    .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
    .where(and(eq(contenu.auteurId, auteur.id), eq(casBonReflexe.slug, slug)));
  if (existant) {
    ctx.cas.set(c.cle, existant.id);
    return;
  }
  const date = dater(ctx, c.date);
  // RG-71 : validé par un modérateur qui n'en est pas l'auteur (CI-18 : examen daté).
  const examinateur = membre(ctx, 'moderation-demo');
  const dateExamen = plusTot(ctx.maintenant, new Date(date.getTime() + 3 * HEURE));
  const id = await nouveauContenu(ctx, 'CAS_BON_REFLEXE', auteur.id, date);
  await ctx.tx.insert(casBonReflexe).values({
    id,
    titre: c.titre,
    slug,
    contexte: c.contexte,
    demandeIa: c.demandeIa,
    reponseIa: c.reponseIa,
    question: c.question,
    explication: c.explication,
    difficulte: c.difficulte,
    categorieId: categorieDuCas(ctx, c.domaine),
    dureeMinutes: c.duree,
    ...outilEtModele(ctx, c.outil, c.modele),
    statutValidation: 'VALIDE',
    examinateurId: examinateur.id,
    dateExamen,
  });
  const options = await ctx.tx
    .insert(optionReponse)
    .values(
      c.options.map(({ correcte, ...o }, rang) => ({
        casId: id,
        ordre: rang + 1,
        ...o,
        estCorrecte: correcte,
      })),
    )
    .returning({ id: optionReponse.id, ordre: optionReponse.ordre });
  ctx.cas.set(c.cle, id);
  ctx.bilan.cas += 1;
  await etiqueter(ctx, id, c.etiquettes);

  // RG-72 : une réponse définitive par membre, jamais l'auteur ; la répartition suit celle du prototype.
  const candidats = [...ctx.membres.values()].filter(
    (m) => m.role === 'MEMBRE' && m.id !== auteur.id,
  ).length;
  const nombre = Math.min(candidats, Math.round(c.reponses / 30));
  const parts = c.repartition.map((p) => (p * nombre) / 100);
  const effectifs = parts.map(Math.floor);
  const manquants = nombre - effectifs.reduce((a, b) => a + b, 0);
  for (const [, rang] of parts
    .map((p, i) => [p - Math.floor(p), i] as const)
    .toSorted((a, b) => b[0] - a[0])
    .slice(0, manquants))
    effectifs[rang] = (effectifs[rang] ?? 0) + 1;
  const choix = melanger(
    effectifs.flatMap((n, rang) => Array.from({ length: n }, () => rang)),
    `${c.cle}:choix`,
  );
  const repondants = choisirMembres(
    ctx,
    repartirDates(dateExamen, ctx.maintenant, choix.length),
    `${c.cle}:repondants`,
    auteur.id,
  );
  const lignes = repondants.map((r, i) => {
    const option = options.find((o) => o.ordre === (choix[i] ?? 0) + 1);
    if (!option) throw new Error(`Option inconnue : ${c.cle}`);
    return { utilisateurId: r.membre.id, casId: id, optionId: option.id, dateChoix: r.date };
  });
  if (lignes.length) await ctx.tx.insert(choixOption).values(lignes);
  ctx.bilan.reponsesCas += lignes.length;

  // RG-41 : le vote « Utile » s'applique aux cas validés.
  voter(ctx, { id, auteurId: auteur.id, graine: c.cle }, 'UTILE', nombreDeVotes(c.utiles), {
    debut: new Date(dateExamen.getTime() + 5 * MINUTE),
    fin: ctx.maintenant,
  });
}

/* Enregistrements ----------------------------------------------------------- */

/** Résultat en texte ou en code d'une création chargée avant son arrivée dans les données. */
async function completerResultats(ctx: Contexte): Promise<void> {
  for (const c of CREATIONS) {
    const id = ctx.creations.get(c.cle);
    if (!id || !c.resultat || ctx.nouvelles.has(c.cle)) continue;
    const [complete] = await ctx.tx
      .update(creation)
      .set({
        resultatTexte: c.resultat.texte,
        resultatNature: c.resultat.nature,
        resultatNom: c.resultat.nom,
      })
      .where(and(eq(creation.id, id), isNull(creation.resultatTexte)))
      .returning({ id: creation.id });
    if (complete) ctx.bilan.resultats += 1;
  }
}

/** Ce que les données ont gagné pour suivre le prototype (nom affiché, titres des moments et des échanges,
    format, « À adapter », outil des sujets et des cas), ajouté aux lignes déjà en base qui ne l'ont pas. */
async function completerFidelite(ctx: Contexte): Promise<void> {
  const compter = (lignes: unknown[]) => {
    ctx.bilan.completes += lignes.length;
  };
  for (const m of MEMBRES) {
    const existant = ctx.membres.get(m.pseudo);
    if (!existant || ctx.nouveaux.has(m.pseudo)) continue;
    compter(
      await ctx.tx
        .update(utilisateur)
        .set({ nomAffiche: m.nom })
        .where(and(eq(utilisateur.id, existant.id), isNull(utilisateur.nomAffiche)))
        .returning({ id: utilisateur.id }),
    );
  }
  for (const c of CREATIONS) {
    const id = ctx.creations.get(c.cle);
    if (!id || ctx.nouvelles.has(c.cle)) continue;
    if (c.formatResultat)
      compter(
        await ctx.tx
          .update(creation)
          .set({ formatResultat: c.formatResultat })
          .where(and(eq(creation.id, id), isNull(creation.formatResultat)))
          .returning({ id: creation.id }),
      );
    if (c.aAdapter?.length)
      compter(
        await ctx.tx
          .update(creation)
          .set({ aAdapter: c.aAdapter })
          .where(and(eq(creation.id, id), sql`cardinality(${creation.aAdapter}) = 0`))
          .returning({ id: creation.id }),
      );
    for (const [rang, e] of c.etapes.entries()) {
      const [ligneEtape] = await ctx.tx
        .select({ id: etape.id })
        .from(etape)
        .where(and(eq(etape.creationId, id), eq(etape.ordre, rang + 1)));
      if (!ligneEtape) continue;
      const echanges = await ctx.tx
        .select({ id: echange.id, ordre: echange.ordre })
        .from(echange)
        .where(eq(echange.etapeId, ligneEtape.id));
      const echangeDe = (k: number) => echanges.find((x) => x.ordre === k + 1)?.id;
      for (const [k, ech] of e.echanges.entries()) {
        const echangeId = echangeDe(k);
        if (!ech.titre || echangeId === undefined) continue;
        compter(
          await ctx.tx
            .update(echange)
            .set({ titre: ech.titre })
            .where(and(eq(echange.id, echangeId), isNull(echange.titre)))
            .returning({ id: echange.id }),
        );
      }
      for (const m of e.moments) {
        if (!m.titre) continue;
        const echangeId = m.echange === undefined ? undefined : echangeDe(m.echange);
        compter(
          await ctx.tx
            .update(momentCle)
            .set({ titre: m.titre })
            .where(
              and(
                eq(momentCle.etapeId, ligneEtape.id),
                eq(momentCle.type, m.type),
                echangeId === undefined
                  ? isNull(momentCle.echangeId)
                  : eq(momentCle.echangeId, echangeId),
                isNull(momentCle.titre),
              ),
            )
            .returning({ id: momentCle.id }),
        );
      }
    }
  }
  for (const s of SUJETS) {
    const id = ctx.sujets.get(s.cle);
    if (!id || !s.outil) continue;
    compter(
      await ctx.tx
        .update(sujet)
        .set(outilEtModele(ctx, s.outil, s.modele))
        .where(and(eq(sujet.id, id), isNull(sujet.outilId)))
        .returning({ id: sujet.id }),
    );
  }
  for (const c of CAS) {
    const id = ctx.cas.get(c.cle);
    if (!id || !c.outil) continue;
    compter(
      await ctx.tx
        .update(casBonReflexe)
        .set(outilEtModele(ctx, c.outil, c.modele))
        .where(and(eq(casBonReflexe.id, id), isNull(casBonReflexe.outilId)))
        .returning({ id: casBonReflexe.id }),
    );
  }
}

/* Images (DEMO-02) ------------------------------------------------------------ */

/** Dossier des images du prototype (prototype/assets), cherché à partir de ce fichier. */
function dossierAssets(): string {
  let dossier = import.meta.dirname;
  for (let i = 0; i < 8; i += 1) {
    const candidat = join(dossier, 'prototype', 'assets');
    if (existsSync(candidat)) return candidat;
    dossier = dirname(dossier);
  }
  throw new Error(
    'Images du prototype introuvables (prototype/assets) : les données de démonstration en ont besoin.',
  );
}

/** Captures des résultats « maquette » du prototype (DEMO-03), à côté de ce fichier ; copiées dans dist
    par nest-cli pour `start:demo`. */
const DOSSIER_CAPTURES = join(import.meta.dirname, 'captures');

/** Capture d'un résultat « maquette » (en double résolution), ou image du prototype en grande taille
    (-1280), à défaut en 720 pixels. */
async function lireImagePrototype(assets: string, image: ImageDemo): Promise<Buffer> {
  if (image.capture) return readFile(join(DOSSIER_CAPTURES, `${image.fichier}.webp`));
  const grande = join(assets, 'images', `${image.fichier}-1280.webp`);
  return readFile(
    existsSync(grande) ? grande : join(assets, 'images', `${image.fichier}-720.webp`),
  );
}

async function chargerImages(ctx: Contexte, stockage: Stockage): Promise<void> {
  const assets = dossierAssets();
  // Une même image du prototype sert parfois deux fois : préparée une fois, écrite à chaque usage.
  const preparees = new Map<string, Promise<ImagePreparee>>();
  const preparee = (image: ImageDemo): Promise<ImagePreparee> => {
    const cle = `${image.capture ? 'capture' : 'prototype'}:${image.fichier}`;
    let preparation = preparees.get(cle);
    if (!preparation) {
      preparation = lireImagePrototype(assets, image).then(preparerImage);
      preparees.set(cle, preparation);
    }
    return preparation;
  };
  const joindre = async (
    image: ImageDemo,
    rattachement: { televerseurId: number; ordre: number } & (
      { contenuId: number } | { echangeId: number }
    ),
  ) => {
    await enregistrerImage(ctx.tx, stockage, await preparee(image), {
      ...rattachement,
      texteAlternatif: image.texteAlternatif,
      legende: image.legende ?? null,
    });
    ctx.bilan.images += 1;
  };

  // Photos de profil des membres qui n'en ont pas.
  const sansAvatar = new Set(
    (
      await ctx.tx
        .select({ id: utilisateur.id })
        .from(utilisateur)
        .where(
          and(
            inArray(
              utilisateur.id,
              [...ctx.membres.values()].map((m) => m.id),
            ),
            isNull(utilisateur.avatar),
          ),
        )
    ).map((ligne) => ligne.id),
  );
  for (const m of MEMBRES) {
    const id = ctx.membres.get(m.pseudo)?.id;
    if (!m.avatar || !id || !sansAvatar.has(id)) continue;
    const avatar = await preparerAvatar(
      await readFile(join(assets, 'avatars', `${m.avatar}.webp`)),
    );
    const cles = await ecrireDeclinaisons(stockage, [avatar]);
    await ctx.tx
      .update(utilisateur)
      .set({ avatar: cles[avatar.largeur] })
      .where(eq(utilisateur.id, id));
    ctx.bilan.avatars += 1;
  }

  // Images des créations (résultat) et de leurs échanges, pour les créations qui n'en ont aucune.
  for (const c of CREATIONS) {
    const id = ctx.creations.get(c.cle);
    const avecImages = c.images?.length || c.etapes.some((e) => e.echanges.some((x) => x.images));
    if (!id || !avecImages) continue;
    const echanges = await ctx.tx
      .select({ id: echange.id, etape: etape.ordre, ordre: echange.ordre })
      .from(echange)
      .innerJoin(etape, eq(etape.id, echange.etapeId))
      .where(eq(etape.creationId, id));
    const deja = await ctx.tx.$count(
      media,
      or(
        eq(media.contenuId, id),
        inArray(
          media.echangeId,
          echanges.map((e) => e.id),
        ),
      ),
    );
    if (deja) continue;

    const televerseurId = membre(ctx, c.auteur).id;
    for (const [ordre, image] of (c.images ?? []).entries())
      await joindre(image, { contenuId: id, televerseurId, ordre });
    for (const [rangEtape, e] of c.etapes.entries())
      for (const [rangEchange, x] of e.echanges.entries()) {
        if (!x.images?.length) continue;
        const echangeId = echanges.find(
          (l) => l.etape === rangEtape + 1 && l.ordre === rangEchange + 1,
        )?.id;
        if (!echangeId) throw new Error(`Échange introuvable : ${c.cle}, étape ${rangEtape + 1}`);
        for (const [ordre, image] of x.images.entries())
          await joindre(image, { echangeId, televerseurId, ordre });
      }
  }
}

async function chargerEnregistrements(ctx: Contexte): Promise<void> {
  const lignes = ENREGISTREMENTS.flatMap((e) => {
    if (!ctx.nouveaux.has(e.membre)) return [];
    const contenuId =
      'creation' in e.contenu
        ? ctx.creations.get(e.contenu.creation)
        : 'sujet' in e.contenu
          ? ctx.sujets.get(e.contenu.sujet)
          : ctx.cas.get(e.contenu.cas);
    if (contenuId === undefined)
      throw new Error(`Contenu enregistré inconnu : ${JSON.stringify(e.contenu)}`);
    return [
      {
        utilisateurId: membre(ctx, e.membre).id,
        contenuId,
        dateEnregistrement: dater(ctx, e.date),
      },
    ];
  });
  if (lignes.length) await ctx.tx.insert(enregistrement).values(lignes);
  ctx.bilan.enregistrements = lignes.length;
}

/* Réputation ---------------------------------------------------------------- */

/** Réputation des membres créés par ce chargement : chaque semaine (RG-87 : du lundi au dimanche, UTC)
    reçoit les points du prototype, puis le reste du total est réparti depuis l'inscription. */
function chargerReputation(ctx: Contexte): void {
  const jour = ctx.maintenant;
  const lundi = Date.UTC(
    jour.getUTCFullYear(),
    jour.getUTCMonth(),
    jour.getUTCDate() - ((jour.getUTCDay() + 6) % 7),
  );
  for (const m of MEMBRES) {
    if (!m.reputation || !ctx.nouveaux.has(m.pseudo)) continue;
    const { id, inscription } = membre(ctx, m.pseudo);
    const { total, semaines, detail } = m.reputation;
    for (const [k, points] of semaines.entries()) {
      const debut = plusTard(new Date(lundi - k * SEMAINE), inscription);
      const fin = new Date(lundi - (k - 1) * SEMAINE);
      const lignes = detail?.[k];
      if (!lignes) {
        crediterParJour(ctx, id, 'VOTE_UTILE_RECU', points, debut, fin);
        continue;
      }
      // Détail du prototype : un mouvement par événement, au barème indiqué.
      for (const ligne of lignes)
        for (const date of repartirDates(debut, plusTot(fin, ctx.maintenant), ligne.nombre))
          ctx.mouvements.push({
            beneficiaireId: id,
            points: ligne.points,
            motif: ligne.motif,
            date,
          });
    }
    const reste = total - semaines.reduce((a, b) => a + b, 0);
    if (reste > 0)
      crediterParJour(
        ctx,
        id,
        'VOTE_UTILE_RECU',
        reste,
        inscription,
        new Date(lundi - (semaines.length - 1) * SEMAINE),
      );
  }
}

/** Points répartis jour par jour dans [debut, fin[, sans dépasser l'heure du chargement ; un intervalle
    vide (membre inscrit après la période) les reçoit juste après son début. */
function crediterParJour(
  ctx: Contexte,
  beneficiaireId: number,
  motif: MotifMouvementReputation,
  points: number,
  debut: Date,
  fin: Date,
): void {
  const limite = plusTot(fin, ctx.maintenant);
  const derniere = new Date(ctx.maintenant.getTime() - MINUTE);
  if (limite <= debut) {
    const date = plusTot(new Date(debut.getTime() + HEURE), derniere);
    ctx.mouvements.push({ beneficiaireId, points, motif, date });
    return;
  }
  const jours = Math.ceil((limite.getTime() - debut.getTime()) / JOUR);
  for (let j = 0; j < jours; j += 1) {
    const part = Math.floor(points / jours) + (j < points % jours ? 1 : 0);
    if (part <= 0) continue;
    const date = plusTot(
      new Date(debut.getTime() + j * JOUR + 9 * HEURE),
      new Date(limite.getTime() - MINUTE),
    );
    ctx.mouvements.push({ beneficiaireId, points: part, motif, date });
  }
}
