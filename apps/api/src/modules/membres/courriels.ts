import type { EmailAEnvoyer } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';
import { dateLongue } from '../auth/courriels.js';

/* E-mails des droits sur les données (RG-90 : toujours envoyés, quelles que soient les préférences),
   à une adresse vérifiée : export prêt (F-07, WF-22), demande et confirmation de suppression du
   compte (F-08, WF-23). */

const jour = (date: Date): string => dateLongue(date.toISOString().slice(0, 10));

export function emailExportPret(a: string, expiration: Date, siteUrl: string): EmailAEnvoyer {
  return {
    a,
    sujet: 'Vos données sont prêtes',
    ...miseEnForme({
      titre: 'Vos données sont prêtes',
      paragraphes: [
        `Bonjour, le fichier de vos données Vysora est prêt. Téléchargez-le jusqu’au ${jour(expiration)} depuis la rubrique « Mes données » de vos paramètres.`,
        'Il contient votre compte, vos acceptations des documents légaux, vos contributions, vos votes, vos contenus enregistrés, vos badges et vos mouvements de réputation, au format JSON.',
        'Si vous n’êtes pas à l’origine de cette demande, changez votre mot de passe depuis vos paramètres.',
      ],
      action: {
        libelle: 'Télécharger mes données',
        url: new URL('/parametres#export', siteUrl).href,
      },
    }),
  };
}

const devenir = (supprimerCreations: boolean): string =>
  supprimerCreations
    ? 'Vos créations seront supprimées en même temps que vos données personnelles ; vos autres contributions resteront, signées par un pseudo anonyme.'
    : 'Vos données personnelles seront effacées ; vos créations et vos autres contributions resteront, signées par un pseudo anonyme.';

export function emailDemandeSuppression(
  a: string,
  effacement: Date,
  supprimerCreations: boolean,
  siteUrl: string,
): EmailAEnvoyer {
  const veille = new Date(effacement.getTime() - 24 * 3600_000);
  return {
    a,
    sujet: 'Votre demande de suppression de compte',
    ...miseEnForme({
      titre: 'Votre demande de suppression de compte',
      paragraphes: [
        `Bonjour, votre compte Vysora sera supprimé le ${jour(effacement)}. D’ici là, votre profil n’est plus accessible aux autres membres.`,
        `Vous changez d’avis ? Reconnectez-vous jusqu’au ${jour(veille)} : la demande sera annulée et votre compte conservé tel quel.`,
        devenir(supprimerCreations),
        'Si vous n’êtes pas à l’origine de cette demande, reconnectez-vous sans attendre et changez votre mot de passe.',
      ],
      action: {
        libelle: 'Se reconnecter',
        url: new URL('/connexion?retour=/parametres', siteUrl).href,
      },
    }),
  };
}

export function emailCompteSupprime(a: string, supprimerCreations: boolean): EmailAEnvoyer {
  return {
    a,
    sujet: 'Votre compte Vysora est supprimé',
    ...miseEnForme({
      titre: 'Votre compte Vysora est supprimé',
      paragraphes: [
        'Bonjour, comme vous l’avez demandé il y a 30 jours, votre compte Vysora est supprimé et vos données personnelles sont effacées. Cette adresse n’est plus associée à aucun compte.',
        supprimerCreations
          ? 'Vos créations sont supprimées ; vos autres contributions restent, signées par un pseudo anonyme.'
          : 'Vos créations et vos autres contributions restent, signées par un pseudo anonyme.',
      ],
    }),
  };
}
