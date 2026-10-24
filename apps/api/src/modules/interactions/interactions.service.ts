import { Inject, Injectable } from '@nestjs/common';
import {
  BAREME_REPUTATION,
  type CodeTypeVote,
  type EnregistrementApi,
  type VoteApi,
} from '@vysora/shared';
import { and, count, eq } from 'drizzle-orm';
import { conflit, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { enregistrement, vote } from '../../db/schema/index.js';
import { ReputationService } from '../progression/reputation.service.js';
import { lireCible, type Cible } from './cibles.js';

const LIBELLE_VOTE: Record<CodeTypeVote, string> = {
  UTILE: '« Utile »',
  TESTE_OK: '« Testé, ça marche »',
};

/* INT-01 : votes « Utile » et « Testé, ça marche » (F-30, F-31) ; S-01 : enregistrer un contenu (F-34).
   Ce qu'une personne ne peut pas voir n'existe pas pour elle (404), comme sur sa fiche (RG-30). */
@Injectable()
export class InteractionsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly reputation: ReputationService,
  ) {}

  /** RG-40, RG-41, RG-80 : vote enregistré une fois ; l'auteur du contenu reçoit ses points. */
  voter(membreId: number, contenuId: number, type: CodeTypeVote): Promise<VoteApi> {
    return this.db.transaction(async (tx) => {
      const cible = await this.cibleVisible(tx, contenuId);
      if (cible.auteurId === membreId)
        throw interdit(`Les votes ${LIBELLE_VOTE[type]} viennent des autres membres.`);
      // RG-41 : « Utile » sur les créations, sujets, réponses et cas ; « Testé » sur les astuces.
      const permis =
        type === 'UTILE'
          ? ['CREATION', 'SUJET', 'MESSAGE', 'CAS_BON_REFLEXE'].includes(cible.type)
          : cible.type === 'SUJET' && cible.typeSujet === 'ASTUCE';
      if (!permis)
        throw conflit(
          type === 'UTILE'
            ? 'Ce contenu ne reçoit pas de vote « Utile ».'
            : 'Le vote « Testé, ça marche » est réservé aux astuces du forum.',
        );

      const [nouveau] = await tx
        .insert(vote)
        .values({ votantId: membreId, contenuId, typeVoteCode: type })
        .onConflictDoNothing()
        .returning({ contenuId: vote.contenuId });
      if (nouveau)
        await this.reputation.crediterVote(tx, {
          beneficiaireId: cible.auteurId,
          acteurId: membreId,
          contenuId,
          motif: type === 'UTILE' ? 'VOTE_UTILE_RECU' : 'VOTE_TESTE_RECU',
          points:
            type === 'TESTE_OK'
              ? BAREME_REPUTATION.voteTesteSurAstuce
              : cible.type === 'CREATION'
                ? BAREME_REPUTATION.voteUtileSurCreation
                : BAREME_REPUTATION.voteUtileSurAutreContenu,
        });
      return this.etatDuVote(tx, contenuId, type, membreId);
    });
  }

  /** RG-40, RG-82 : vote retiré, points de l'auteur annulés. */
  retirerVote(membreId: number, contenuId: number, type: CodeTypeVote): Promise<VoteApi> {
    return this.db.transaction(async (tx) => {
      await this.cibleVisible(tx, contenuId);
      const [retire] = await tx
        .delete(vote)
        .where(
          and(
            eq(vote.votantId, membreId),
            eq(vote.contenuId, contenuId),
            eq(vote.typeVoteCode, type),
          ),
        )
        .returning({ contenuId: vote.contenuId });
      if (retire)
        await this.reputation.annuler(tx, {
          acteurId: membreId,
          contenuId,
          motif: type === 'UTILE' ? 'VOTE_UTILE_RECU' : 'VOTE_TESTE_RECU',
        });
      return this.etatDuVote(tx, contenuId, type, membreId);
    });
  }

  /** RG-45 : une fois par membre et par contenu ; créations, sujets et cas. */
  async enregistrer(membreId: number, contenuId: number): Promise<EnregistrementApi> {
    const cible = await this.cibleVisible(this.db, contenuId);
    if (!['CREATION', 'SUJET', 'CAS_BON_REFLEXE'].includes(cible.type))
      throw conflit('Seuls les créations, les sujets et les cas s’enregistrent.');
    await this.db
      .insert(enregistrement)
      .values({ utilisateurId: membreId, contenuId })
      .onConflictDoNothing();
    return { enregistre: true };
  }

  /** Retrait de la liste, même si le contenu n'est plus visible entre-temps. */
  async retirerEnregistrement(membreId: number, contenuId: number): Promise<EnregistrementApi> {
    await this.db
      .delete(enregistrement)
      .where(
        and(eq(enregistrement.utilisateurId, membreId), eq(enregistrement.contenuId, contenuId)),
      );
    return { enregistre: false };
  }

  private async cibleVisible(db: BaseDeDonnees | Transaction, contenuId: number): Promise<Cible> {
    const cible = await lireCible(db, contenuId);
    if (!cible?.public) throw introuvable('Ce contenu est introuvable.');
    return cible;
  }

  private async etatDuVote(
    tx: Transaction,
    contenuId: number,
    type: CodeTypeVote,
    membreId: number,
  ): Promise<VoteApi> {
    const [total] = await tx
      .select({ n: count() })
      .from(vote)
      .where(and(eq(vote.contenuId, contenuId), eq(vote.typeVoteCode, type)));
    const aVote = await tx.$count(
      vote,
      and(eq(vote.contenuId, contenuId), eq(vote.typeVoteCode, type), eq(vote.votantId, membreId)),
    );
    return { type, nombre: total?.n ?? 0, aVote: aVote > 0 };
  }
}
