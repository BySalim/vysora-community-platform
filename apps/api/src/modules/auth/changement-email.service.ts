import { Inject, Injectable } from '@nestjs/common';
import {
  DELAIS,
  MESSAGES_PARAMETRES,
  type ChangementEmail,
  type EmailConfirmeApi,
} from '@vysora/shared';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import {
  ErreurApplication,
  conflit,
  erreurValidation,
  estViolationUnicite,
} from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { jeton, utilisateur } from '../../db/schema/index.js';
import { EmailService } from '../email/email.service.js';
import { MESSAGES_COMPTE } from './comptes.service.js';
import { emailAlerteChangement, emailConfirmationChangement } from './courriels.js';
import { JetonsService } from './jetons.service.js';
import { MotsDePasseService } from './mots-de-passe.service.js';

const lienExpire = () => new ErreurApplication('LIEN_EXPIRE');
const DUREE_LIEN_MS = DELAIS.lienVerificationEmailHeures * 60 * 60_000;

/* PARAM-01 (F-06, WF-02) : changement d'une adresse e-mail. Le mot de passe actuel est exigé ; un
   lien valable 24 heures part vers la nouvelle adresse, qui ne remplace l'actuelle qu'à sa
   confirmation ; l'adresse actuelle, si elle est vérifiée, reçoit une alerte. Une seule demande
   à la fois : un nouveau lien remplace le précédent. */
@Injectable()
export class ChangementEmailService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
    private readonly jetons: JetonsService,
    private readonly emails: EmailService,
    private readonly motsDePasse: MotsDePasseService,
  ) {}

  /** Nouvelle adresse en attente et date d'envoi du dernier lien encore valable. */
  async enAttente(
    utilisateurId: number,
    maintenant = new Date(),
  ): Promise<{ email: string; envoyeLe: Date } | null> {
    const [ligne] = await this.db
      .select({ email: jeton.emailCible, envoyeLe: jeton.dateCreation })
      .from(jeton)
      .where(
        and(
          eq(jeton.utilisateurId, utilisateurId),
          eq(jeton.type, 'CHANGEMENT_EMAIL'),
          isNull(jeton.dateUtilisation),
          gt(jeton.dateExpiration, maintenant),
        ),
      )
      .orderBy(desc(jeton.dateCreation))
      .limit(1);
    return ligne?.email ? { email: ligne.email, envoyeLe: ligne.envoyeLe } : null;
  }

  async demander(utilisateurId: number, saisie: ChangementEmail): Promise<void> {
    const [compte] = await this.db
      .select({
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
        empreinte: utilisateur.empreinteMotDePasse,
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    if (!compte?.email) throw lienExpire();
    // Un compte créé avec GitHub ou Google sans mot de passe (S-10) confirme par le lien envoyé à
    // la nouvelle adresse, et l'actuelle est prévenue, comme pour les autres comptes.
    if (compte.empreinte) {
      if (!saisie.motDePasse)
        throw erreurValidation({ motDePasse: MESSAGES_PARAMETRES.motDePasseActuel });
      if (!(await this.motsDePasse.verifier(compte.empreinte, saisie.motDePasse)))
        throw erreurValidation({ motDePasse: MESSAGES_PARAMETRES.motDePasseIncorrect });
    }
    if (compte.email.toLowerCase() === saisie.email.toLowerCase())
      throw erreurValidation({ email: MESSAGES_PARAMETRES.memeAdresse });
    if (await this.emailPris(saisie.email))
      throw conflit(undefined, { email: MESSAGES_COMPTE.emailPris });

    await this.envoyerLien(utilisateurId, saisie.email);
    // Une adresse jamais confirmée peut être celle d'un tiers (faute de frappe) : pas d'alerte.
    if (compte.emailVerifie)
      await this.emails.envoyer(
        emailAlerteChangement(compte.email, saisie.email, this.config.SITE_URL),
      );
  }

  /** « Renvoyer le lien » : un nouveau lien vers la même adresse ; l'alerte n'est pas répétée. */
  async renvoyer(utilisateurId: number): Promise<void> {
    const attente = await this.enAttente(utilisateurId);
    if (!attente) throw conflit('Aucun changement d’adresse n’est en attente.');
    await this.envoyerLien(utilisateurId, attente.email);
  }

  /** « Annuler le changement » : le lien envoyé cesse de fonctionner. */
  async annuler(utilisateurId: number): Promise<void> {
    await this.jetons.annuler(utilisateurId, 'CHANGEMENT_EMAIL');
  }

  /** Le lien ouvert depuis la nouvelle adresse la rend adresse du compte, vérifiée (RG-02). Ouvert
      une seconde fois, il confirme encore si l'adresse est restée celle du compte. */
  async confirmer(valeur: string): Promise<EmailConfirmeApi> {
    const lecture = await this.jetons.lire(valeur, 'CHANGEMENT_EMAIL');
    if (lecture.etat === 'utilise' && lecture.ligne.emailCible) {
      const actuelle = await this.adresse(lecture.ligne.utilisateurId);
      if (actuelle?.toLowerCase() === lecture.ligne.emailCible.toLowerCase())
        return { email: actuelle };
    }
    if (lecture.etat !== 'valable' || !lecture.ligne.emailCible) throw lienExpire();
    const { ligne } = lecture;
    const email = ligne.emailCible as string;
    try {
      await this.db.transaction(async (tx) => {
        if (!(await this.jetons.consommer(ligne.id, tx))) throw lienExpire();
        const modifies = await tx
          .update(utilisateur)
          .set({ email, emailVerifie: true })
          .where(
            and(
              eq(utilisateur.id, ligne.utilisateurId),
              sql`${utilisateur.statutCompte} in ('ACTIF', 'EN_SUPPRESSION')`,
            ),
          )
          .returning({ id: utilisateur.id });
        if (!modifies.length) throw lienExpire();
        // Un lien de vérification de l'ancienne adresse ne doit plus rien confirmer.
        await this.jetons.annuler(ligne.utilisateurId, 'VERIFICATION_EMAIL', tx);
      });
    } catch (erreur) {
      // Adresse prise par un autre compte entre la demande et la confirmation (RG-02).
      if (estViolationUnicite(erreur, 'utilisateur_email_unique'))
        throw conflit(MESSAGES_COMPTE.emailPris);
      throw erreur;
    }
    return { email };
  }

  private async envoyerLien(utilisateurId: number, email: string): Promise<void> {
    const valeur = await this.jetons.creer(utilisateurId, 'CHANGEMENT_EMAIL', DUREE_LIEN_MS, {
      emailCible: email,
    });
    const lien = new URL(`/parametres?email=${encodeURIComponent(valeur)}`, this.config.SITE_URL);
    await this.emails.envoyer(emailConfirmationChangement(email, lien.href));
  }

  private async adresse(utilisateurId: number): Promise<string | null> {
    const [compte] = await this.db
      .select({ email: utilisateur.email })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    return compte?.email ?? null;
  }

  private async emailPris(email: string): Promise<boolean> {
    return (
      (await this.db.$count(utilisateur, sql`lower(${utilisateur.email}) = lower(${email})`)) > 0
    );
  }
}
