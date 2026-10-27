import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGES_MOT_DE_PASSE,
  MESSAGES_PARAMETRES,
  evaluerMotDePasse,
  type ChangementMotDePasse,
} from '@vysora/shared';
import { eq } from 'drizzle-orm';
import { erreurValidation, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { utilisateur } from '../../db/schema/index.js';
import { JetonsService } from './jetons.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import type { SessionOuverte } from './requete.js';
import { SessionsService } from './sessions.service.js';

/* PARAM-01 (F-06, WF-02) : changement du mot de passe depuis les paramètres. Le mot de passe actuel
   est exigé ; le nouveau suit RG-04, comme à l'inscription ; un lien de réinitialisation encore
   ouvert cesse de fonctionner ; les autres appareils sont déconnectés si le membre le demande. */
@Injectable()
export class ChangementMotDePasseService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly jetons: JetonsService,
  ) {}

  async modifier(ouverte: SessionOuverte, saisie: ChangementMotDePasse): Promise<void> {
    const [compte] = await this.db
      .select({
        pseudo: utilisateur.pseudo,
        email: utilisateur.email,
        empreinte: utilisateur.empreinteMotDePasse,
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, ouverte.utilisateur.id));
    if (!compte) throw introuvable();
    if (!(await this.motsDePasse.verifier(compte.empreinte, saisie.actuel)))
      throw erreurValidation({ actuel: MESSAGES_PARAMETRES.motDePasseIncorrect });

    const evaluation = evaluerMotDePasse(saisie.nouveau, {
      pseudo: compte.pseudo,
      email: compte.email ?? undefined,
    });
    if (evaluation.message) throw erreurValidation({ nouveau: evaluation.message });
    if (await this.motsDePasse.estDansUneFuite(saisie.nouveau))
      throw erreurValidation({ nouveau: MESSAGES_MOT_DE_PASSE.compromis });

    const empreinte = await this.motsDePasse.hacher(saisie.nouveau);
    await this.db.transaction(async (tx) => {
      await tx
        .update(utilisateur)
        .set({ empreinteMotDePasse: empreinte, dateMotDePasse: new Date() })
        .where(eq(utilisateur.id, ouverte.utilisateur.id));
      await this.jetons.annuler(ouverte.utilisateur.id, 'REINITIALISATION_MOT_DE_PASSE', tx);
      if (saisie.deconnecterAutres)
        await this.sessions.fermerAutres(ouverte.utilisateur.id, ouverte.id, tx);
    });
  }
}
