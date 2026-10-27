import { Inject, Injectable } from '@nestjs/common';
import {
  accepteUneReponse,
  BAREME_REPUTATION,
  composerMessage,
  lireMessage,
  type EtatVisiteur,
  type MessageApi,
  type SaisieMessage,
  type StatutContenu,
  type SujetApi,
  type TypeSujet,
} from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { conflit, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { contenu, message, sujet, vote } from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { lireMasquages } from '../moderation/masquages.js';
import { verifierLimiteQuotidienne } from '../progression/limites.js';
import { ReputationService } from '../progression/reputation.service.js';
import { oublierAcceptation } from './contenu-sujet.js';
import type { Intervenant } from './ecriture-sujets.service.js';
import { SujetsService } from './sujets.service.js';

/** Membre qui répond : identifiant, rôle et état (niveau pour RG-85). */
export interface Repondant extends Intervenant {
  etat: EtatVisiteur;
}

/** Réponse et son sujet, verrouillés pour la durée de la transaction. */
interface ReponseVerrouillee {
  id: number;
  auteurId: number;
  statut: StatutContenu;
  sujet: {
    id: number;
    auteurId: number;
    statut: StatutContenu;
    type: TypeSujet;
    ferme: boolean;
    messageAccepteId: number | null;
  };
}

/* FORUM-01 : réponses d'un sujet (F-51) et réponse acceptée (F-52).
   - Répondre (RG-64) à un sujet visible et ouvert, dans la limite de RG-85 (réponses et
     commentaires) ; le prompt proposé est cité après le texte.
   - Modifier ou supprimer sa réponse ; supprimée, elle disparaît et ses points sont annulés (RG-82).
   - Accepter (RG-63, CI-12) : l'auteur d'une question ou d'une clinique ouverte choisit la réponse
     d'un autre membre ; +15 à son auteur, +2 à l'auteur du sujet (RG-80). En choisir une autre
     transfère les points ; retirer l'acceptation les annule (RG-82). */
@Injectable()
export class MessagesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
    private readonly sujets: SujetsService,
    private readonly reputation: ReputationService,
  ) {}

  async repondre(
    membre: Repondant,
    sujetId: number,
    saisie: SaisieMessage,
    maintenant = new Date(),
  ): Promise<MessageApi> {
    const id = await this.db.transaction(async (tx) => {
      const [parent] = await tx
        .select({ statut: contenu.statut, dateFermeture: sujet.dateFermeture })
        .from(sujet)
        .innerJoin(contenu, eq(contenu.id, sujet.id))
        .where(eq(sujet.id, sujetId))
        .for('share');
      if (!parent || parent.statut !== 'VISIBLE') throw introuvable('Ce sujet est introuvable.');
      // WF-16 : un sujet fermé reste lisible, il n'accepte plus de réponses.
      if (parent.dateFermeture)
        throw conflit('Ce sujet est fermé : il n’accepte plus de réponses.');
      // RG-85 : réponses du forum et commentaires publiés sur 24 heures glissantes.
      await verifierLimiteQuotidienne(tx, membre, 'reponses', maintenant);
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'MESSAGE', auteurId: membre.id, dateCreation: maintenant })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Réponse non enregistrée');
      await tx
        .insert(message)
        .values({ id: ligne.id, sujetId, corps: composerMessage(saisie.corps, saisie.prompt) });
      return ligne.id;
    });
    // La notification de l'auteur du sujet viendra avec NOTIF-01.
    return this.presenter(id, membre);
  }

  /** Seul son auteur modifie une réponse, même masquée (la modération la revoit alors). */
  async modifier(
    membre: Intervenant,
    id: number,
    saisie: SaisieMessage,
    maintenant = new Date(),
  ): Promise<MessageApi> {
    await this.db.transaction(async (tx) => {
      await this.sienne(tx, membre.id, id, 'modifier');
      await tx
        .update(message)
        .set({ corps: composerMessage(saisie.corps, saisie.prompt) })
        .where(eq(message.id, id));
      await tx.update(contenu).set({ dateModification: maintenant }).where(eq(contenu.id, id));
    });
    return this.presenter(id, membre);
  }

  /** Retirée par son auteur : elle disparaît, n'est plus la réponse acceptée, ses points sont annulés. */
  async supprimer(membreId: number, id: number, maintenant = new Date()): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.sienne(tx, membreId, id, 'supprimer');
      await tx.update(contenu).set({ statut: 'SUPPRIME' }).where(eq(contenu.id, id));
      await oublierAcceptation(tx, id);
      await this.reputation.annulerContenus(tx, [id], maintenant);
    });
  }

  /** RG-63, CI-12 : réponse acceptée par l'auteur du sujet ; une autre déjà acceptée perd ce statut. */
  async accepter(membre: Intervenant, id: number, maintenant = new Date()): Promise<SujetApi> {
    const sujetId = await this.db.transaction(async (tx) => {
      const reponse = await this.acceptable(tx, membre, id);
      if (reponse.sujet.messageAccepteId === id) return reponse.sujet.id;
      if (reponse.auteurId === reponse.sujet.auteurId)
        throw conflit('Choisissez la réponse d’un autre membre.');
      if (reponse.sujet.messageAccepteId !== null)
        await this.annulerPoints(
          tx,
          reponse.sujet.auteurId,
          reponse.sujet.messageAccepteId,
          maintenant,
        );
      await tx
        .update(sujet)
        .set({ messageAccepteId: id, dateAcceptationReponse: maintenant })
        .where(eq(sujet.id, reponse.sujet.id));
      // RG-80 : +15 à l'auteur de la réponse, +2 à l'auteur du sujet.
      const action = { acteurId: reponse.sujet.auteurId, contenuId: id };
      await this.reputation.crediterUneFois(
        tx,
        {
          ...action,
          beneficiaireId: reponse.auteurId,
          motif: 'REPONSE_ACCEPTEE',
          points: BAREME_REPUTATION.reponseAcceptee,
        },
        maintenant,
      );
      await this.reputation.crediterUneFois(
        tx,
        {
          ...action,
          beneficiaireId: reponse.sujet.auteurId,
          motif: 'ACCEPTATION_REPONSE',
          points: BAREME_REPUTATION.acceptationReponse,
        },
        maintenant,
      );
      return reponse.sujet.id;
    });
    // La notification de l'auteur de la réponse viendra avec NOTIF-01.
    return this.sujets.sujet(sujetId, membre);
  }

  /** RG-63 : l'auteur du sujet retire son acceptation ; le sujet n'est plus résolu (RG-82). */
  async retirerAcceptation(
    membre: Intervenant,
    id: number,
    maintenant = new Date(),
  ): Promise<SujetApi> {
    const sujetId = await this.db.transaction(async (tx) => {
      const reponse = await this.acceptable(tx, membre, id);
      if (reponse.sujet.messageAccepteId !== id)
        throw conflit('Cette réponse n’est pas la réponse acceptée.');
      await this.annulerPoints(tx, reponse.sujet.auteurId, id, maintenant);
      await oublierAcceptation(tx, id);
      return reponse.sujet.id;
    });
    return this.sujets.sujet(sujetId, membre);
  }

  /** RG-82 : points de l'acceptation de cette réponse annulés. */
  private async annulerPoints(
    tx: Transaction,
    auteurDuSujetId: number,
    messageId: number,
    maintenant: Date,
  ): Promise<void> {
    for (const motif of ['REPONSE_ACCEPTEE', 'ACCEPTATION_REPONSE'] as const)
      await this.reputation.annuler(
        tx,
        { acteurId: auteurDuSujetId, contenuId: messageId, motif },
        maintenant,
      );
  }

  private async verrouiller(tx: Transaction, id: number): Promise<ReponseVerrouillee | null> {
    const contenuSujet = alias(contenu, 'contenu_sujet');
    const [ligne] = await tx
      .select({
        id: message.id,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        sujet: {
          id: sujet.id,
          auteurId: contenuSujet.auteurId,
          statut: contenuSujet.statut,
          type: sujet.typeSujet,
          dateFermeture: sujet.dateFermeture,
          messageAccepteId: sujet.messageAccepteId,
        },
      })
      .from(message)
      .innerJoin(contenu, eq(contenu.id, message.id))
      .innerJoin(sujet, eq(sujet.id, message.sujetId))
      .innerJoin(contenuSujet, eq(contenuSujet.id, sujet.id))
      .where(eq(message.id, id))
      .for('update', { of: [contenu, sujet] });
    if (!ligne || ligne.statut === 'SUPPRIME') return null;
    const { dateFermeture, ...leSujet } = ligne.sujet;
    return { ...ligne, sujet: { ...leSujet, ferme: dateFermeture !== null } };
  }

  /** Réponse de ce membre, visible ou masquée, dans un sujet visible de tous. */
  private async sienne(
    tx: Transaction,
    membreId: number,
    id: number,
    action: 'modifier' | 'supprimer',
  ): Promise<ReponseVerrouillee> {
    const reponse = await this.verrouiller(tx, id);
    if (!reponse || reponse.sujet.statut !== 'VISIBLE')
      throw introuvable('Cette réponse est introuvable.');
    if (reponse.auteurId !== membreId) {
      // RG-30 : une réponse masquée n'existe pas pour les autres membres.
      if (reponse.statut !== 'VISIBLE') throw introuvable('Cette réponse est introuvable.');
      throw interdit(`Seul son auteur peut ${action} cette réponse.`);
    }
    return reponse;
  }

  /** RG-63, CI-12 : réponse visible d'une question ou d'une clinique ouverte, choisie par l'auteur
      du sujet. */
  private async acceptable(
    tx: Transaction,
    membre: Intervenant,
    id: number,
  ): Promise<ReponseVerrouillee> {
    const reponse = await this.verrouiller(tx, id);
    if (!reponse || reponse.statut !== 'VISIBLE' || reponse.sujet.statut !== 'VISIBLE')
      throw introuvable('Cette réponse est introuvable.');
    if (reponse.sujet.auteurId !== membre.id)
      throw interdit('Seul l’auteur du sujet choisit la réponse acceptée.');
    if (!accepteUneReponse(reponse.sujet.type))
      throw conflit('Seules les questions et les cliniques du prompt ont une réponse acceptée.');
    if (reponse.sujet.ferme)
      throw conflit('Ce sujet est fermé : rouvrez-le pour changer la réponse acceptée.');
    return reponse;
  }

  /** Réponse telle que la page du sujet la présente, juste après son écriture. */
  private async presenter(id: number, lecteur: Intervenant): Promise<MessageApi> {
    const [ligne] = await this.db
      .select({
        id: message.id,
        corps: message.corps,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        date: contenu.dateCreation,
        dateModification: contenu.dateModification,
        accepte: sujet.messageAccepteId,
        dateAcceptation: sujet.dateAcceptationReponse,
      })
      .from(message)
      .innerJoin(contenu, eq(contenu.id, message.id))
      .innerJoin(sujet, eq(sujet.id, message.sujetId))
      .where(eq(message.id, id));
    if (!ligne) throw introuvable('Cette réponse est introuvable.');
    const auteur = (await resumerMembres(this.db, this.stockage, [ligne.auteurId])).get(
      ligne.auteurId,
    );
    if (!auteur) throw new Error(`Membre introuvable : ${ligne.auteurId}`);
    const { texte, prompt } = lireMessage(ligne.corps);
    const masquee = ligne.statut === 'MASQUE';
    const [utiles, masquages] = await Promise.all([
      this.db.$count(vote, and(eq(vote.contenuId, id), eq(vote.typeVoteCode, 'UTILE'))),
      lireMasquages(this.db, masquee ? [id] : [], false),
    ]);
    return {
      id,
      auteur,
      date: ligne.date.toISOString(),
      dateModification: ligne.dateModification?.toISOString() ?? null,
      corps: texte,
      prompt,
      utiles,
      acceptee:
        ligne.accepte === id && !masquee ? (ligne.dateAcceptation?.toISOString() ?? null) : null,
      masquee,
      masquage: masquages.get(id) ?? null,
      // La personne vient de l'écrire : elle ne vote pas pour sa réponse et ne la signale pas.
      moi: { auteur: ligne.auteurId === lecteur.id, utile: false, signalementOuvert: false },
    };
  }
}
