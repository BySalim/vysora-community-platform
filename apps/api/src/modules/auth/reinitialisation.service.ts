import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DELAIS,
  MESSAGES_MOT_DE_PASSE,
  evaluerMotDePasse,
  type LienReinitialisation,
  type Reinitialisation,
} from '@vysora/shared';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ErreurApplication, erreurValidation } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { utilisateur } from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { ActivationService, activationEnAttente } from './activation.service.js';
import { emailReinitialisation } from './courriels.js';
import { DocumentsLegauxService } from './documents-legaux.service.js';
import { JetonsService, type LigneJeton } from './jetons.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';
import type { ContexteConnexion } from './requete.js';
import { SessionsService } from './sessions.service.js';
import { TemporisationService } from './temporisation.service.js';

const lienExpire = (activation = false) =>
  new ErreurApplication('LIEN_EXPIRE', undefined, undefined, activation ? { activation } : {});

/* AUTH-03 (F-03, WF-02) : mot de passe oublié. La réponse est la même que l'adresse possède un compte
   ou non ; le lien reste valable une heure ; le nouveau mot de passe ferme toutes les sessions.
   ADM-03 : le même écran active un compte de l'équipe (lien d'activation, ActivationService) ; un
   compte jamais activé qui demande un lien reçoit un nouveau lien d'activation. */
@Injectable()
export class ReinitialisationService {
  private readonly journal = new Logger(ReinitialisationService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly jetons: JetonsService,
    private readonly emails: EmailService,
    private readonly activation: ActivationService,
    private readonly documents: DocumentsLegauxService,
    private readonly motsDePasse: MotsDePasseService,
    private readonly sessions: SessionsService,
    private readonly temporisation: TemporisationService,
  ) {}

  async demander(email: string): Promise<void> {
    const [compte] = await this.db
      .select({
        id: utilisateur.id,
        email: utilisateur.email,
        pseudo: utilisateur.pseudo,
        nomAffiche: utilisateur.nomAffiche,
        role: utilisateur.role,
        empreinteMotDePasse: utilisateur.empreinteMotDePasse,
        emailVerifie: utilisateur.emailVerifie,
      })
      .from(utilisateur)
      .where(
        and(
          sql`lower(${utilisateur.email}) = lower(${email})`,
          notInArray(utilisateur.statutCompte, ['BANNI', 'SUPPRIME']),
        ),
      )
      .limit(1);
    if (!compte?.email) return;
    const { email: adresse } = compte;

    if (activationEnAttente(compte)) {
      const email = await this.activation.preparer({
        id: compte.id,
        email: adresse,
        nom: compte.nomAffiche ?? compte.pseudo,
        role: compte.role,
      });
      void this.emails
        .envoyer(email)
        .catch((erreur: unknown) =>
          this.journal.warn(`E-mail d’activation non envoyé : ${String(erreur)}`),
        );
      return;
    }

    const valeur = await this.jetons.creer(
      compte.id,
      'REINITIALISATION_MOT_DE_PASSE',
      DELAIS.lienReinitialisationMinutes * 60_000,
    );
    const lien = new URL(`/connexion?jeton=${encodeURIComponent(valeur)}`, this.config.SITE_URL);
    // Mise en file sans attendre : la durée de la réponse ne dit pas si l'adresse possède un compte.
    void this.emails
      .envoyer(emailReinitialisation(adresse, lien.href))
      .catch((erreur: unknown) =>
        this.journal.warn(`E-mail de réinitialisation non envoyé : ${String(erreur)}`),
      );
  }

  /** Écran « Nouveau mot de passe » : le lien est-il valable, et pour quelle adresse ? */
  async lien(valeur: string): Promise<LienReinitialisation> {
    const { ligne, activation } = await this.lienValable(valeur);
    const compte = await this.compte(ligne.utilisateurId, activation);
    return { email: compte.email, activation };
  }

  async reinitialiser(saisie: Reinitialisation, contexte: ContexteConnexion): Promise<void> {
    const { ligne, activation } = await this.lienValable(saisie.jeton);
    const compte = await this.compte(ligne.utilisateurId, activation);

    // RG-04, comme à l'inscription.
    const evaluation = evaluerMotDePasse(saisie.motDePasse, {
      pseudo: compte.pseudo,
      email: compte.email,
    });
    if (evaluation.message) throw erreurValidation({ motDePasse: evaluation.message });
    if (await this.motsDePasse.estDansUneFuite(saisie.motDePasse))
      throw erreurValidation({ motDePasse: MESSAGES_MOT_DE_PASSE.compromis });

    const empreinte = await this.motsDePasse.hacher(saisie.motDePasse);
    await this.db.transaction(async (tx) => {
      if (!(await this.jetons.consommer(ligne.id, tx))) throw lienExpire();
      // Ouvrir le lien prouve l'accès à la boîte : l'adresse est vérifiée du même coup (RG-02).
      // Le premier mot de passe d'un compte de l'équipe n'est pas un changement (ADM-03).
      await tx
        .update(utilisateur)
        .set({
          empreinteMotDePasse: empreinte,
          emailVerifie: true,
          ...(activation ? {} : { dateMotDePasse: new Date() }),
        })
        .where(eq(utilisateur.id, compte.id));
      // RG-03 : l'écran d'activation annonce l'acceptation des documents en vigueur, comme
      // l'inscription ; elle est enregistrée, datée, avec le mot de passe.
      if (activation) await this.documents.accepterEnVigueur(compte.id, tx);
      await this.sessions.fermerToutes(compte.id, tx);
    });
    // Le compte retrouve l'accès sans attendre la fin d'une temporisation en cours (F-03).
    await this.temporisation.enregistrer({
      empreinteIdentifiant: this.temporisation.empreinte(compte.email),
      utilisateurId: compte.id,
      ip: contexte.ip,
      reussie: true,
    });
  }

  /** Lien de réinitialisation ou d'activation, encore valable ; sinon « Lien expiré », qui dit s'il
      s'agissait d'une activation (l'écran donne alors sa durée). */
  private async lienValable(valeur: string): Promise<{ ligne: LigneJeton; activation: boolean }> {
    let lecture = await this.jetons.lire(valeur, 'REINITIALISATION_MOT_DE_PASSE');
    let activation = false;
    if (lecture.etat === 'inconnu') {
      lecture = await this.jetons.lire(valeur, 'ACTIVATION_COMPTE');
      activation = lecture.etat !== 'inconnu';
    }
    if (lecture.etat !== 'valable') throw lienExpire(activation);
    return { ligne: lecture.ligne, activation };
  }

  private async compte(
    utilisateurId: number,
    activation = false,
  ): Promise<{ id: number; pseudo: string; email: string }> {
    const [compte] = await this.db
      .select({
        id: utilisateur.id,
        pseudo: utilisateur.pseudo,
        email: utilisateur.email,
        statutCompte: utilisateur.statutCompte,
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    if (!compte?.email || compte.statutCompte === 'BANNI' || compte.statutCompte === 'SUPPRIME')
      throw lienExpire(activation);
    return { id: compte.id, pseudo: compte.pseudo, email: compte.email };
  }
}
