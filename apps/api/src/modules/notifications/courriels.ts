import type { NotificationApi } from '@vysora/shared';
import type { EmailAEnvoyer } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';

/* E-mails qui accompagnent une notification (WF-25) : réponse à un sujet et réponse acceptée selon
   la préférence du membre (F-81). Le lien ouvre la notification sur la page Notifications. Une
   décision de modération a son propre e-mail, plus complet (moderation/courriels.ts, RG-90). */

/** « Votre question », « votre astuce »… (mot du prototype pour chaque type de sujet). */
const MOTS_SUJET: Record<string, string> = {
  QUESTION: 'question',
  CLINIQUE: 'clinique du prompt',
  ASTUCE: 'astuce',
  RETOUR_EXPERIENCE: 'retour d’expérience',
  DISCUSSION: 'discussion',
};

const extrait = (texte: string | null, longueur = 280): string | undefined => {
  if (!texte) return undefined;
  const plat = texte.replace(/\s+/g, ' ').trim();
  return plat.length > longueur ? `${plat.slice(0, longueur - 1).trimEnd()}…` : plat;
};

function contenuDe(n: NotificationApi): { titre: string; paragraphes: string[] } {
  const qui = n.par?.nom ?? 'Un membre';
  const titreCible = n.cible ? `« ${n.cible.titre} »` : 'votre contenu';
  switch (n.type) {
    case 'REPONSE_SUJET': {
      const mot = MOTS_SUJET[n.cible?.typeSujet ?? ''] ?? 'sujet';
      return {
        titre: `${qui} a répondu à votre ${mot}`,
        paragraphes: [`Nouvelle réponse dans ${titreCible}.`, extrait(n.texte) ?? ''].filter(
          Boolean,
        ),
      };
    }
    case 'REPONSE_ACCEPTEE':
      return {
        titre: `${qui} a accepté votre réponse`,
        paragraphes: [
          `Votre réponse est épinglée en tête de ${titreCible}, désormais résolu.${n.points ? ` Elle vous rapporte ${n.points} points.` : ''}`,
        ],
      };
    default:
      return { titre: 'Nouvelle notification', paragraphes: [] };
  }
}

export function emailNotification(
  a: string,
  notification: NotificationApi,
  siteUrl: string,
): EmailAEnvoyer {
  const { titre, paragraphes } = contenuDe(notification);
  const url = new URL(`/notifications?notification=${notification.id}`, siteUrl).href;
  return {
    a,
    sujet: titre,
    ...miseEnForme({
      titre,
      paragraphes: [
        ...paragraphes,
        'Vous recevez cet e-mail selon vos préférences de notification, modifiables dans vos paramètres.',
      ],
      action: { libelle: 'Voir la notification', url },
    }),
  };
}
