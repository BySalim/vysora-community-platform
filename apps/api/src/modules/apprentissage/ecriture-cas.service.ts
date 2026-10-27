import { Inject, Injectable } from '@nestjs/common';
import {
  BAREME_REPUTATION,
  type CasApi,
  type ExamenCas,
  type SaisieCas,
  type StatutContenu,
  type StatutValidationCas,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import { conflit, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { casBonReflexe, contenu, contenuEtiquette } from '../../db/schema/index.js';
import { retirerDeLaRecherche } from '../creations/contenu-creation.js';
import { AUCUNE_REFERENCE, ecrireEtiquettes, verifierReferences } from '../forum/contenu-sujet.js';
import type { Intervenant } from '../forum/ecriture-sujets.service.js';
import { contenusLies } from '../moderation/contenus-moderes.js';
import { ReputationService } from '../progression/reputation.service.js';
import { CasService } from './cas.service.js';
import { colonnesCas, ecrireOptions, indexerCas } from './contenu-cas.js';

/** Cas verrouillé pour la durée de la transaction. */
interface CasVerrouille {
  id: number;
  auteurId: number;
  statut: StatutContenu;
  statutValidation: StatutValidationCas;
  outilId: number | null;
  modeleId: number | null;
}

/* APP-01 : écriture d'un cas Bon réflexe (F-60, F-61, WF-17, CV-04).
   - Proposition (RG-70, CI-16, CI-30) : par un membre de niveau Expert ou plus, ou par l'équipe de
     modération (@Exige('proposer-cas')) ; le cas est PROPOSE, visible de son auteur et de la
     modération seulement.
   - Modification par l'auteur (RG-71) : un cas refusé ou validé repasse PROPOSE, son examen est
     effacé (CI-18) ; les options d'un cas qui a reçu des réponses restent les mêmes (RG-72).
   - Suppression par l'auteur : SUPPRIME, points nés du cas annulés (RG-82).
   - Examen par un membre de l'équipe de modération qui n'en est pas l'auteur (RG-71, CI-18) :
     validation (+10 à l'auteur, une fois par cas, RG-80) ou refus motivé (les points d'une
     validation antérieure sont annulés, RG-82).
   Un cas validé et visible est un document de recherche (RG-31). */
@Injectable()
export class EcritureCasService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly lecture: CasService,
    private readonly reputation: ReputationService,
  ) {}

  async proposer(auteur: Intervenant, saisie: SaisieCas, maintenant = new Date()): Promise<CasApi> {
    const id = await this.db.transaction(async (tx) => {
      await verifierReferences(tx, saisie, AUCUNE_REFERENCE);
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'CAS_BON_REFLEXE', auteurId: auteur.id, dateCreation: maintenant })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Cas non enregistré');
      await tx.insert(casBonReflexe).values({ id: ligne.id, ...colonnesCas(saisie) });
      await ecrireOptions(tx, ligne.id, saisie.options);
      await ecrireEtiquettes(tx, ligne.id, saisie.etiquettes);
      return ligne.id;
    });
    return this.lecture.cas(id, auteur);
  }

  /** RG-71 : modifié par son auteur, le cas est soumis de nouveau à la modération. */
  async modifier(
    auteur: Intervenant,
    id: number,
    saisie: SaisieCas,
    maintenant = new Date(),
  ): Promise<CasApi> {
    await this.db.transaction(async (tx) => {
      const existant = await this.sien(tx, auteur.id, id, 'modifier');
      const etiquettes = await tx
        .select({ id: contenuEtiquette.etiquetteId })
        .from(contenuEtiquette)
        .where(eq(contenuEtiquette.contenuId, id));
      await verifierReferences(tx, saisie, {
        outilId: existant.outilId,
        modeleId: existant.modeleId,
        creationId: null,
        etiquettes: new Set(etiquettes.map((e) => e.id)),
      });
      await tx
        .update(casBonReflexe)
        .set({
          ...colonnesCas(saisie),
          // CV-04, CI-18 : nouvelle soumission, sans examen.
          statutValidation: 'PROPOSE',
          motifRefus: null,
          examinateurId: null,
          dateExamen: null,
        })
        .where(eq(casBonReflexe.id, id));
      await tx.update(contenu).set({ dateModification: maintenant }).where(eq(contenu.id, id));
      await ecrireOptions(tx, id, saisie.options);
      await ecrireEtiquettes(tx, id, saisie.etiquettes);
      // Un cas qui n'est plus validé sort de la recherche.
      await indexerCas(tx, id);
    });
    // La notification de la modération n'est pas prévue (RG-91) : le cas revient dans sa liste.
    return this.lecture.cas(id, auteur);
  }

  /** Suppression définitive pour les autres membres ; points nés du cas annulés (RG-82). */
  async supprimer(auteurId: number, id: number, maintenant = new Date()): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.sien(tx, auteurId, id, 'supprimer');
      await tx.update(contenu).set({ statut: 'SUPPRIME' }).where(eq(contenu.id, id));
      await this.reputation.annulerContenus(
        tx,
        await contenusLies(tx, id, 'CAS_BON_REFLEXE'),
        maintenant,
      );
      await retirerDeLaRecherche(tx, id);
    });
  }

  /** F-61, RG-71 : validation ou refus motivé d'un cas proposé. */
  async examiner(
    moderateur: Intervenant,
    id: number,
    examen: ExamenCas,
    maintenant = new Date(),
  ): Promise<CasApi> {
    await this.db.transaction(async (tx) => {
      const existant = await this.verrouiller(tx, id);
      if (!existant) throw introuvable('Ce cas est introuvable.');
      if (existant.auteurId === moderateur.id)
        throw interdit(
          'Ce cas est le vôtre : un autre membre de l’équipe de modération l’examinera.',
        );
      if (existant.statut === 'MASQUE')
        throw conflit('Ce cas est masqué par la modération : rétablissez-le avant de l’examiner.');
      if (existant.statutValidation === 'VALIDE') throw conflit('Ce cas est déjà validé.');
      if (existant.statutValidation === 'REFUSE')
        throw conflit(
          'Ce cas a déjà été refusé : son auteur peut le corriger et le soumettre de nouveau.',
        );
      await tx
        .update(casBonReflexe)
        .set({
          statutValidation: examen.decision,
          motifRefus: examen.motif,
          examinateurId: moderateur.id,
          dateExamen: maintenant,
        })
        .where(eq(casBonReflexe.id, id));
      // RG-80 : +10 à l'auteur, une seule fois par cas (le revalider après une modification ne
      // crédite pas de nouveau) ; un refus annule les points d'une validation antérieure (RG-82).
      const action = { acteurId: existant.auteurId, contenuId: id, motif: 'CAS_VALIDE' as const };
      if (examen.decision === 'VALIDE')
        await this.reputation.crediterUneFois(
          tx,
          { ...action, beneficiaireId: existant.auteurId, points: BAREME_REPUTATION.casValide },
          maintenant,
        );
      else await this.reputation.annuler(tx, action, maintenant);
      await indexerCas(tx, id);
    });
    // La notification de l'auteur (CAS_VALIDE, CAS_REFUSE) viendra avec NOTIF-01.
    return this.lecture.cas(id, moderateur);
  }

  private async verrouiller(tx: Transaction, id: number): Promise<CasVerrouille | null> {
    const [ligne] = await tx
      .select({
        id: casBonReflexe.id,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        statutValidation: casBonReflexe.statutValidation,
        outilId: casBonReflexe.outilId,
        modeleId: casBonReflexe.modeleId,
      })
      .from(casBonReflexe)
      .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
      .where(eq(casBonReflexe.id, id))
      .for('update');
    return ligne && ligne.statut !== 'SUPPRIME' ? ligne : null;
  }

  /** Cas de ce membre, quel que soit son statut. */
  private async sien(
    tx: Transaction,
    auteurId: number,
    id: number,
    action: 'modifier' | 'supprimer',
  ): Promise<CasVerrouille> {
    const ligne = await this.verrouiller(tx, id);
    if (!ligne) throw introuvable('Ce cas est introuvable.');
    if (ligne.auteurId !== auteurId) {
      // RG-30 : un cas qu'une personne ne peut pas voir n'existe pas pour elle.
      if (ligne.statut !== 'VISIBLE' || ligne.statutValidation !== 'VALIDE')
        throw introuvable('Ce cas est introuvable.');
      throw interdit(`Seul son auteur peut ${action} ce cas.`);
    }
    return ligne;
  }
}
