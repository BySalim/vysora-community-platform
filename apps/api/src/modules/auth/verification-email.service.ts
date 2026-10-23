import { Inject, Injectable, Logger } from '@nestjs/common';
import { DELAIS, type LienEnvoye } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { ErreurApplication, conflit } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { utilisateur } from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { emailVerification } from './courriels.js';
import { refus } from './droits.js';
import { JetonsService } from './jetons.service.js';

const lienExpire = () => new ErreurApplication('LIEN_EXPIRE');

/* AUTH-02 (F-01, RG-02) : vérification de l'adresse e-mail. Tant qu'elle n'est pas vérifiée,
   le compte est en lecture seule ; le lien reçu reste valable 24 heures et peut être renvoyé. */
@Injectable()
export class VerificationEmailService {
  private readonly journal = new Logger(VerificationEmailService.name);

  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly jetons: JetonsService,
    private readonly emails: EmailService,
  ) {}

  /** Nouveau lien envoyé à l'adresse du compte. Un échec d'envoi est journalisé : le lien peut être renvoyé. */
  async envoyer(utilisateurId: number, email: string): Promise<void> {
    const valeur = await this.jetons.creer(
      utilisateurId,
      'VERIFICATION_EMAIL',
      DELAIS.lienVerificationEmailHeures * 60 * 60_000,
    );
    const lien = new URL(
      `/inscription?verifier=${encodeURIComponent(valeur)}`,
      this.config.SITE_URL,
    );
    try {
      await this.emails.envoyer(emailVerification(email, lien.href));
    } catch (erreur) {
      this.journal.warn(`E-mail de vérification non envoyé : ${String(erreur)}`);
    }
  }

  /** Le lien confirme l'adresse et sort le compte de la lecture seule. Ouvert une seconde fois, il confirme encore. */
  async verifier(valeur: string): Promise<void> {
    const lecture = await this.jetons.lire(valeur, 'VERIFICATION_EMAIL');
    if (lecture.etat === 'utilise' && (await this.estVerifie(lecture.ligne.utilisateurId))) return;
    if (lecture.etat !== 'valable') throw lienExpire();
    const { ligne } = lecture;
    await this.db.transaction(async (tx) => {
      if (!(await this.jetons.consommer(ligne.id, tx))) throw lienExpire();
      await tx
        .update(utilisateur)
        .set({ emailVerifie: true })
        .where(eq(utilisateur.id, ligne.utilisateurId));
    });
  }

  /** Renvoi du lien : au membre connecté, ou au compte d'un lien expiré (écran « Lien expiré »). */
  async renvoyer(utilisateurId: number | undefined, valeur?: string): Promise<LienEnvoye> {
    let id = utilisateurId;
    if (id === undefined && valeur) {
      const lecture = await this.jetons.lire(valeur, 'VERIFICATION_EMAIL');
      if (lecture.etat === 'valable' || lecture.etat === 'expire') id = lecture.ligne.utilisateurId;
    }
    if (id === undefined) throw refus('connexion');

    const [compte] = await this.db
      .select({
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
        statutCompte: utilisateur.statutCompte,
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, id));
    if (!compte?.email || compte.statutCompte === 'BANNI') throw refus('connexion');
    if (compte.emailVerifie) throw conflit('Votre adresse e-mail est déjà confirmée.');
    await this.envoyer(id, compte.email);
    return { email: compte.email };
  }

  private async estVerifie(utilisateurId: number): Promise<boolean> {
    const [compte] = await this.db
      .select({ emailVerifie: utilisateur.emailVerifie })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    return compte?.emailVerifie === true;
  }
}
