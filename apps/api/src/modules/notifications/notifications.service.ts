import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  NOTIFICATIONS_EMAIL_IMPOSE,
  NOTIFICATIONS_EMAIL_REGLABLE,
  accepteUneReponse,
  emailDeNotification,
  preferencesEvenements,
  type ActionDecision,
  type BadgeApi,
  type CibleNotificationApi,
  type CodeNiveau,
  type LectureNotificationsApi,
  type MembreResumeApi,
  type MessageNotificationApi,
  type NotificationApi,
  type NotificationsApi,
  type OutilResumeApi,
  type PreferencesNotifications,
  type PreferencesNotificationsApi,
  type TypeContenu,
  type TypeNotification,
} from '@vysora/shared';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import {
  badge,
  casBonReflexe,
  categorie,
  commentaire,
  configurationIa,
  contenu,
  creation,
  defi,
  etape,
  media,
  message,
  modele,
  mouvementReputation,
  niveau,
  notification,
  outil,
  preferenceNotification,
  reproduction,
  sujet,
  utilisateur,
  vote,
} from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { FileTaches } from '../file/file-taches.js';
import { presenterMedia } from '../medias/medias.service.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { emailNotification } from './courriels.js';

/** Détails figés au moment de l'événement (colonne `donnees`) ; le reste est lu à l'affichage. */
export interface DonneesNotification {
  /** Points gagnés par le destinataire (essai réussi, votes, réponse acceptée, cas, défi). */
  points?: number;
  /** Réponse à un commentaire : le commentaire du destinataire auquel on a répondu. */
  origineId?: number;
  /** Badge obtenu, niveau atteint. */
  badge?: string;
  niveau?: CodeNiveau;
  /** Cas refusé, contenu masqué, décision : motif communiqué. */
  motif?: string;
  /** Défi clos. */
  defiId?: number;
  rang?: number;
  participants?: number;
  /** Contenu masqué ou rétabli, décision de modération : l'action et le contenu visé (type et
      intitulé, qui restent lisibles si le contenu est supprimé). */
  action?: ActionDecision;
  finSuspension?: string;
  typeContenu?: TypeContenu;
  intitule?: string;
  /** Obsolescence au-delà du seuil (RG-44). */
  modele?: string;
  membres?: number;
}

export interface Evenement {
  type: TypeNotification;
  destinataireId: number;
  /** Membre dont l'action déclenche la notification ; jamais notifié de sa propre action. */
  declencheurId?: number | null;
  /** Contenu objet de l'événement : le commentaire, l'essai, la réponse, le contenu voté… */
  contenuId?: number | null;
  donnees?: DonneesNotification;
  date?: Date;
}

/** Tâche de la file qui envoie les e-mails des notifications en attente (WF-25, PARAM-01). */
export const TACHE_EMAILS_NOTIFICATIONS = 'notifications.emails';
/** Notifications traitées par lot : chaque lot est réservé avant l'envoi (jamais deux fois). */
const LOT_EMAILS = 100;
/** Décisions de modération : elles restent lisibles quand le contenu visé est retiré. */
export const NOTIFICATIONS_DE_MODERATION: TypeNotification[] = [
  'CONTENU_MASQUE',
  'CONTENU_RETABLI',
  'DECISION_MODERATION',
];
/** Notifications d'un échange auquel le destinataire peut répondre (F-42). */
const COMMENTAIRES_RECUS: TypeNotification[] = ['COMMENTAIRE_RECU', 'REPONSE_COMMENTAIRE'];

const PAGE = 50;
const VOTANTS_MAXIMUM = 50;
const JOUR_MS = 24 * 60 * 60_000;

/** Jour UTC d'une date (AAAA-MM-JJ) : les votes se regroupent par jour, comme le plafond de RG-81. */
const jourUtc = (date: Date): string => date.toISOString().slice(0, 10);
const cleVotes = (contenuId: number, date: Date): string =>
  `VOTES_UTILE_RECUS:${contenuId}:${jourUtc(date)}`;

/** Lundi 00:00 UTC de la semaine d'une date (classement de la semaine, RG-87). */
function debutDeSemaine(date: Date): Date {
  const jour = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  jour.setUTCDate(jour.getUTCDate() - ((jour.getUTCDay() + 6) % 7));
  return jour;
}

/* Curseur de pagination : date et identifiant de la dernière notification de la page. */
const ecrireCurseur = (date: Date, id: number): string =>
  Buffer.from(`${date.getTime()}.${id}`).toString('base64url');
function lireCurseur(curseur: string | undefined): { date: Date; id: number } | null {
  if (!curseur) return null;
  const [temps, id] = Buffer.from(curseur, 'base64url').toString().split('.').map(Number);
  if (!Number.isSafeInteger(temps) || !Number.isSafeInteger(id)) return null;
  return { date: new Date(temps as number), id: id as number };
}

type LigneNotification = typeof notification.$inferSelect;

/** Contenu objet ou cible d'une notification, avec ce qui décide s'il reste visible du destinataire. */
interface ContenuLu {
  id: number;
  type: TypeContenu;
  auteurId: number;
  statut: string;
  date: Date;
}

/* NOTIF-01 : notifications dans l'application (F-81, RG-91, WF-25) et e-mails qui les accompagnent.
   Les modules appellent `notifier` (ou `voteRecu`, `niveauAtteint`) dans la transaction de l'action.
   Chaque notification naît « e-mail en attente » : la tâche `notifications.emails`, lancée chaque
   minute ou aussitôt par `envoyerEmails`, décide selon les préférences du destinataire (PARAM-01) et
   envoie ; une notification retirée entre-temps ne part pas. Ce qu'une notification montre d'un
   contenu (texte, titre, image) est lu à l'affichage, avec les règles de visibilité de RG-30. */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly journal = new Logger(NotificationsService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly stockage: Stockage,
    private readonly email: EmailService,
    private readonly file: FileTaches,
  ) {}

  onModuleInit(): void {
    this.file.declarer({
      nom: TACHE_EMAILS_NOTIFICATIONS,
      planification: '* * * * *',
      executer: async () => {
        const envoyes = await this.envoyerEmailsEnAttente();
        if (envoyes) this.journal.log({ envoyes }, 'E-mails de notification envoyés');
      },
      reprises: { nombre: 2, delaiSecondes: 60 },
      dureeMaximaleSecondes: 300,
      conservationSecondes: 3600,
    });
  }

  /** RG-91 : crée la notification d'un événement. Renvoie son identifiant, ou null si le membre
      est l'auteur de l'action. */
  async notifier(db: Executeur, evenement: Evenement): Promise<number | null> {
    if (evenement.declencheurId === evenement.destinataireId) return null;
    const [ligne] = await db
      .insert(notification)
      .values({
        destinataireId: evenement.destinataireId,
        declencheurId: evenement.declencheurId ?? null,
        contenuId: evenement.contenuId ?? null,
        type: evenement.type,
        donnees: (evenement.donnees ?? null) as Record<string, unknown> | null,
        date: evenement.date ?? new Date(),
        emailEnAttente: !NOTIFICATIONS_EMAIL_IMPOSE.includes(evenement.type),
      })
      .returning({ id: notification.id });
    return ligne?.id ?? null;
  }

  /** RG-91 : votes « Utile » regroupés par contenu et par jour. Un nouveau vote rend la
      notification du jour non lue, à la date du vote, avec les points qu'il a rapportés. */
  async voteRecu(
    db: Executeur,
    recu: { destinataireId: number; votantId: number; contenuId: number; points: number },
    maintenant = new Date(),
  ): Promise<void> {
    if (recu.votantId === recu.destinataireId) return;
    await db
      .insert(notification)
      .values({
        destinataireId: recu.destinataireId,
        declencheurId: recu.votantId,
        contenuId: recu.contenuId,
        type: 'VOTES_UTILE_RECUS',
        date: maintenant,
        donnees: { points: recu.points },
        cleRegroupement: cleVotes(recu.contenuId, maintenant),
        // RG-91 : l'e-mail résume la journée ; il part le lendemain (envoyerEmailsEnAttente).
        emailEnAttente: true,
      })
      .onConflictDoUpdate({
        target: [notification.destinataireId, notification.cleRegroupement],
        targetWhere: isNotNull(notification.cleRegroupement),
        set: {
          declencheurId: recu.votantId,
          date: maintenant,
          estLue: false,
          nombreRegroupe: sql`${notification.nombreRegroupe} + 1`,
          donnees: sql`jsonb_build_object('points', coalesce((${notification.donnees} ->> 'points')::int, 0) + ${recu.points}::int)`,
        },
      });
  }

  /** Vote retiré : la notification de son jour est recomptée ; sans vote restant, elle disparaît. */
  async voteRetire(
    db: Executeur,
    retrait: { destinataireId: number; contenuId: number; dateVote: Date; pointsAnnules: number },
  ): Promise<void> {
    const debut = new Date(`${jourUtc(retrait.dateVote)}T00:00:00Z`);
    const restants = await db.$count(
      vote,
      and(
        eq(vote.contenuId, retrait.contenuId),
        eq(vote.typeVoteCode, 'UTILE'),
        gte(vote.dateVote, debut),
        lt(vote.dateVote, new Date(debut.getTime() + JOUR_MS)),
      ),
    );
    const cible = and(
      eq(notification.destinataireId, retrait.destinataireId),
      eq(notification.cleRegroupement, cleVotes(retrait.contenuId, retrait.dateVote)),
    );
    if (!restants) {
      await db.delete(notification).where(cible);
      return;
    }
    await db
      .update(notification)
      .set({
        nombreRegroupe: restants,
        donnees: sql`jsonb_build_object('points', greatest(0, coalesce((${notification.donnees} ->> 'points')::int, 0) - ${retrait.pointsAnnules}::int))`,
      })
      .where(cible);
  }

  /** Changement de niveau à la hausse (F-71) : une seule notification par niveau, même si la
      réputation redescend puis remonte. */
  async niveauAtteint(db: Executeur, membreId: number, code: CodeNiveau, date = new Date()) {
    await db
      .insert(notification)
      .values({
        destinataireId: membreId,
        type: 'NIVEAU_ATTEINT',
        date,
        donnees: { niveau: code },
        cleRegroupement: `NIVEAU_ATTEINT:${code}`,
        emailEnAttente: true,
      })
      .onConflictDoNothing();
  }

  /** Contenus retirés (par leur auteur ou par la modération) : les notifications qu'ils ont fait
      naître disparaissent, compteur de l'en-tête compris, sauf les décisions de modération qui les
      visent. `types` limite le retrait à ces événements (réponse qui n'est plus acceptée). */
  async retirer(db: Executeur, contenuIds: number[], types?: TypeNotification[]): Promise<void> {
    if (!contenuIds.length) return;
    await db
      .delete(notification)
      .where(
        and(
          inArray(notification.contenuId, contenuIds),
          notInArray(notification.type, NOTIFICATIONS_DE_MODERATION),
          types ? inArray(notification.type, types) : undefined,
        ),
      );
  }

  /** Après la validation d'une action dont le membre attend vite l'e-mail (réponse du forum) : la
      tâche des e-mails en attente part aussitôt, sans attendre la minute suivante. */
  async envoyerEmails(): Promise<void> {
    try {
      await this.file.publier(TACHE_EMAILS_NOTIFICATIONS, {});
    } catch (erreur) {
      // La tâche planifiée les enverra à la minute suivante.
      this.journal.warn({ err: erreur }, 'Envoi des e-mails de notification différé');
    }
  }

  /** WF-25, F-81 : e-mails des notifications en attente, selon les préférences de chaque
      destinataire, à une adresse vérifiée d'un compte actif. Les votes « Utile » d'un jour partent
      le lendemain, en un seul e-mail (RG-91). Chaque lot est réservé avant l'envoi : une notification
      ne part jamais deux fois ; une mise en file impossible est journalisée. */
  async envoyerEmailsEnAttente(maintenant = new Date()): Promise<number> {
    const debutDuJour = new Date(`${jourUtc(maintenant)}T00:00:00Z`);
    let envoyes = 0;
    for (;;) {
      const lot = this.db
        .select({ id: notification.id })
        .from(notification)
        .where(
          and(
            eq(notification.emailEnAttente, true),
            or(ne(notification.type, 'VOTES_UTILE_RECUS'), lt(notification.date, debutDuJour)),
          ),
        )
        .orderBy(asc(notification.id))
        .limit(LOT_EMAILS)
        .for('update', { skipLocked: true });
      const reserves = await this.db
        .update(notification)
        .set({ emailEnAttente: false })
        .where(inArray(notification.id, lot))
        .returning({ id: notification.id });
      if (!reserves.length) return envoyes;
      envoyes += await this.envoyerLot(reserves.map((ligne) => ligne.id));
      if (reserves.length < LOT_EMAILS) return envoyes;
    }
  }

  private async envoyerLot(ids: number[]): Promise<number> {
    const lignes = await this.db
      .select({
        notification,
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
        statut: utilisateur.statutCompte,
        general: utilisateur.notificationsEmail,
        choix: preferenceNotification.email,
      })
      .from(notification)
      .innerJoin(utilisateur, eq(utilisateur.id, notification.destinataireId))
      .leftJoin(
        preferenceNotification,
        and(
          eq(preferenceNotification.utilisateurId, notification.destinataireId),
          eq(preferenceNotification.evenement, notification.type),
        ),
      )
      .where(inArray(notification.id, ids))
      .orderBy(asc(notification.id));
    let envoyes = 0;
    for (const ligne of lignes) {
      const voulu = emailDeNotification(ligne.notification.type, ligne.general, ligne.choix);
      if (!voulu || !ligne.email || !ligne.emailVerifie || ligne.statut !== 'ACTIF') continue;
      const [presentee] = await this.presenter(ligne.notification.destinataireId, [
        ligne.notification,
      ]);
      // Contenu retiré ou devenu invisible entre-temps : rien à annoncer.
      if (!presentee?.disponible) continue;
      try {
        await this.email.envoyer(emailNotification(ligne.email, presentee, this.config.SITE_URL));
        envoyes += 1;
      } catch (erreur) {
        this.journal.error(
          { err: erreur, notification: presentee.id },
          'E-mail de notification non envoyé',
        );
      }
    }
    return envoyes;
  }

  /** GET /api/v1/notifications : la plus récente d'abord, par pages de 50. */
  async lister(
    membreId: number,
    curseur?: string,
    maintenant = new Date(),
  ): Promise<NotificationsApi> {
    const apres = lireCurseur(curseur);
    const lignes = await this.db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.destinataireId, membreId),
          apres
            ? or(
                lt(notification.date, apres.date),
                and(eq(notification.date, apres.date), lt(notification.id, apres.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(notification.date), desc(notification.id))
      .limit(PAGE + 1);
    const page = lignes.slice(0, PAGE);
    const derniere = page.at(-1);

    const [elements, nonLues, [membre], [reputation], [semaine]] = await Promise.all([
      this.presenter(membreId, page),
      this.compterNonLues(membreId),
      this.db
        .select({
          email: utilisateur.notificationsEmail,
          inscription: utilisateur.dateInscription,
        })
        .from(utilisateur)
        .where(eq(utilisateur.id, membreId)),
      this.sommePoints(membreId),
      this.sommePoints(membreId, debutDeSemaine(maintenant)),
    ]);
    return {
      elements,
      suivant: lignes.length > PAGE && derniere ? ecrireCurseur(derniere.date, derniere.id) : null,
      nonLues,
      email: membre?.email ?? true,
      points: Math.max(0, reputation?.points ?? 0),
      pointsSemaine: semaine?.points ?? 0,
      dateInscription: (membre?.inscription ?? maintenant).toISOString(),
    };
  }

  /** F-81 : une notification passe à « lue » quand le membre la consulte ; il peut la remettre à « non lue ». */
  async marquer(membreId: number, ids: number[], lue: boolean): Promise<LectureNotificationsApi> {
    const modifiees = await this.db
      .update(notification)
      .set({ estLue: lue })
      .where(
        and(
          eq(notification.destinataireId, membreId),
          inArray(notification.id, ids),
          eq(notification.estLue, !lue),
        ),
      )
      .returning({ id: notification.id });
    return { nonLues: await this.compterNonLues(membreId), ids: modifiees.map((n) => n.id) };
  }

  /** « Tout marquer comme lu » : les identifiants reviennent pour permettre l'annulation. */
  async toutLire(membreId: number): Promise<LectureNotificationsApi> {
    const lues = await this.db
      .update(notification)
      .set({ estLue: true })
      .where(and(eq(notification.destinataireId, membreId), eq(notification.estLue, false)))
      .returning({ id: notification.id });
    return { nonLues: 0, ids: lues.map((n) => n.id) };
  }

  /** F-81, WF-25 : envoi par e-mail en général et choix par événement (valeur par défaut sans ligne). */
  async preferences(membreId: number): Promise<PreferencesNotificationsApi> {
    const [[membre], choix] = await Promise.all([
      this.db
        .select({ email: utilisateur.notificationsEmail })
        .from(utilisateur)
        .where(eq(utilisateur.id, membreId)),
      this.db
        .select({
          evenement: preferenceNotification.evenement,
          email: preferenceNotification.email,
        })
        .from(preferenceNotification)
        .where(eq(preferenceNotification.utilisateurId, membreId)),
    ]);
    return {
      email: membre?.email ?? true,
      evenements: preferencesEvenements(
        Object.fromEntries(choix.map((ligne) => [ligne.evenement, ligne.email])),
      ),
    };
  }

  /** PARAM-01 : les mesures de la modération ne se règlent pas (RG-90) ; leur choix est ignoré. */
  async modifierPreferences(
    membreId: number,
    saisie: PreferencesNotifications,
  ): Promise<PreferencesNotificationsApi> {
    const choix = Object.entries(saisie.evenements ?? {}).filter(([type]) =>
      NOTIFICATIONS_EMAIL_REGLABLE.includes(type as TypeNotification),
    ) as [TypeNotification, boolean][];
    await this.db.transaction(async (tx) => {
      if (saisie.email !== undefined)
        await tx
          .update(utilisateur)
          .set({ notificationsEmail: saisie.email })
          .where(eq(utilisateur.id, membreId));
      if (choix.length)
        await tx
          .insert(preferenceNotification)
          .values(
            choix.map(([evenement, email]) => ({ utilisateurId: membreId, evenement, email })),
          )
          .onConflictDoUpdate({
            target: [preferenceNotification.utilisateurId, preferenceNotification.evenement],
            set: { email: sql`excluded.email` },
          });
    });
    return this.preferences(membreId);
  }

  compterNonLues(membreId: number): Promise<number> {
    return this.db.$count(
      notification,
      and(eq(notification.destinataireId, membreId), eq(notification.estLue, false)),
    );
  }

  private async sommePoints(membreId: number, depuis?: Date) {
    return this.db
      .select({ points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int` })
      .from(mouvementReputation)
      .where(
        and(
          eq(mouvementReputation.beneficiaireId, membreId),
          depuis ? gte(mouvementReputation.date, depuis) : undefined,
        ),
      );
  }

  /* Présentation ------------------------------------------------------------------------------ */

  /** Notifications telles que la page les affiche, lues avec ce que le destinataire peut voir. */
  async presenter(membreId: number, lignes: LigneNotification[]): Promise<NotificationApi[]> {
    if (!lignes.length) return [];
    const donnees = (n: LigneNotification) => (n.donnees ?? {}) as DonneesNotification;

    // 1. Contenus objets des notifications et contenus qui les portent (création, sujet, cas).
    const objetIds = lignes.flatMap((n) => (n.contenuId === null ? [] : [n.contenuId]));
    const objets = await this.lireContenus(objetIds);
    const [commentaires, reproductions, messages, sources] = await Promise.all([
      objetIds.length
        ? this.db
            .select({
              id: commentaire.id,
              creationId: commentaire.creationId,
              parentId: commentaire.parentId,
              corps: commentaire.corps,
            })
            .from(commentaire)
            .where(inArray(commentaire.id, objetIds))
        : [],
      objetIds.length
        ? this.db
            .select({
              id: reproduction.id,
              creationId: reproduction.creationId,
              resultat: reproduction.resultat,
              retour: reproduction.retour,
              outil: {
                id: outil.id,
                nom: outil.nom,
                slug: outil.slug,
                logo: outil.logo,
                logoMonochrome: outil.logoMonochrome,
              },
              modele: modele.nomCourt,
              modeleNonReference: reproduction.modeleNonReference,
            })
            .from(reproduction)
            .innerJoin(outil, eq(outil.id, reproduction.outilId))
            .leftJoin(modele, eq(modele.id, reproduction.modeleId))
            .where(inArray(reproduction.id, objetIds))
        : [],
      objetIds.length
        ? this.db
            .select({ id: message.id, sujetId: message.sujetId, corps: message.corps })
            .from(message)
            .where(inArray(message.id, objetIds))
        : [],
      objetIds.length
        ? this.db
            .select({ id: creation.id, sourceId: creation.sourceId })
            .from(creation)
            .where(inArray(creation.id, objetIds))
        : [],
    ]);
    const commentaireDe = new Map(commentaires.map((c) => [c.id, c]));
    const reproductionDe = new Map(reproductions.map((r) => [r.id, r]));
    const messageDe = new Map(messages.map((m) => [m.id, m]));
    const sourceDe = new Map(sources.map((s) => [s.id, s.sourceId]));

    /** Contenu qui porte l'objet : la création d'un commentaire ou d'un essai, le sujet d'une réponse. */
    const cibleIdDe = (n: LigneNotification): number | null => {
      if (n.contenuId === null) return null;
      if (n.type === 'VARIANTE_PUBLIEE') return sourceDe.get(n.contenuId) ?? null;
      const objet = objets.get(n.contenuId);
      if (!objet) return null;
      if (objet.type === 'COMMENTAIRE') return commentaireDe.get(objet.id)?.creationId ?? null;
      if (objet.type === 'REPRODUCTION') return reproductionDe.get(objet.id)?.creationId ?? null;
      if (objet.type === 'MESSAGE') return messageDe.get(objet.id)?.sujetId ?? null;
      return objet.id;
    };

    // 2. Cibles, fils de commentaires et de réponses, votants, référentiels.
    const cibleIds = lignes.flatMap((n) => {
      const id = cibleIdDe(n);
      return id === null ? [] : [id];
    });
    const varianteIds = lignes.flatMap((n) =>
      n.type === 'VARIANTE_PUBLIEE' && n.contenuId !== null ? [n.contenuId] : [],
    );
    const origineIds = lignes.flatMap((n) => {
      if (n.contenuId === null) return [];
      const c = commentaireDe.get(n.contenuId);
      const origine = donnees(n).origineId ?? c?.parentId;
      return origine ? [origine] : [];
    });
    const [cibles, origines, reponsesCommentaires, reponsesForum, votants, badges, niveaux, defis] =
      await Promise.all([
        this.lireCibles(membreId, [...cibleIds, ...varianteIds]),
        origineIds.length
          ? this.db
              .select({
                id: commentaire.id,
                corps: commentaire.corps,
                auteurId: contenu.auteurId,
                statut: contenu.statut,
                date: contenu.dateCreation,
              })
              .from(commentaire)
              .innerJoin(contenu, eq(contenu.id, commentaire.id))
              .where(inArray(commentaire.id, origineIds))
          : [],
        this.reponsesDuMembre(
          membreId,
          commentaires.map((c) => c.parentId ?? c.id),
        ),
        this.messagesDuMembre(
          membreId,
          messages.map((m) => m.sujetId),
        ),
        this.votantsDuJour(lignes.filter((n) => n.type === 'VOTES_UTILE_RECUS')),
        this.lireBadges(
          lignes.flatMap((n) => (donnees(n).badge ? [donnees(n).badge as string] : [])),
        ),
        lignes.some((n) => n.type === 'NIVEAU_ATTEINT')
          ? this.db.select().from(niveau)
          : Promise.resolve([]),
        this.lireDefis(
          lignes.flatMap((n) => (donnees(n).defiId ? [donnees(n).defiId as number] : [])),
        ),
      ]);
    const origineDe = new Map(origines.map((o) => [o.id, o]));

    // 3. Membres cités : déclencheurs, votants, auteurs des fils.
    const membres = await resumerMembres(this.db, this.stockage, [
      membreId,
      ...lignes.flatMap((n) => (n.declencheurId === null ? [] : [n.declencheurId])),
      ...[...votants.values()].flat(),
      ...origines.map((o) => o.auteurId),
    ]);
    const resume = (id: number | null): MembreResumeApi | null =>
      id === null ? null : (membres.get(id) ?? null);
    const fil = (auteurId: number, texte: string, date: Date): MessageNotificationApi => ({
      auteur: resume(auteurId),
      moi: auteurId === membreId,
      texte,
      date: date.toISOString(),
    });

    return lignes.map((n): NotificationApi => {
      const d = donnees(n);
      const objet = n.contenuId === null ? null : (objets.get(n.contenuId) ?? null);
      const cibleId = cibleIdDe(n);
      const cible = cibleId === null ? null : (cibles.get(cibleId) ?? null);
      // Objet ou cible absents, retirés, masqués ou devenus privés : rien de leur contenu ne
      // s'affiche. Une décision de modération se lit encore : action, motif et intitulé gardés.
      const disponible =
        (n.contenuId === null || (objet !== null && this.visible(objet, membreId))) &&
        (cibleId === null || cible !== null);

      const presentee: NotificationApi = {
        id: n.id,
        type: n.type,
        date: n.date.toISOString(),
        lue: n.estLue,
        nombre: n.nombreRegroupe,
        par: resume(n.declencheurId),
        votants: (votants.get(n.id) ?? []).flatMap((id) => {
          const m = membres.get(id);
          return m ? [m] : [];
        }),
        disponible,
        cible: disponible ? (cible?.api ?? null) : null,
        surReponse: n.type === 'VOTES_UTILE_RECUS' && objet?.type === 'MESSAGE',
        texte: null,
        origine: null,
        reponse: null,
        repondreA: null,
        repondreSujet: null,
        points: d.points ?? null,
        reproduction: null,
        variante: null,
        badge: d.badge ? (badges.get(d.badge) ?? null) : null,
        niveau: null,
        defi: null,
        motif: d.motif ?? null,
        decision: d.action
          ? {
              action: d.action,
              finSuspension: d.finSuspension ?? null,
              contenu:
                d.typeContenu && d.intitule ? { type: d.typeContenu, intitule: d.intitule } : null,
            }
          : null,
        obsolescence: d.modele && d.membres ? { modele: d.modele, membres: d.membres } : null,
        acceptee: false,
        sujetResolu: false,
      };

      if (n.type === 'NIVEAU_ATTEINT') {
        const atteint = niveaux.find((x) => x.code === d.niveau);
        presentee.niveau = atteint
          ? {
              rang: atteint.rang,
              code: atteint.code,
              libelle: atteint.libelle,
              seuilPoints: atteint.seuilPoints,
            }
          : null;
      }
      if (n.type === 'RESULTAT_DEFI' && d.defiId) {
        const leDefi = defis.get(d.defiId);
        if (leDefi) {
          presentee.cible = leDefi.api;
          presentee.defi = {
            rang: d.rang ?? 0,
            participants: d.participants ?? 0,
            dateDebut: leDefi.debut.toISOString(),
            dateFin: leDefi.fin.toISOString(),
          };
        }
      }
      if (!disponible || !objet) return presentee;

      const c = commentaireDe.get(objet.id);
      if (c) {
        presentee.texte = c.corps;
        const origine = origineDe.get(d.origineId ?? c.parentId ?? -1);
        if (origine && origine.statut === 'VISIBLE')
          presentee.origine = fil(origine.auteurId, origine.corps, origine.date);
        const reponse = (reponsesCommentaires.get(c.parentId ?? c.id) ?? []).find(
          (r) => r.date > objet.date,
        );
        if (reponse) presentee.reponse = fil(membreId, reponse.corps, reponse.date);
        if (
          COMMENTAIRES_RECUS.includes(n.type) &&
          cible?.api.nature === 'CREATION' &&
          cible.publiee
        )
          presentee.repondreA = { creationId: c.creationId, commentaireId: c.id };
      }
      const r = reproductionDe.get(objet.id);
      if (r) {
        presentee.texte = r.retour;
        presentee.reproduction = {
          resultat: r.resultat,
          outil: r.outil,
          modele: r.modele ?? r.modeleNonReference,
        };
      }
      const m = messageDe.get(objet.id);
      if (m) {
        presentee.texte = m.corps;
        presentee.acceptee = cible?.messageAccepteId === m.id;
        presentee.sujetResolu = cible?.messageAccepteId != null;
        if (n.type === 'REPONSE_SUJET') {
          const reponse = (reponsesForum.get(m.sujetId) ?? []).find((x) => x.date > objet.date);
          if (reponse) presentee.reponse = fil(membreId, reponse.corps, reponse.date);
          // F-51 : répondre dans un sujet visible et ouvert ; F-52, RG-63 : son auteur accepte la
          // réponse visible d'un autre membre à une question ou une clinique pas encore résolue.
          if (cible?.api.nature === 'SUJET' && cible.publiee && !cible.ferme)
            presentee.repondreSujet = {
              sujetId: m.sujetId,
              messageId: m.id,
              accepter:
                cible.api.aMoi &&
                objet.statut === 'VISIBLE' &&
                objet.auteurId !== membreId &&
                !presentee.sujetResolu &&
                cible.api.typeSujet !== null &&
                accepteUneReponse(cible.api.typeSujet),
            };
        }
      }
      if (n.type === 'VARIANTE_PUBLIEE') {
        const variante = cibles.get(objet.id);
        presentee.variante = variante
          ? { ...variante.api, outil: variante.outil, modele: variante.modele }
          : null;
      }
      return presentee;
    });
  }

  /** RG-30, du point de vue du destinataire : son contenu reste visible tant qu'il n'est pas
      supprimé (même masqué) ; celui des autres seulement s'il est visible. */
  private visible(objet: ContenuLu, membreId: number): boolean {
    if (objet.statut === 'SUPPRIME') return false;
    return objet.statut === 'VISIBLE' || objet.auteurId === membreId;
  }

  private async lireContenus(ids: number[]): Promise<Map<number, ContenuLu>> {
    if (!ids.length) return new Map();
    const lignes = await this.db
      .select({
        id: contenu.id,
        type: contenu.typeContenu,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        date: contenu.dateCreation,
      })
      .from(contenu)
      .where(inArray(contenu.id, [...new Set(ids)]));
    return new Map(lignes.map((l) => [l.id, l]));
  }

  /** Créations, sujets et cas que le destinataire peut ouvrir (RG-30), présentés pour le volet. */
  private async lireCibles(membreId: number, ids: number[]) {
    const resultat = new Map<
      number,
      {
        api: CibleNotificationApi;
        publiee: boolean;
        /** Sujet fermé (RG-65) : plus de réponse ni d'acceptation. */
        ferme: boolean;
        messageAccepteId: number | null;
        outil: OutilResumeApi | null;
        modele: string | null;
      }
    >();
    const uniques = [...new Set(ids)];
    if (!uniques.length) return resultat;
    const [contenus, creations, sujets, cas, images, configurations] = await Promise.all([
      this.lireContenus(uniques),
      this.db
        .select({
          id: creation.id,
          titre: creation.titre,
          slug: creation.slug,
          type: creation.typeCreation,
          statut: creation.statutPublication,
          datePublication: creation.datePublication,
          categorie: categorie.libelle,
        })
        .from(creation)
        .leftJoin(categorie, eq(categorie.id, creation.categorieId))
        .where(inArray(creation.id, uniques)),
      this.db
        .select({
          id: sujet.id,
          titre: sujet.titre,
          slug: sujet.slug,
          type: sujet.typeSujet,
          messageAccepteId: sujet.messageAccepteId,
          dateFermeture: sujet.dateFermeture,
        })
        .from(sujet)
        .where(inArray(sujet.id, uniques)),
      this.db
        .select({
          id: casBonReflexe.id,
          titre: casBonReflexe.titre,
          slug: casBonReflexe.slug,
          validation: casBonReflexe.statutValidation,
        })
        .from(casBonReflexe)
        .where(inArray(casBonReflexe.id, uniques)),
      this.db
        .select()
        .from(media)
        .where(inArray(media.contenuId, uniques))
        .orderBy(asc(media.ordre), asc(media.id)),
      this.premieresConfigurations(uniques),
    ]);
    const auteurs = await resumerMembres(
      this.db,
      this.stockage,
      [...contenus.values()].map((c) => c.auteurId),
    );
    const base = (c: ContenuLu) => ({
      id: c.id,
      aMoi: c.auteurId === membreId,
      typeCreation: null,
      categorie: null,
      auteur: auteurs.get(c.auteurId) ?? null,
      datePublication: null,
      image: null,
      typeSujet: null,
    });

    for (const ligne of creations) {
      const c = contenus.get(ligne.id);
      // Brouillon : seul son auteur l'ouvre (RG-30, RG-17).
      if (!c || !this.visible(c, membreId) || !ligne.titre) continue;
      if (ligne.statut !== 'PUBLIEE' && c.auteurId !== membreId) continue;
      const siennes = images.filter((i) => i.contenuId === ligne.id);
      const image = siennes.find((i) => i.echangeId === null) ?? siennes.at(-1);
      const configuration = configurations.get(ligne.id);
      resultat.set(ligne.id, {
        api: {
          ...base(c),
          nature: 'CREATION',
          slug: ligne.slug,
          titre: ligne.titre,
          typeCreation: ligne.type,
          categorie: ligne.categorie,
          datePublication: ligne.datePublication?.toISOString() ?? null,
          image: image ? presenterMedia(this.stockage, image) : null,
        },
        publiee: ligne.statut === 'PUBLIEE' && c.statut === 'VISIBLE',
        ferme: false,
        messageAccepteId: null,
        outil: configuration?.outil ?? null,
        modele: configuration?.modele ?? null,
      });
    }
    for (const ligne of sujets) {
      const c = contenus.get(ligne.id);
      if (!c || !this.visible(c, membreId)) continue;
      resultat.set(ligne.id, {
        api: {
          ...base(c),
          nature: 'SUJET',
          slug: ligne.slug,
          titre: ligne.titre,
          typeSujet: ligne.type,
        },
        publiee: c.statut === 'VISIBLE',
        ferme: ligne.dateFermeture !== null,
        messageAccepteId: ligne.messageAccepteId,
        outil: null,
        modele: null,
      });
    }
    for (const ligne of cas) {
      const c = contenus.get(ligne.id);
      if (!c || !this.visible(c, membreId)) continue;
      if (ligne.validation !== 'VALIDE' && c.auteurId !== membreId) continue;
      resultat.set(ligne.id, {
        api: { ...base(c), nature: 'CAS_BON_REFLEXE', slug: ligne.slug, titre: ligne.titre },
        publiee: ligne.validation === 'VALIDE' && c.statut === 'VISIBLE',
        ferme: false,
        messageAccepteId: null,
        outil: null,
        modele: null,
      });
    }
    return resultat;
  }

  /** Outil et modèle de la première configuration d'une création (variante : son outil principal). */
  private async premieresConfigurations(ids: number[]) {
    const lignes = await this.db
      .select({
        creationId: etape.creationId,
        outil: {
          id: outil.id,
          nom: outil.nom,
          slug: outil.slug,
          logo: outil.logo,
          logoMonochrome: outil.logoMonochrome,
        },
        modele: modele.nomCourt,
        modeleNonReference: configurationIa.modeleNonReference,
      })
      .from(configurationIa)
      .innerJoin(etape, eq(etape.id, configurationIa.etapeId))
      .leftJoin(outil, eq(outil.id, configurationIa.outilId))
      .leftJoin(modele, eq(modele.id, configurationIa.modeleId))
      .where(inArray(etape.creationId, ids))
      .orderBy(asc(etape.ordre), asc(configurationIa.ordre), asc(configurationIa.id));
    const resultat = new Map<number, { outil: OutilResumeApi | null; modele: string | null }>();
    for (const l of lignes)
      if (!resultat.has(l.creationId))
        resultat.set(l.creationId, { outil: l.outil, modele: l.modele ?? l.modeleNonReference });
    return resultat;
  }

  /** Commentaires du destinataire dans ces fils (commentaire d'origine et ses réponses). */
  private async reponsesDuMembre(membreId: number, racines: number[]) {
    const resultat = new Map<number, { corps: string; date: Date }[]>();
    if (!racines.length) return resultat;
    const lignes = await this.db
      .select({
        racine: commentaire.parentId,
        corps: commentaire.corps,
        date: contenu.dateCreation,
      })
      .from(commentaire)
      .innerJoin(contenu, eq(contenu.id, commentaire.id))
      .where(
        and(
          inArray(commentaire.parentId, [...new Set(racines)]),
          eq(contenu.auteurId, membreId),
          eq(contenu.statut, 'VISIBLE'),
        ),
      )
      .orderBy(asc(contenu.dateCreation));
    for (const l of lignes)
      if (l.racine !== null) resultat.set(l.racine, [...(resultat.get(l.racine) ?? []), l]);
    return resultat;
  }

  /** Réponses du destinataire dans ces sujets du forum. */
  private async messagesDuMembre(membreId: number, sujetIds: number[]) {
    const resultat = new Map<number, { corps: string; date: Date }[]>();
    if (!sujetIds.length) return resultat;
    const lignes = await this.db
      .select({ sujetId: message.sujetId, corps: message.corps, date: contenu.dateCreation })
      .from(message)
      .innerJoin(contenu, eq(contenu.id, message.id))
      .where(
        and(
          inArray(message.sujetId, [...new Set(sujetIds)]),
          eq(contenu.auteurId, membreId),
          eq(contenu.statut, 'VISIBLE'),
        ),
      )
      .orderBy(asc(contenu.dateCreation));
    for (const l of lignes) resultat.set(l.sujetId, [...(resultat.get(l.sujetId) ?? []), l]);
    return resultat;
  }

  /** Votants « Utile » du jour de chaque notification regroupée, du plus récent au plus ancien. */
  private async votantsDuJour(lignes: LigneNotification[]) {
    const resultat = new Map<number, number[]>();
    await Promise.all(
      lignes.map(async (n) => {
        const jour = n.cleRegroupement?.split(':')[2];
        if (n.contenuId === null || !jour) return;
        const debut = new Date(`${jour}T00:00:00Z`);
        const votes = await this.db
          .select({ votantId: vote.votantId })
          .from(vote)
          .where(
            and(
              eq(vote.contenuId, n.contenuId),
              eq(vote.typeVoteCode, 'UTILE'),
              gte(vote.dateVote, debut),
              lt(vote.dateVote, new Date(debut.getTime() + JOUR_MS)),
            ),
          )
          .orderBy(desc(vote.dateVote))
          .limit(VOTANTS_MAXIMUM);
        resultat.set(
          n.id,
          votes.map((v) => v.votantId),
        );
      }),
    );
    return resultat;
  }

  private async lireBadges(codes: string[]): Promise<Map<string, BadgeApi>> {
    if (!codes.length) return new Map();
    const lignes = await this.db
      .select({
        code: badge.code,
        libelle: badge.libelle,
        critere: badge.critere,
        categorie: badge.categorie,
        icone: badge.icone,
        ton: badge.ton,
      })
      .from(badge)
      .where(inArray(badge.code, [...new Set(codes)]));
    return new Map(lignes.map((b) => [b.code, b]));
  }

  private async lireDefis(ids: number[]) {
    const resultat = new Map<number, { api: CibleNotificationApi; debut: Date; fin: Date }>();
    if (!ids.length) return resultat;
    const lignes = await this.db
      .select()
      .from(defi)
      .where(inArray(defi.id, [...new Set(ids)]));
    for (const l of lignes)
      resultat.set(l.id, {
        api: {
          nature: 'DEFI',
          id: l.id,
          slug: l.slug,
          titre: l.titre,
          aMoi: false,
          typeCreation: null,
          categorie: null,
          auteur: null,
          datePublication: null,
          image: null,
          typeSujet: null,
        },
        debut: l.dateDebut,
        fin: l.dateFin,
      });
    return resultat;
  }
}
