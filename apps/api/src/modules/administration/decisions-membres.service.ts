import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  actionsAdministrateurPossibles,
  type DecisionAdministrateur,
  type DecisionApi,
  type DossierMembreApi,
  type StatutCompte,
} from '@vysora/shared';
import { and, desc, eq, gt, max, or, sql } from 'drizzle-orm';
import { conflit, erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  badge,
  contenu,
  decisionModeration,
  mouvementReputation,
  obtentionBadge,
  session,
  utilisateur,
} from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { emailDecisionMembre, referenceDecision } from '../moderation/courriels.js';
import { DossiersService } from '../moderation/dossiers.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReputationService } from '../progression/reputation.service.js';
import { AdministrationService, type Acteur } from './administration.service.js';

const DECISIONS_MAXIMUM = 50;

/** Pourquoi une décision n'est pas possible sur ce compte (actionsAdministrateurPossibles). */
function refus(action: DecisionAdministrateur['action'], statut: StatutCompte): Error {
  if (statut === 'BANNI')
    return conflit('Ce compte est fermé : plus aucune décision n’est possible.');
  if (statut === 'SUPPRIME') return conflit('Ce compte a été supprimé.');
  if (action === 'BANNIR')
    return conflit(
      'Ce membre a demandé la suppression de son compte : il sera supprimé au terme des 30 jours. S’il se reconnecte, sa demande est annulée et le compte peut alors être fermé.',
    );
  return conflit('Ce membre n’a aucun badge à retirer.');
}

/* RG-102 : décisions réservées aux administrateurs, qui visent un membre (CI-19). Bannir ferme le
   compte et ses sessions (RG-103) ; ajuster la réputation (fraude avérée) inscrit un mouvement
   AJUSTEMENT_MODERATION justifié par la décision, sans plafond (CI-24) ; retirer un badge l'efface
   du profil, et la tâche d'attribution ne le redonne plus. Jamais sur son propre compte (RG-104).
   Comme toute décision, elle est immuable et rejoint le journal des décisions (EC-21) ; le membre en
   est notifié (sauf un compte fermé, qui ne se connecte plus) et informé par e-mail (F-92). */
@Injectable()
export class DecisionsMembresService {
  private readonly journal = new Logger(DecisionsMembresService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly administration: AdministrationService,
    private readonly dossiers: DossiersService,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
    private readonly emails: EmailService,
  ) {}

  /** Ce que l'administrateur examine avant de décider : compte, réputation, badges, suspension en
      cours et décisions qui ont visé le membre ou ses contenus. */
  async dossier(
    administrateurId: number,
    membreId: number,
    maintenant = new Date(),
  ): Promise<DossierMembreApi> {
    const membre = await this.administration.membre(membreId);
    const [[reputation], badges, [suspension], decisions] = await Promise.all([
      this.db
        .select({ points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int` })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, membreId)),
      this.db
        .select({
          code: badge.code,
          libelle: badge.libelle,
          critere: badge.critere,
          icone: badge.icone,
          ton: badge.ton,
          date: obtentionBadge.dateObtention,
        })
        .from(obtentionBadge)
        .innerJoin(badge, eq(badge.id, obtentionBadge.badgeId))
        .where(eq(obtentionBadge.utilisateurId, membreId))
        .orderBy(desc(obtentionBadge.dateObtention), badge.id),
      this.db
        .select({ fin: max(decisionModeration.dateFinSuspension) })
        .from(decisionModeration)
        .where(
          and(
            eq(decisionModeration.membreViseId, membreId),
            eq(decisionModeration.action, 'SUSPENDRE'),
            gt(decisionModeration.dateFinSuspension, maintenant),
          ),
        ),
      this.db
        .select({ decision: decisionModeration })
        .from(decisionModeration)
        .leftJoin(contenu, eq(contenu.id, decisionModeration.contenuId))
        .where(or(eq(decisionModeration.membreViseId, membreId), eq(contenu.auteurId, membreId)))
        .orderBy(desc(decisionModeration.date), desc(decisionModeration.id))
        .limit(DECISIONS_MAXIMUM),
    ]);
    const soi = membreId === administrateurId;
    return {
      membre,
      pointsReputation: reputation?.points ?? 0,
      badges: badges.map((b) => ({ ...b, date: b.date.toISOString() })),
      suspensionJusqua: suspension?.fin?.toISOString() ?? null,
      decisions: await this.dossiers.presenter(decisions.map((l) => l.decision)),
      actions: actionsAdministrateurPossibles({
        soi,
        statutCompte: membre.statutCompte,
        badges: badges.length,
      }),
      soi,
    };
  }

  async decider(
    acteur: Acteur,
    membreId: number,
    saisie: DecisionAdministrateur,
    maintenant = new Date(),
  ): Promise<DecisionApi> {
    if (acteur.id === membreId)
      throw interdit(
        'C’est votre compte : un autre administrateur prend les décisions qui vous concernent.',
      );
    const { decision, badgeRetire } = await this.db.transaction(async (tx) => {
      // Le membre et les administrateurs sont verrouillés ensemble : deux bannissements simultanés
      // ne laissent pas la plateforme sans administrateur actif (RG-111).
      const equipe = await tx
        .select({ id: utilisateur.id, role: utilisateur.role, statut: utilisateur.statutCompte })
        .from(utilisateur)
        .where(or(eq(utilisateur.id, membreId), eq(utilisateur.role, 'ADMINISTRATEUR')))
        .for('update');
      const membre = equipe.find((m) => m.id === membreId);
      if (!membre) throw introuvable('Ce membre est introuvable.');
      const badges = await tx
        .select({ id: badge.id, code: badge.code, libelle: badge.libelle })
        .from(obtentionBadge)
        .innerJoin(badge, eq(badge.id, obtentionBadge.badgeId))
        .where(eq(obtentionBadge.utilisateurId, membreId));
      const possibles = actionsAdministrateurPossibles({
        soi: false,
        statutCompte: membre.statut,
        badges: badges.length,
      });
      if (!possibles.includes(saisie.action)) throw refus(saisie.action, membre.statut);
      if (
        saisie.action === 'BANNIR' &&
        membre.role === 'ADMINISTRATEUR' &&
        !equipe.some(
          (m) => m.id !== membreId && m.role === 'ADMINISTRATEUR' && m.statut === 'ACTIF',
        )
      )
        throw conflit('La plateforme compte toujours au moins un administrateur actif.');
      const badgeVise =
        saisie.action === 'RETIRER_BADGE' ? badges.find((b) => b.code === saisie.badge) : undefined;
      if (saisie.action === 'RETIRER_BADGE' && !badgeVise)
        throw erreurValidation({ badge: 'Ce membre n’a pas ce badge.' });

      const [enregistree] = await tx
        .insert(decisionModeration)
        .values({
          decideurId: acteur.id,
          membreViseId: membreId,
          action: saisie.action,
          motif: saisie.motif,
          date: maintenant,
          badgeId: badgeVise?.id ?? null,
        })
        .returning();
      if (!enregistree) throw new Error('Décision non enregistrée');

      switch (saisie.action) {
        case 'BANNIR':
          // RG-103 : le compte ne se connecte plus ; ses sessions ouvertes sont fermées.
          await tx
            .update(utilisateur)
            .set({ statutCompte: 'BANNI' })
            .where(eq(utilisateur.id, membreId));
          await tx.delete(session).where(eq(session.utilisateurId, membreId));
          break;
        case 'AJUSTER_REPUTATION':
          await this.reputation.ajuster(
            tx,
            {
              beneficiaireId: membreId,
              acteurId: acteur.id,
              decisionId: enregistree.id,
              points: saisie.points ?? 0,
            },
            maintenant,
          );
          break;
        case 'RETIRER_BADGE':
          if (badgeVise)
            await tx
              .delete(obtentionBadge)
              .where(
                and(
                  eq(obtentionBadge.utilisateurId, membreId),
                  eq(obtentionBadge.badgeId, badgeVise.id),
                ),
              );
          break;
      }
      // RG-91 : un compte fermé ne lit plus ses notifications ; l'e-mail l'informe.
      if (saisie.action !== 'BANNIR')
        await this.notifications.notifier(tx, {
          type: 'DECISION_MODERATION',
          destinataireId: membreId,
          donnees: {
            action: saisie.action,
            motif: saisie.motif,
            ...(saisie.points !== null ? { points: saisie.points } : {}),
            ...(badgeVise ? { badge: badgeVise.code } : {}),
          },
          date: maintenant,
        });
      return { decision: enregistree, badgeRetire: badgeVise?.libelle ?? null };
    });

    await this.informer(decision, saisie, badgeRetire).catch((erreur: unknown) =>
      this.journal.warn(`E-mail de la décision ${decision.id} non envoyé : ${String(erreur)}`),
    );
    const [presentee] = await this.dossiers.presenter([decision]);
    if (!presentee) throw new Error('Décision introuvable');
    return presentee;
  }

  /** F-92, RG-90 : e-mail au membre, quelles que soient ses préférences et l'état de son compte
      (un compte fermé doit l'apprendre), à une adresse qu'il a vérifiée. */
  private async informer(
    decision: typeof decisionModeration.$inferSelect,
    saisie: DecisionAdministrateur,
    badgeRetire: string | null,
  ): Promise<void> {
    const [membre] = await this.db
      .select({ email: utilisateur.email, emailVerifie: utilisateur.emailVerifie })
      .from(utilisateur)
      .where(eq(utilisateur.id, decision.membreViseId ?? 0));
    if (!membre?.email || !membre.emailVerifie) return;
    await this.emails.envoyer(
      emailDecisionMembre({
        a: membre.email,
        id: decision.id,
        action: saisie.action,
        motif: decision.motif,
        points: saisie.points,
        badge: badgeRetire,
        contestation: new URL(
          `/contact?motif=contestation&contenu=${encodeURIComponent(referenceDecision(decision.id))}`,
          this.config.SITE_URL,
        ).href,
      }),
    );
  }
}
