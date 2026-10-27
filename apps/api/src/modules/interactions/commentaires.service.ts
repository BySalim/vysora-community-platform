import { Inject, Injectable } from '@nestjs/common';
import {
  type CommentaireApi,
  type EtatVisiteur,
  type ModificationCommentaire,
  type NouveauCommentaire,
} from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import { erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { commentaire, contenu } from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { verifierLimiteQuotidienne } from '../progression/limites.js';
import { lireCible } from './cibles.js';

/** Personne qui commente : identifiant et état (niveau et rôle pour RG-85). */
export interface Commentateur {
  id: number;
  etat: EtatVisiteur;
}

/* INT-03 : commentaires d'une création publiée (F-40, F-42, RG-50, RG-51, RG-85).
   Un commentaire retiré par son auteur passe au statut SUPPRIME : il disparaît, ou reste sous la
   forme « Commentaire supprimé » s'il a des réponses (lecture : CreationsService).
   RG-91 : l'auteur de la création et celui du commentaire auquel on répond sont notifiés. */
@Injectable()
export class CommentairesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
    private readonly notifications: NotificationsService,
  ) {}

  async commenter(
    membre: Commentateur,
    creationId: number,
    saisie: NouveauCommentaire,
    maintenant = new Date(),
  ): Promise<CommentaireApi> {
    const cible = await lireCible(this.db, creationId);
    if (!cible?.public || cible.type !== 'CREATION')
      throw introuvable('Cette création est introuvable.');

    // F-42 : une réponse à une réponse est rattachée au commentaire d'origine.
    let parentId: number | null = null;
    let auteurDuParent: number | null = null;
    if (saisie.parentId) {
      const [parent] = await this.db
        .select({
          id: commentaire.id,
          parentId: commentaire.parentId,
          statut: contenu.statut,
          auteurId: contenu.auteurId,
        })
        .from(commentaire)
        .innerJoin(contenu, eq(contenu.id, commentaire.id))
        .where(and(eq(commentaire.id, saisie.parentId), eq(commentaire.creationId, creationId)));
      if (!parent || parent.statut !== 'VISIBLE')
        throw erreurValidation({ parentId: 'Ce commentaire n’est plus disponible.' });
      parentId = parent.parentId ?? parent.id;
      auteurDuParent = parent.auteurId;
    }

    const id = await this.db.transaction(async (tx) => {
      // RG-85 : réponses du forum et commentaires publiés sur 24 heures glissantes.
      await verifierLimiteQuotidienne(tx, membre, 'reponses', maintenant);
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'COMMENTAIRE', auteurId: membre.id, dateCreation: maintenant })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Commentaire non enregistré');
      await tx
        .insert(commentaire)
        .values({ id: ligne.id, creationId, parentId, corps: saisie.corps });
      // RG-91 : réponse à mon commentaire ; commentaire sur ma création (une seule notification
      // quand l'auteur de la création est aussi celui du commentaire auquel on répond).
      if (auteurDuParent !== null)
        await this.notifications.notifier(tx, {
          type: 'REPONSE_COMMENTAIRE',
          destinataireId: auteurDuParent,
          declencheurId: membre.id,
          contenuId: ligne.id,
          donnees: { origineId: saisie.parentId ?? undefined },
          date: maintenant,
        });
      if (cible.auteurId !== auteurDuParent)
        await this.notifications.notifier(tx, {
          type: 'COMMENTAIRE_RECU',
          destinataireId: cible.auteurId,
          declencheurId: membre.id,
          contenuId: ligne.id,
          date: maintenant,
        });
      return ligne.id;
    });
    return this.presenter(id);
  }

  /** F-40 : seul son auteur modifie un commentaire ; la date de modification est affichée. */
  async modifier(
    membreId: number,
    id: number,
    saisie: ModificationCommentaire,
  ): Promise<CommentaireApi> {
    await this.sien(membreId, id);
    await this.db.transaction(async (tx) => {
      await tx.update(commentaire).set({ corps: saisie.corps }).where(eq(commentaire.id, id));
      await tx.update(contenu).set({ dateModification: new Date() }).where(eq(contenu.id, id));
    });
    return this.presenter(id);
  }

  /** RG-51 : retiré par son auteur ; il reste « Commentaire supprimé » s'il a des réponses. */
  async supprimer(membreId: number, id: number): Promise<void> {
    await this.sien(membreId, id);
    await this.db.transaction(async (tx) => {
      await tx.update(contenu).set({ statut: 'SUPPRIME' }).where(eq(contenu.id, id));
      // Ses notifications disparaissent avec lui (texte retiré, compteur à jour).
      await this.notifications.retirer(tx, [id]);
    });
  }

  /** Commentaire visible, sur une création visible, écrit par ce membre. */
  private async sien(membreId: number, id: number): Promise<void> {
    const [ligne] = await this.db
      .select({
        auteurId: contenu.auteurId,
        statut: contenu.statut,
        creationId: commentaire.creationId,
      })
      .from(commentaire)
      .innerJoin(contenu, eq(contenu.id, commentaire.id))
      .where(eq(commentaire.id, id));
    const creation = ligne ? await lireCible(this.db, ligne.creationId) : null;
    if (!ligne || ligne.statut !== 'VISIBLE' || !creation?.public)
      throw introuvable('Ce commentaire est introuvable.');
    if (ligne.auteurId !== membreId)
      throw interdit('Seul son auteur peut modifier ou supprimer ce commentaire.');
  }

  private async presenter(id: number): Promise<CommentaireApi> {
    const [ligne] = await this.db
      .select({
        id: commentaire.id,
        parentId: commentaire.parentId,
        corps: commentaire.corps,
        auteurId: contenu.auteurId,
        date: contenu.dateCreation,
        dateModification: contenu.dateModification,
      })
      .from(commentaire)
      .innerJoin(contenu, eq(contenu.id, commentaire.id))
      .where(eq(commentaire.id, id));
    if (!ligne) throw introuvable('Ce commentaire est introuvable.');
    const auteur = (await resumerMembres(this.db, this.stockage, [ligne.auteurId])).get(
      ligne.auteurId,
    );
    return {
      id: ligne.id,
      parentId: ligne.parentId,
      auteur: auteur ?? null,
      date: ligne.date.toISOString(),
      dateModification: ligne.dateModification?.toISOString() ?? null,
      corps: ligne.corps,
      supprime: false,
    };
  }
}
