import { Inject, Injectable } from '@nestjs/common';
import {
  controlerPublication,
  LIMITES,
  limiteQuotidienne,
  liensMaximum,
  MESSAGES_PUBLICATION,
  type AvertissementAgent,
  type ContenuCreation,
  type CreationFicheApi,
  type EtatVisiteur,
  type PublicationCreation,
  type Role,
  type StatutContenu,
  type StatutPublication,
  type TypeCreation,
} from '@vysora/shared';
import { and, asc, eq, gt, inArray, ne } from 'drizzle-orm';
import {
  conflit,
  ErreurApplication,
  erreurValidation,
  interdit,
  introuvable,
} from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import {
  commentaire,
  contenu,
  creation,
  reproduction,
  utilisateur,
} from '../../db/schema/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReputationService } from '../progression/reputation.service.js';
import {
  ecrireContenu,
  indexer,
  licenceDe,
  lireAControler,
  retirerDeLaRecherche,
} from './contenu-creation.js';
import { CreationsService } from './creations.service.js';

const JOUR_MS = 24 * 60 * 60_000;

/** Auteur d'une création : identifiant, rôle et état (niveau pour RG-85). */
export interface Redacteur {
  id: number;
  role: Role;
  etat: EtatVisiteur;
}

interface CreationVerrouillee {
  id: number;
  auteurId: number;
  type: TypeCreation;
  statut: StatutPublication;
  statutContenu: StatutContenu;
  datePublication: Date | null;
  avertissementAgent: AvertissementAgent;
}

/** « dans 5 h 12 min », « dans 40 min », « dans moins d’une minute ». */
function delai(secondes: number): string {
  const minutes = Math.ceil(secondes / 60);
  if (minutes <= 1) return 'dans moins d’une minute';
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (!heures) return `dans ${reste} min`;
  return reste ? `dans ${heures} h ${reste} min` : `dans ${heures} h`;
}

/* CREA-05 : écriture des créations par leur auteur (F-10 à F-17).
   - Brouillon : enregistré tel quel, complet ou non (F-16), visible de son seul auteur (RG-30).
   - Publication (RG-17) : RG-10 à RG-16 et la règle du résultat (controlerPublication, paquet
     partagé), la limite par 24 heures (RG-85), puis la case de confirmation, dans l'ordre de l'éditeur.
   - Modification d'une création publiée (RG-18) : publiée aussitôt, aux mêmes conditions ; le type ne
     change plus après la première publication.
   - Dépublication (RG-17) : retour en brouillon ; commentaires et reproductions ne se voient plus.
   - Suppression (RG-19) : contenu SUPPRIME, mouvements de réputation liés annulés (RG-82).
   Une création publiée et visible est un document de recherche (RG-31). */
@Injectable()
export class EcritureCreationsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly lecture: CreationsService,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Nouveau brouillon. */
  async creer(
    auteur: Redacteur,
    saisie: ContenuCreation,
    maintenant = new Date(),
  ): Promise<CreationFicheApi> {
    const id = await this.db.transaction(async (tx) => {
      await this.verifierBrouillons(tx, auteur.id);
      const licenceId = await licenceDe(tx, saisie.licenceId);
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'CREATION', auteurId: auteur.id, dateCreation: maintenant })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Création non enregistrée');
      await tx.insert(creation).values({ id: ligne.id, typeCreation: saisie.type, licenceId });
      await ecrireContenu(
        tx,
        { id: ligne.id, auteurId: auteur.id, avertissementAgent: 'AUCUN' },
        saisie,
        maintenant,
      );
      return ligne.id;
    });
    return this.lecture.fiche(id, auteur);
  }

  /** Enregistre le contenu complet ; celui d'une création publiée est publié aussitôt (RG-18). */
  async enregistrer(
    auteur: Redacteur,
    id: number,
    saisie: ContenuCreation,
    maintenant = new Date(),
  ): Promise<CreationFicheApi> {
    await this.db.transaction(async (tx) => {
      const existante = await this.sienne(tx, auteur.id, id);
      // RG-18 : le type ne change plus une fois la création publiée, même dépubliée ensuite.
      if (existante.datePublication && saisie.type !== existante.type)
        throw erreurValidation({ type: 'Le type d’une création publiée ne change plus.' });
      await ecrireContenu(tx, existante, saisie, maintenant);
      if (existante.statut !== 'PUBLIEE') return;
      await this.controler(tx, auteur, id);
      if (!saisie.confirmationDonnees)
        throw erreurValidation({ confirmationDonnees: MESSAGES_PUBLICATION.confirmation });
      await tx
        .update(creation)
        .set({ dateConfirmationDonnees: maintenant })
        .where(eq(creation.id, id));
      if (existante.statutContenu === 'VISIBLE') await indexer(tx, id);
    });
    return this.lecture.fiche(id, auteur);
  }

  /** RG-17 : publication d'un brouillon. */
  async publier(
    auteur: Redacteur,
    id: number,
    saisie: PublicationCreation,
    maintenant = new Date(),
  ): Promise<CreationFicheApi> {
    await this.db.transaction(async (tx) => {
      const existante = await this.sienne(tx, auteur.id, id);
      if (existante.statut === 'PUBLIEE') throw conflit('Cette création est déjà publiée.');
      await this.controler(tx, auteur, id);
      await this.verifierLimite(tx, auteur, id, maintenant);
      if (!saisie.confirmationDonnees)
        throw erreurValidation({ confirmationDonnees: MESSAGES_PUBLICATION.confirmation });
      await tx
        .update(creation)
        .set({
          statutPublication: 'PUBLIEE',
          datePublication: maintenant,
          dateConfirmationDonnees: maintenant,
        })
        .where(eq(creation.id, id));
      if (existante.statutContenu === 'VISIBLE') await indexer(tx, id);
    });
    // Le badge « Première création » viendra avec S-09.
    return this.lecture.fiche(id, auteur);
  }

  /** RG-17 : retour en brouillon, visible de son seul auteur. */
  async depublier(auteur: Redacteur, id: number): Promise<CreationFicheApi> {
    await this.db.transaction(async (tx) => {
      const existante = await this.sienne(tx, auteur.id, id);
      if (existante.statut !== 'PUBLIEE') throw conflit('Cette création n’est pas publiée.');
      await tx.update(creation).set({ statutPublication: 'BROUILLON' }).where(eq(creation.id, id));
      await retirerDeLaRecherche(tx, id);
    });
    return this.lecture.fiche(id, auteur);
  }

  /** RG-19 : suppression définitive pour les autres membres ; points liés annulés (RG-82). */
  async supprimer(auteurId: number, id: number, maintenant = new Date()): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.sienne(tx, auteurId, id);
      await tx.update(contenu).set({ statut: 'SUPPRIME' }).where(eq(contenu.id, id));
      const [commentaires, reproductions] = [
        await tx
          .select({ id: commentaire.id })
          .from(commentaire)
          .where(eq(commentaire.creationId, id)),
        await tx
          .select({ id: reproduction.id })
          .from(reproduction)
          .where(eq(reproduction.creationId, id)),
      ];
      const nes = [id, ...commentaires.map((c) => c.id), ...reproductions.map((r) => r.id)];
      await this.reputation.annulerContenus(tx, nes, maintenant);
      // Votes, commentaires et essais de la création ne sont plus notifiés (NOTIF-01).
      await this.notifications.retirer(tx, nes);
      await retirerDeLaRecherche(tx, id);
    });
  }

  /** Création de ce membre, verrouillée pour la durée de la transaction. */
  private async sienne(
    tx: Transaction,
    auteurId: number,
    id: number,
  ): Promise<CreationVerrouillee> {
    const [ligne] = await tx
      .select({
        id: creation.id,
        auteurId: contenu.auteurId,
        type: creation.typeCreation,
        statut: creation.statutPublication,
        statutContenu: contenu.statut,
        datePublication: creation.datePublication,
        avertissementAgent: creation.avertissementAgent,
      })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .where(eq(creation.id, id))
      .for('update');
    if (!ligne || ligne.statutContenu === 'SUPPRIME')
      throw introuvable('Cette création est introuvable.');
    if (ligne.auteurId !== auteurId) {
      // RG-30 : ce qu'une personne ne peut pas voir n'existe pas pour elle.
      if (ligne.statut !== 'PUBLIEE' || ligne.statutContenu !== 'VISIBLE')
        throw introuvable('Cette création est introuvable.');
      throw interdit('Seul son auteur peut modifier cette création.');
    }
    return ligne;
  }

  /** Garde-fou : 50 brouillons au plus par membre (registre, points tranchés de CREA-02). */
  private async verifierBrouillons(tx: Transaction, auteurId: number): Promise<void> {
    // Les brouillons d'un même membre se comptent l'un après l'autre (limite exacte).
    await tx
      .select({ id: utilisateur.id })
      .from(utilisateur)
      .where(eq(utilisateur.id, auteurId))
      .for('update');
    const brouillons = await tx.$count(
      creation,
      and(
        eq(creation.statutPublication, 'BROUILLON'),
        inArray(
          creation.id,
          tx
            .select({ id: contenu.id })
            .from(contenu)
            .where(and(eq(contenu.auteurId, auteurId), ne(contenu.statut, 'SUPPRIME'))),
        ),
      ),
    );
    if (brouillons >= LIMITES.brouillonsParMembre)
      throw new ErreurApplication(
        'LIMITE_ATTEINTE',
        `Vous avez ${LIMITES.brouillonsParMembre} brouillons. Publiez-en ou supprimez-en un pour en commencer un autre.`,
      );
  }

  /** RG-10 à RG-16 et règle du résultat, sur ce qui est enregistré. */
  private async controler(tx: Transaction, auteur: Redacteur, id: number): Promise<void> {
    const erreurs = controlerPublication(await lireAControler(tx, id), {
      liensMaximum: liensMaximum(auteur.etat),
    });
    const n = Object.keys(erreurs).length;
    if (n)
      throw erreurValidation(
        erreurs,
        `${n} ${n > 1 ? 'points' : 'point'} à compléter avant de publier.`,
      );
  }

  /** RG-85 : créations publiées sur 24 heures glissantes, selon le niveau ; une création publiée,
      dépubliée puis republiée compte une fois. */
  private async verifierLimite(
    tx: Transaction,
    auteur: Redacteur,
    id: number,
    maintenant: Date,
  ): Promise<void> {
    const limite = limiteQuotidienne('creations', auteur.etat);
    if (!Number.isFinite(limite)) return;
    // Les publications d'un même membre se comptent l'une après l'autre (limite exacte).
    await tx
      .select({ id: utilisateur.id })
      .from(utilisateur)
      .where(eq(utilisateur.id, auteur.id))
      .for('update');
    const publiees = await tx
      .select({ date: creation.datePublication })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .where(
        and(
          eq(contenu.auteurId, auteur.id),
          gt(creation.datePublication, new Date(maintenant.getTime() - JOUR_MS)),
          ne(creation.id, id),
        ),
      )
      .orderBy(asc(creation.datePublication));
    if (publiees.length < limite) return;
    // Une place se libère quand la plus ancienne des publications en trop sort des 24 heures.
    const liberatrice = publiees[publiees.length - limite]?.date ?? maintenant;
    const secondes = Math.max(
      1,
      Math.ceil((liberatrice.getTime() + JOUR_MS - maintenant.getTime()) / 1000),
    );
    throw new ErreurApplication(
      'LIMITE_ATTEINTE',
      `Limite de ${limite} publications par 24 heures atteinte. Vous pourrez publier ${delai(secondes)} ; votre brouillon reste enregistré.`,
      undefined,
      { reessayerDans: secondes },
    );
  }
}
