import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACTIONS_DECISION_MEMBRE,
  actionsPossibles,
  issueDesSignalements,
  type AvertissementAgent,
  type DecisionApi,
  type DecisionModeration,
  type StatutContenu,
  type StatutPublication,
  type TypeContenu,
} from '@vysora/shared';
import { and, eq, inArray, or } from 'drizzle-orm';
import { conflit, interdit, introuvable } from '../../commun/erreurs.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import {
  contenu,
  creation,
  decisionModeration,
  echange,
  etape,
  media,
  signalement,
  utilisateur,
} from '../../db/schema/index.js';
import { indexer, retirerDeLaRecherche } from '../creations/contenu-creation.js';
import { EmailService } from '../email/email.service.js';
import { Stockage } from '../medias/stockage.js';
import { ReputationService } from '../progression/reputation.service.js';
import { contenusLies, presenterContenus } from './contenus-moderes.js';
import { emailDecision, referenceDecision } from './courriels.js';
import { DossiersService } from './dossiers.service.js';
import { derniersMasquages } from './masquages.js';

/** Contenu visé, verrouillé pour la durée de la décision. */
interface Cible {
  id: number;
  type: TypeContenu;
  auteurId: number;
  statut: StatutContenu;
  publication: StatutPublication | null;
  avertissementAgent: AvertissementAgent | null;
}

const JOUR_MS = 86_400_000;

/* F-91 : décisions de modération sur un contenu (RG-102). Une décision a une action et un motif,
   elle est journalisée et n'est plus modifiable (déclencheur en base) : une erreur se corrige par une
   nouvelle décision. Elle clôt les signalements ouverts du contenu, comme non fondés pour « aucune »
   et « rétablir », comme fondés sinon (CI-20). « Avertir » et « suspendre » visent l'auteur du
   contenu (CI-19) ; la suspension dure de 1 à 90 jours (RG-103). RG-104 : jamais sur son propre
   contenu. Points de réputation : annulés au masquage et à la suppression, générés de nouveau au
   rétablissement (RG-82). L'auteur est informé par e-mail (F-92) ; les notifications viendront avec
   NOTIF-01. */
@Injectable()
export class DecisionsService {
  private readonly journal = new Logger(DecisionsService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly reputation: ReputationService,
    private readonly dossiers: DossiersService,
    private readonly emails: EmailService,
    private readonly stockage: Stockage,
  ) {}

  async decider(
    decideurId: number,
    contenuId: number,
    saisie: DecisionModeration,
    maintenant = new Date(),
  ): Promise<DecisionApi> {
    const { decision, fichiers } = await this.db.transaction(async (tx) => {
      const cible = await this.cible(tx, contenuId);
      if (cible.auteurId === decideurId)
        throw interdit(
          'Ce contenu est le vôtre : un autre membre de l’équipe de modération prendra la décision.',
        );
      verifierEtat(saisie.action, cible);

      const [enregistree] = await tx
        .insert(decisionModeration)
        .values({
          decideurId,
          contenuId,
          membreViseId: (ACTIONS_DECISION_MEMBRE as readonly string[]).includes(saisie.action)
            ? cible.auteurId
            : null,
          action: saisie.action,
          motif: saisie.motif,
          date: maintenant,
          dateFinSuspension:
            saisie.action === 'SUSPENDRE' && saisie.dureeJours
              ? new Date(maintenant.getTime() + saisie.dureeJours * JOUR_MS)
              : null,
        })
        .returning();
      if (!enregistree) throw new Error('Décision non enregistrée');
      await tx
        .update(signalement)
        .set({ statut: issueDesSignalements(saisie.action), decisionId: enregistree.id })
        .where(and(eq(signalement.contenuId, contenuId), eq(signalement.statut, 'OUVERT')));

      let aEffacer: string[] = [];
      switch (saisie.action) {
        case 'MASQUER': {
          await tx.update(contenu).set({ statut: 'MASQUE' }).where(eq(contenu.id, contenuId));
          // Même date que la décision : le rétablissement retrouve ainsi ce que le masquage a annulé.
          const lies = await contenusLies(tx, contenuId, cible.type);
          await this.reputation.annulerContenus(tx, lies, maintenant);
          await retirerDeLaRecherche(tx, contenuId);
          break;
        }
        case 'RETABLIR': {
          // La décision qui vient d'être enregistrée n'est pas un masquage : la dernière l'est.
          const [masquage] = await derniersMasquages(tx, [contenuId]);
          await tx.update(contenu).set({ statut: 'VISIBLE' }).where(eq(contenu.id, contenuId));
          if (masquage)
            await this.reputation.retablirContenus(
              tx,
              await contenusLies(tx, contenuId, cible.type),
              masquage.date,
            );
          if (cible.type === 'CREATION' && cible.publication === 'PUBLIEE')
            await indexer(tx, contenuId);
          break;
        }
        case 'SUPPRIMER': {
          await tx.update(contenu).set({ statut: 'SUPPRIME' }).where(eq(contenu.id, contenuId));
          const lies = await contenusLies(tx, contenuId, cible.type);
          await this.reputation.annulerContenus(tx, lies, maintenant);
          await retirerDeLaRecherche(tx, contenuId);
          aEffacer = await retirerImages(tx, lies);
          break;
        }
        case 'AJOUTER_AVERTISSEMENT_AGENT':
          // RG-23 : posé par la modération, seul un modérateur pourra le retirer.
          await tx
            .update(creation)
            .set({ avertissementAgent: 'MODERATION' })
            .where(eq(creation.id, contenuId));
          break;
        case 'RETIRER_AVERTISSEMENT_AGENT':
          await tx
            .update(creation)
            .set({ avertissementAgent: 'AUCUN' })
            .where(eq(creation.id, contenuId));
          break;
        case 'AUCUNE':
        case 'AVERTIR':
        case 'SUSPENDRE':
          break;
      }
      return { decision: enregistree, fichiers: aEffacer };
    });

    // Les fichiers d'un contenu supprimé ne sont plus servis ; un échec laisse la tâche de
    // nettoyage les retirer (fichiers sans ligne).
    if (fichiers.length)
      await this.stockage
        .supprimer(fichiers)
        .catch((erreur: unknown) =>
          this.journal.warn(`Images d’un contenu supprimé non effacées : ${String(erreur)}`),
        );
    await this.informer(decision).catch((erreur: unknown) =>
      this.journal.warn(`E-mail de la décision ${decision.id} non envoyé : ${String(erreur)}`),
    );
    const [presentee] = await this.dossiers.presenter([decision]);
    if (!presentee) throw new Error('Décision introuvable');
    return presentee;
  }

  private async cible(tx: Transaction, id: number): Promise<Cible> {
    const [ligne] = await tx
      .select({
        id: contenu.id,
        type: contenu.typeContenu,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        publication: creation.statutPublication,
        avertissementAgent: creation.avertissementAgent,
      })
      .from(contenu)
      .leftJoin(creation, eq(creation.id, contenu.id))
      .where(eq(contenu.id, id))
      .for('update', { of: contenu });
    if (!ligne || ligne.statut === 'SUPPRIME') throw introuvable('Ce contenu est introuvable.');
    return ligne;
  }

  /** F-92 : e-mail à l'auteur du contenu, après l'enregistrement de la décision. */
  private async informer(decision: typeof decisionModeration.$inferSelect): Promise<void> {
    if (decision.action === 'AUCUNE' || decision.contenuId === null) return;
    const action = decision.action;
    if (action === 'BANNIR' || action === 'AJUSTER_REPUTATION' || action === 'RETIRER_BADGE')
      return;
    const presente = (await presenterContenus(this.db, this.stockage, [decision.contenuId])).get(
      decision.contenuId,
    );
    if (!presente) return;
    const [auteur] = await this.db
      .select({ email: utilisateur.email, fuseau: utilisateur.fuseauHoraire })
      .from(utilisateur)
      .where(eq(utilisateur.id, presente.auteur.id));
    if (!auteur?.email) return;
    const site = (chemin: string) => new URL(chemin, this.config.SITE_URL).href;
    const fiche = `/creations/${presente.id}${presente.page?.slug ? `-${presente.page.slug}` : ''}`;
    await this.emails.envoyer(
      emailDecision({
        a: auteur.email,
        id: decision.id,
        action,
        motif: decision.motif,
        finSuspension: decision.dateFinSuspension,
        fuseau: auteur.fuseau,
        contenu: { type: presente.type, intitule: presente.intitule },
        creation:
          presente.type === 'CREATION' && action !== 'SUPPRIMER'
            ? { fiche: site(fiche), modifier: site(`/creations/${presente.id}/modifier`) }
            : null,
        contestation: site(
          `/contact?motif=contestation&contenu=${encodeURIComponent(referenceDecision(decision.id))}`,
        ),
      }),
    );
  }
}

/** Ce que la décision suppose de l'état du contenu (actionsPossibles, que le dossier présente aussi
    à la modération) ; un refus dit pourquoi. */
function verifierEtat(action: DecisionModeration['action'], cible: Cible): void {
  if (actionsPossibles(cible).includes(action)) return;
  switch (action) {
    case 'MASQUER':
      throw conflit('Ce contenu est déjà masqué.');
    case 'RETABLIR':
      throw conflit('Ce contenu n’est pas masqué : il n’y a rien à rétablir.');
    case 'AJOUTER_AVERTISSEMENT_AGENT':
    case 'RETIRER_AVERTISSEMENT_AGENT':
      if (cible.type !== 'CREATION')
        throw conflit('L’avertissement « instructions pour agent » concerne les créations.');
      throw conflit(
        action === 'AJOUTER_AVERTISSEMENT_AGENT'
          ? 'La modération a déjà posé cet avertissement.'
          : 'Cette création n’a pas d’avertissement « instructions pour agent ».',
      );
    default:
      throw conflit('Cette décision n’est pas possible sur ce contenu.');
  }
}

/** Images d'un contenu supprimé par la modération (et de ceux qui en dépendent) : lignes retirées,
    clés des fichiers à effacer renvoyées. */
async function retirerImages(tx: Transaction, contenuIds: number[]): Promise<string[]> {
  const echanges = tx
    .select({ id: echange.id })
    .from(echange)
    .innerJoin(etape, eq(etape.id, echange.etapeId))
    .where(inArray(etape.creationId, contenuIds));
  const retirees = await tx
    .delete(media)
    .where(or(inArray(media.contenuId, contenuIds), inArray(media.echangeId, echanges)))
    .returning({ variantes: media.variantes, fichier: media.fichier });
  return [...new Set(retirees.flatMap((m) => [m.fichier, ...Object.values(m.variantes)]))];
}
