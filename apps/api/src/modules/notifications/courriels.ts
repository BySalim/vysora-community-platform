import type { NotificationApi } from '@vysora/shared';
import type { EmailAEnvoyer } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';

/* E-mails qui accompagnent une notification (WF-25), selon les préférences du membre (F-81,
   PARAM-01) : mêmes phrases que la page Notifications (apps/web/src/lib/notifications.ts). Le lien
   ouvre la notification sur la page Notifications. Une mesure de la modération a son propre e-mail,
   plus complet et toujours envoyé (moderation/courriels.ts, RG-90). */

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

const pluriel = (n: number, un: string, plusieurs: string) =>
  `${new Intl.NumberFormat('fr-FR').format(n)} ${n > 1 ? plusieurs : un}`;

const points = (n: NotificationApi, phrase: (p: string) => string): string[] =>
  n.points ? [phrase(pluriel(n.points, 'point', 'points'))] : [];

function contenuDe(n: NotificationApi): { titre: string; paragraphes: string[] } {
  const qui = n.par?.nom ?? 'Un membre';
  const titreCible = n.cible ? `« ${n.cible.titre} »` : 'votre contenu';
  const texte = extrait(n.texte);
  switch (n.type) {
    case 'COMMENTAIRE_RECU':
      return {
        titre: `${qui} a commenté votre création`,
        paragraphes: [`Nouveau commentaire sur ${titreCible}.`, texte ?? ''].filter(Boolean),
      };
    case 'REPONSE_COMMENTAIRE':
      return {
        titre: `${qui} a répondu à votre commentaire`,
        paragraphes: [`Nouvelle réponse dans ${titreCible}.`, texte ?? ''].filter(Boolean),
      };
    case 'REPONSE_SUJET': {
      const mot = MOTS_SUJET[n.cible?.typeSujet ?? ''] ?? 'sujet';
      return {
        titre: `${qui} a répondu à votre ${mot}`,
        paragraphes: [`Nouvelle réponse dans ${titreCible}.`, texte ?? ''].filter(Boolean),
      };
    }
    case 'REPONSE_ACCEPTEE':
      return {
        titre: `${qui} a accepté votre réponse`,
        paragraphes: [
          `Votre réponse est épinglée en tête de ${titreCible}, désormais résolu.${n.points ? ` Elle vous rapporte ${pluriel(n.points, 'point', 'points')}.` : ''}`,
        ],
      };
    case 'REPRODUCTION_RECUE':
      return {
        titre: `${qui} a essayé votre création`,
        paragraphes: [
          `Nouvel essai de ${titreCible}.`,
          ...points(n, (p) => `Cet essai réussi vous rapporte ${p}.`),
          texte ?? '',
        ].filter(Boolean),
      };
    case 'VARIANTE_PUBLIEE':
      return {
        titre: `${qui} a publié une variante de votre création`,
        paragraphes: [
          `${n.variante ? `« ${n.variante.titre} » reprend` : 'Cette variante reprend'} ${titreCible}.`,
        ],
      };
    case 'VOTES_UTILE_RECUS':
      return {
        titre: `${pluriel(n.nombre, 'membre a', 'membres ont')} voté « Utile »`,
        paragraphes: [
          `${pluriel(n.nombre, 'membre a trouvé', 'membres ont trouvé')} ${n.surReponse ? 'votre réponse dans' : ''} ${titreCible} utile.`.replace(
            /\s+/g,
            ' ',
          ),
          ...points(n, (p) => `Ces votes vous rapportent ${p}.`),
        ],
      };
    case 'OBSOLESCENCE_SIGNALEE':
      return {
        titre: `Votre création est signalée comme ne fonctionnant plus avec ${n.obsolescence?.modele ?? 'un modèle'}`,
        paragraphes: [
          `${n.obsolescence ? pluriel(n.obsolescence.membres, 'membre signale', 'membres signalent') : 'Des membres signalent'} que ${titreCible} ne donne plus le résultat annoncé. Vérifiez-la et mettez-la à jour si besoin.`,
        ],
      };
    case 'BADGE_OBTENU':
      return {
        titre: `Vous avez obtenu le badge « ${n.badge?.libelle ?? ''} »`,
        paragraphes: n.badge?.critere ? [n.badge.critere] : [],
      };
    case 'NIVEAU_ATTEINT':
      return {
        titre: `Vous avez atteint le niveau ${n.niveau?.libelle ?? ''}`,
        paragraphes: ['Votre réputation vous fait passer un palier sur Vysora.'],
      };
    case 'CAS_VALIDE':
      return {
        titre: 'Votre cas Bon réflexe a été validé',
        paragraphes: [
          `${titreCible} est désormais proposé aux membres.`,
          ...points(n, (p) => `Il vous rapporte ${p}.`),
        ],
      };
    case 'CAS_REFUSE':
      return {
        titre: 'Votre cas Bon réflexe n’a pas été validé',
        paragraphes: [
          `${titreCible} n’a pas été validé par la modération.`,
          n.motif ? `Motif : ${n.motif}` : '',
          'Vous pouvez le corriger : il sera examiné de nouveau.',
        ].filter(Boolean),
      };
    case 'RESULTAT_DEFI':
      return {
        titre: `Vous terminez ${n.defi?.rang ?? ''}${n.defi?.rang === 1 ? 're' : 'e'} du défi`,
        paragraphes: [
          `Le défi ${titreCible} est clos${n.defi ? ` : ${pluriel(n.defi.participants, 'participant', 'participants')}` : ''}.`,
          ...points(n, (p) => `Votre classement vous rapporte ${p}.`),
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
