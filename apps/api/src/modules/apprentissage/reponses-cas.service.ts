import { Inject, Injectable } from '@nestjs/common';
import { BAREME_REPUTATION, type ReponseCasApi, type Role } from '@vysora/shared';
import { and, eq } from 'drizzle-orm';
import { conflit, erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { casBonReflexe, choixOption, contenu, optionReponse } from '../../db/schema/index.js';
import { ReputationService } from '../progression/reputation.service.js';
import { corriger, optionsDes } from './contenu-cas.js';

/** Personne connectée qui répond : enregistrer vaut pour un compte actif (droit « contribuer »). */
export interface Apprenant {
  id: number;
  role: Role;
  enregistrer: boolean;
}

const DEJA_REPONDU = 'Vous avez déjà répondu à ce cas : votre première réponse est définitive.';

/* APP-01 : répondre à un cas Bon réflexe (F-62, WF-18).
   - CI-17 : un cas validé et visible de tous ; jamais par son auteur (RG-72).
   - RG-72 : une réponse par membre, définitive ; +1 si elle est juste (RG-80, une fois).
   - Un visiteur, ou un compte en lecture seule (adresse à vérifier, conditions à accepter,
     suspension), répond sans que sa réponse soit gardée et reçoit la correction (F-62). */
@Injectable()
export class ReponsesCasService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly reputation: ReputationService,
  ) {}

  async repondre(
    casId: number,
    optionId: number,
    personne: Apprenant | null,
    maintenant = new Date(),
  ): Promise<ReponseCasApi> {
    const { correcte, dateChoix, explication } = await this.db.transaction(async (tx) => {
      // Partagé : l'auteur ne change pas les options pendant qu'on y répond.
      const [cas] = await tx
        .select({
          auteurId: contenu.auteurId,
          statut: contenu.statut,
          validation: casBonReflexe.statutValidation,
          explication: casBonReflexe.explication,
        })
        .from(casBonReflexe)
        .innerJoin(contenu, eq(contenu.id, casBonReflexe.id))
        .where(eq(casBonReflexe.id, casId))
        .for('share');
      const auteur = personne !== null && cas?.auteurId === personne.id;
      const moderation = personne !== null && personne.role !== 'MEMBRE';
      if (!cas || cas.statut === 'SUPPRIME') throw introuvable('Ce cas est introuvable.');
      if (cas.statut !== 'VISIBLE' || cas.validation !== 'VALIDE') {
        if (!auteur && !moderation) throw introuvable('Ce cas est introuvable.');
        throw conflit(
          cas.statut === 'MASQUE'
            ? 'Ce cas est masqué par la modération : il ne reçoit pas de réponses.'
            : 'Ce cas n’est pas validé : il ne reçoit pas encore de réponses.',
        );
      }
      // RG-72 : l'auteur du cas ne peut pas y répondre.
      if (auteur) throw interdit('Vous êtes l’auteur de ce cas : vous ne pouvez pas y répondre.');
      const [option] = await tx
        .select({ correcte: optionReponse.estCorrecte })
        .from(optionReponse)
        .where(and(eq(optionReponse.id, optionId), eq(optionReponse.casId, casId)));
      if (!option) throw erreurValidation({ optionId: 'Choisissez une des options de ce cas.' });

      let enregistreeLe: Date | null = null;
      if (personne) {
        const deja = await tx.$count(
          choixOption,
          and(eq(choixOption.utilisateurId, personne.id), eq(choixOption.casId, casId)),
        );
        if (deja) throw conflit(DEJA_REPONDU);
        if (personne.enregistrer) {
          const [nouveau] = await tx
            .insert(choixOption)
            .values({ utilisateurId: personne.id, casId, optionId, dateChoix: maintenant })
            .onConflictDoNothing()
            .returning({ date: choixOption.dateChoix });
          if (!nouveau) throw conflit(DEJA_REPONDU);
          enregistreeLe = nouveau.date;
          if (option.correcte)
            await this.reputation.crediterUneFois(
              tx,
              {
                beneficiaireId: personne.id,
                acteurId: personne.id,
                contenuId: casId,
                motif: 'CAS_REUSSI',
                points: BAREME_REPUTATION.casReussi,
              },
              maintenant,
            );
        }
      }
      return { correcte: option.correcte, dateChoix: enregistreeLe, explication: cas.explication };
    });
    // Les badges « Bon réflexe » et « Assidu » (WF-18) viendront avec S-09.
    const options = (await optionsDes(this.db, [casId])).get(casId) ?? [];
    return {
      optionId,
      correcte,
      enregistree: dateChoix !== null,
      date: dateChoix?.toISOString() ?? null,
      correction: corriger(explication, options),
    };
  }
}
