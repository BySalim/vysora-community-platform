import type { EmailAEnvoyer } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';

/* E-mails transactionnels des comptes (RG-90 : toujours envoyés, quelles que soient les préférences).
   Les liens mènent aux écrans du prototype : /inscription?verifier=… et /connexion?jeton=… */

export function emailVerification(a: string, lien: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Confirmez votre adresse e-mail',
    ...miseEnForme({
      titre: 'Confirmez votre adresse e-mail',
      paragraphes: [
        'Bonjour, confirmez votre adresse pour publier, voter et répondre sur Vysora. Ce lien reste valable 24 heures.',
        'Si vous n’avez pas créé de compte sur Vysora, ignorez cet e-mail : aucun compte ne sera activé.',
      ],
      action: { libelle: 'Confirmer mon adresse', url: lien },
    }),
  };
}

export function emailReinitialisation(a: string, lien: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Choisissez un nouveau mot de passe',
    ...miseEnForme({
      titre: 'Choisissez un nouveau mot de passe',
      paragraphes: [
        'Bonjour, vous avez demandé à changer le mot de passe de votre compte Vysora. Ce lien reste valable une heure.',
        'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.',
      ],
      action: { libelle: 'Choisir un nouveau mot de passe', url: lien },
    }),
  };
}
