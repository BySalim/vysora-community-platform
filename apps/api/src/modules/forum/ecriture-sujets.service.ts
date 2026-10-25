import { Inject, Injectable } from '@nestjs/common';
import {
  peutFermerSujet,
  peutRouvrirSujet,
  slugifier,
  type Role,
  type SaisieSujet,
  type StatutContenu,
  type SujetApi,
  type TypeSujet,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import { conflit, erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { contenu, contenuEtiquette, sujet } from '../../db/schema/index.js';
import { retirerDeLaRecherche } from '../creations/contenu-creation.js';
import type { Redacteur } from '../creations/ecriture.service.js';
import { contenusLies } from '../moderation/contenus-moderes.js';
import { verifierLimiteQuotidienne } from '../progression/limites.js';
import { ReputationService } from '../progression/reputation.service.js';
import {
  AUCUNE_REFERENCE,
  corpsDuSujet,
  ecrireEtiquettes,
  indexerSujet,
  verifierReferences,
} from './contenu-sujet.js';
import { SujetsService } from './sujets.service.js';

/** Sujet verrouillé pour la durée de la transaction. */
interface SujetVerrouille {
  id: number;
  auteurId: number;
  statut: StatutContenu;
  type: TypeSujet;
  outilId: number | null;
  modeleId: number | null;
  creationId: number | null;
  fermeurId: number | null;
  dateFermeture: Date | null;
}

/** Membre qui agit sur un sujet : identifiant et rôle (fermeture par la modération). */
export interface Intervenant {
  id: number;
  role: Role;
}

/* FORUM-01 : écriture d'un sujet (F-50, F-53 à F-55).
   - Publication (RG-60 à RG-62, RG-66) : visible aussitôt, dans la limite de RG-85 ; une clinique
     est composée de ses rubriques, une astuce garde ses exemples avant et après.
   - Modification par l'auteur, y compris d'un sujet masqué (la modération le revoit alors) ; le type
     ne change plus.
   - Suppression par l'auteur : SUPPRIME, points du sujet et de ses réponses annulés (RG-82).
   - Fermeture et réouverture (RG-65, CI-22).
   Un sujet visible est un document de recherche (RG-31). */
@Injectable()
export class EcritureSujetsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly lecture: SujetsService,
    private readonly reputation: ReputationService,
  ) {}

  async creer(auteur: Redacteur, saisie: SaisieSujet, maintenant = new Date()): Promise<SujetApi> {
    const id = await this.db.transaction(async (tx) => {
      // RG-85 : sujets publiés sur 24 heures glissantes.
      await verifierLimiteQuotidienne(tx, auteur, 'sujets', maintenant);
      const outilEtModele = await verifierReferences(tx, saisie, AUCUNE_REFERENCE);
      const corps = corpsDuSujet(saisie, outilEtModele);
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'SUJET', auteurId: auteur.id, dateCreation: maintenant })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Sujet non enregistré');
      await tx
        .insert(sujet)
        .values({ id: ligne.id, typeSujet: saisie.type, ...colonnes(saisie, corps) });
      await ecrireEtiquettes(tx, ligne.id, saisie.etiquettes);
      await indexerSujet(tx, ligne.id);
      return ligne.id;
    });
    // La notification des membres concernés viendra avec NOTIF-01.
    return this.lecture.sujet(id, auteur);
  }

  /** Modification par l'auteur ; date de modification affichée. */
  async modifier(
    auteur: Redacteur,
    id: number,
    saisie: SaisieSujet,
    maintenant = new Date(),
  ): Promise<SujetApi> {
    await this.db.transaction(async (tx) => {
      const existant = await this.sien(tx, auteur.id, id, 'modifier');
      if (saisie.type !== existant.type)
        throw erreurValidation({ type: 'Le type d’un sujet ne change plus.' });
      const etiquettes = await tx
        .select({ id: contenuEtiquette.etiquetteId })
        .from(contenuEtiquette)
        .where(eq(contenuEtiquette.contenuId, id));
      const outilEtModele = await verifierReferences(tx, saisie, {
        outilId: existant.outilId,
        modeleId: existant.modeleId,
        creationId: existant.creationId,
        etiquettes: new Set(etiquettes.map((e) => e.id)),
      });
      await tx
        .update(sujet)
        .set(colonnes(saisie, corpsDuSujet(saisie, outilEtModele)))
        .where(eq(sujet.id, id));
      await tx.update(contenu).set({ dateModification: maintenant }).where(eq(contenu.id, id));
      await ecrireEtiquettes(tx, id, saisie.etiquettes);
      if (existant.statut === 'VISIBLE') await indexerSujet(tx, id);
    });
    return this.lecture.sujet(id, auteur);
  }

  /** Suppression définitive pour les autres membres ; points liés annulés (RG-19, RG-82). */
  async supprimer(auteurId: number, id: number, maintenant = new Date()): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.sien(tx, auteurId, id, 'supprimer');
      await tx.update(contenu).set({ statut: 'SUPPRIME' }).where(eq(contenu.id, id));
      await this.reputation.annulerContenus(tx, await contenusLies(tx, id, 'SUJET'), maintenant);
      await retirerDeLaRecherche(tx, id);
    });
  }

  /** WF-16 : le sujet reste lisible, il n'accepte plus de réponses ; la date et l'auteur de la
      fermeture sont enregistrés (CI-22). */
  async fermer(membre: Intervenant, id: number, maintenant = new Date()): Promise<SujetApi> {
    await this.db.transaction(async (tx) => {
      const existant = await this.visible(tx, membre, id);
      if (existant.dateFermeture) throw conflit('Ce sujet est déjà fermé.');
      if (!peutFermerSujet(this.qui(membre, existant)))
        throw interdit('Seuls l’auteur du sujet et la modération peuvent le fermer.');
      await tx
        .update(sujet)
        .set({ fermeurId: membre.id, dateFermeture: maintenant })
        .where(eq(sujet.id, id));
    });
    return this.lecture.sujet(id, membre);
  }

  /** RG-65 : l'auteur rouvre un sujet qu'il a fermé lui-même ; la modération rouvre tout sujet. */
  async rouvrir(membre: Intervenant, id: number): Promise<SujetApi> {
    await this.db.transaction(async (tx) => {
      const existant = await this.visible(tx, membre, id);
      if (!existant.dateFermeture) throw conflit('Ce sujet est ouvert.');
      const qui = this.qui(membre, existant);
      if (!peutRouvrirSujet({ ...qui, fermeParLAuteur: existant.fermeurId === existant.auteurId }))
        throw interdit(
          qui.auteur
            ? 'Ce sujet a été fermé par la modération : elle seule peut le rouvrir.'
            : 'Seuls l’auteur du sujet et la modération peuvent le rouvrir.',
        );
      await tx.update(sujet).set({ fermeurId: null, dateFermeture: null }).where(eq(sujet.id, id));
    });
    return this.lecture.sujet(id, membre);
  }

  private qui(membre: Intervenant, existant: SujetVerrouille) {
    return { auteur: existant.auteurId === membre.id, moderation: membre.role !== 'MEMBRE' };
  }

  private async verrouiller(tx: Transaction, id: number): Promise<SujetVerrouille | null> {
    const [ligne] = await tx
      .select({
        id: sujet.id,
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        type: sujet.typeSujet,
        outilId: sujet.outilId,
        modeleId: sujet.modeleId,
        creationId: sujet.creationId,
        fermeurId: sujet.fermeurId,
        dateFermeture: sujet.dateFermeture,
      })
      .from(sujet)
      .innerJoin(contenu, eq(contenu.id, sujet.id))
      .where(eq(sujet.id, id))
      .for('update');
    return ligne && ligne.statut !== 'SUPPRIME' ? ligne : null;
  }

  /** Sujet de ce membre, visible ou masqué. */
  private async sien(
    tx: Transaction,
    auteurId: number,
    id: number,
    action: 'modifier' | 'supprimer',
  ): Promise<SujetVerrouille> {
    const ligne = await this.verrouiller(tx, id);
    if (!ligne) throw introuvable('Ce sujet est introuvable.');
    if (ligne.auteurId !== auteurId) {
      // RG-30 : ce qu'une personne ne peut pas voir n'existe pas pour elle.
      if (ligne.statut !== 'VISIBLE') throw introuvable('Ce sujet est introuvable.');
      throw interdit(`Seul son auteur peut ${action} ce sujet.`);
    }
    return ligne;
  }

  /** Sujet visible de tous ; masqué, il ne se ferme ni ne se rouvre. */
  private async visible(
    tx: Transaction,
    membre: Intervenant,
    id: number,
  ): Promise<SujetVerrouille> {
    const ligne = await this.verrouiller(tx, id);
    if (!ligne) throw introuvable('Ce sujet est introuvable.');
    if (ligne.statut !== 'VISIBLE') {
      const { auteur, moderation } = this.qui(membre, ligne);
      if (!auteur && !moderation) throw introuvable('Ce sujet est introuvable.');
      throw conflit('Ce sujet est masqué par la modération.');
    }
    return ligne;
  }
}

/** Colonnes du sujet tirées de la saisie (le type est fixé à la publication). */
function colonnes(saisie: SaisieSujet, corps: string) {
  return {
    titre: saisie.titre,
    slug: slugifier(saisie.titre) || 'sujet',
    corps,
    exempleAvant: saisie.exempleAvant,
    exempleApres: saisie.exempleApres,
    outilId: saisie.outilId,
    modeleId: saisie.modeleId,
    modeleNonReference: saisie.modeleNonReference,
    creationId: saisie.creationId,
  };
}
