import { Inject, Injectable } from '@nestjs/common';
import type { Signalement, SignalementEnregistreApi } from '@vysora/shared';
import { conflit, estViolationUnicite, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { signalement } from '../../db/schema/index.js';
import { lireCible } from '../interactions/cibles.js';

/* F-90 : un membre signale un contenu qu'il peut lire. RG-100 : motif de la liste, précision exigée
   pour « Autre », jamais sur son propre contenu, au plus un signalement ouvert par membre et par
   contenu (CI-21, index unique partiel). Le signalement attend la décision d'un modérateur (F-91). */
@Injectable()
export class SignalementsService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async signaler(
    membreId: number,
    contenuId: number,
    saisie: Signalement,
    maintenant = new Date(),
  ): Promise<SignalementEnregistreApi> {
    const cible = await lireCible(this.db, contenuId);
    // RG-30 : ce qu'une personne ne peut pas lire n'existe pas pour elle.
    if (!cible?.public) throw introuvable('Ce contenu est introuvable.');
    if (cible.auteurId === membreId)
      throw interdit('Vous ne pouvez pas signaler votre propre contenu.');
    try {
      const [cree] = await this.db
        .insert(signalement)
        .values({
          signaleurId: membreId,
          contenuId,
          motif: saisie.motif,
          precision: saisie.precision,
          date: maintenant,
        })
        .returning({ id: signalement.id, date: signalement.date });
      if (!cree) throw new Error('Signalement non enregistré');
      return { id: cree.id, date: cree.date.toISOString() };
    } catch (erreur) {
      if (estViolationUnicite(erreur, 'signalement_ouvert_unique'))
        throw conflit('Vous avez déjà signalé ce contenu. La modération l’examine.');
      throw erreur;
    }
  }
}
