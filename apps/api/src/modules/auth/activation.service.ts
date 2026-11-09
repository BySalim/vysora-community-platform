import { Inject, Injectable } from '@nestjs/common';
import { DELAIS, type Role } from '@vysora/shared';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { EmailService, type EmailAEnvoyer } from '../email/email.service.js';
import { emailActivation } from './courriels.js';
import { JetonsService } from './jetons.service.js';

/** Compte à activer, tel que le lien d'activation le présente. */
export interface CompteAActiver {
  id: number;
  email: string;
  /** Nom affiché, ou à défaut le pseudo. */
  nom: string;
  role: Role;
}

/** ADM-03 : compte créé par l'administration et jamais activé, sans mot de passe ni adresse confirmée.
    Un compte inscrit par e-mail a toujours un mot de passe ; un compte créé avec GitHub ou Google a
    toujours une adresse confirmée. */
export const activationEnAttente = (compte: {
  empreinteMotDePasse: string | null;
  emailVerifie: boolean;
}): boolean => compte.empreinteMotDePasse === null && !compte.emailVerifie;

/* ADM-03 : un compte de l'équipe n'est jamais créé par l'inscription publique. Un administrateur (ou,
   pour le premier, une commande sur le serveur) le crée sans mot de passe ; la personne reçoit à son
   adresse un lien à usage unique, valable DELAIS.lienActivationJours jours, vers l'écran du mot de
   passe (/connexion?jeton=…). Choisir son mot de passe confirme l'adresse et enregistre l'acceptation
   des documents en vigueur (ReinitialisationService). Un nouveau lien remplace le précédent. */
@Injectable()
export class ActivationService {
  constructor(
    @Inject(CONFIG) private readonly config: Pick<Configuration, 'SITE_URL'>,
    private readonly jetons: JetonsService,
    private readonly emails: EmailService,
  ) {}

  /** À appeler après la création du compte (transaction validée) : l'e-mail part par la file. */
  async envoyer(compte: CompteAActiver): Promise<void> {
    await this.emails.envoyer(await this.preparer(compte));
  }

  /** Nouveau lien (le précédent cesse de fonctionner) et l'e-mail qui le porte, prêt à partir. */
  async preparer(compte: CompteAActiver): Promise<EmailAEnvoyer> {
    const valeur = await this.jetons.creer(
      compte.id,
      'ACTIVATION_COMPTE',
      DELAIS.lienActivationJours * 24 * 60 * 60_000,
    );
    const lien = new URL(`/connexion?jeton=${encodeURIComponent(valeur)}`, this.config.SITE_URL);
    return emailActivation(compte.email, {
      nom: compte.nom,
      role: compte.role,
      lien: lien.href,
      jours: DELAIS.lienActivationJours,
    });
  }
}
