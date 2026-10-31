import type {
  ActionDecisionAdministrateur,
  ActionDecisionModerateur,
  TypeContenu,
} from '@vysora/shared';
import type { EmailAEnvoyer } from '../email/email.service.js';
import { miseEnForme } from '../email/gabarit.js';

/* F-92 : e-mail à l'auteur d'un contenu visé par une décision (WF-25 : toujours envoyé, quelles que
   soient les préférences). Il donne la mesure et sa durée, le motif, la référence de la décision et
   la façon de la contester (conditions d'utilisation, articles 6 et 7). Une décision « aucune » ne
   change rien pour l'auteur : rien n'est envoyé. Les décisions des administrateurs (bannir, ajuster
   la réputation, retirer un badge) visent un membre et lui sont écrites de la même façon. */

/** Espaces insécables de la typographie française (comme `typo` du site). */
const typo = (texte: string): string =>
  texte
    .replace(/ ([:»])/g, ' $1')
    .replace(/ ([;!?])/g, ' $1')
    .replace(/« /g, '« ');

const DESIGNATIONS: Record<TypeContenu, { nom: string; feminin: boolean }> = {
  CREATION: { nom: 'création', feminin: true },
  COMMENTAIRE: { nom: 'commentaire', feminin: false },
  REPRODUCTION: { nom: 'essai', feminin: false },
  SUJET: { nom: 'sujet', feminin: false },
  MESSAGE: { nom: 'réponse', feminin: true },
  CAS_BON_REFLEXE: { nom: 'cas Bon réflexe', feminin: false },
};

/** Référence d'une décision, à rappeler dans une contestation (« Décision n° 12 »). */
export const referenceDecision = (id: number): string => `Décision n° ${id}`;

const CONTESTATION =
  'Cette décision a été prise par l’équipe de modération, sans outil automatisé. Vous pouvez la contester dans les 6 mois depuis le formulaire de contact de Vysora (« Contester une décision »), en indiquant sa référence.';

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export interface DecisionACommuniquer {
  a: string;
  id: number;
  action: Exclude<ActionDecisionModerateur, 'AUCUNE'>;
  motif: string;
  finSuspension: Date | null;
  /** Fuseau horaire du membre, pour la date de fin d'une suspension. */
  fuseau: string;
  contenu: { type: TypeContenu; intitule: string };
  /** Fiche de la création et son éditeur, sur le site ; null pour un autre contenu. */
  creation: { fiche: string; modifier: string } | null;
  /** Formulaire de contact, motif « Contester une décision », référence remplie. */
  contestation: string;
}

export function emailDecision(d: DecisionACommuniquer): EmailAEnvoyer {
  const { nom, feminin } = DESIGNATIONS[d.contenu.type];
  const e = feminin ? 'e' : '';
  const cite = `« ${d.contenu.intitule} »`;
  const fin = d.finSuspension
    ? {
        jour: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: d.fuseau })
          .format(d.finSuspension)
          .replace(/^1 /, '1er '),
        heure: new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short', timeZone: d.fuseau })
          .format(d.finSuspension)
          .replace(':', ' h '),
      }
    : null;

  const [titre, presentation]: [string, string[]] = (() => {
    switch (d.action) {
      case 'MASQUER':
        return [
          `Votre ${nom} a été masqué${e} par la modération`,
          [
            `${cite} n’est plus visible des autres membres. ${feminin ? 'Elle' : 'Il'} reste visible de vous et de la modération ; les points de réputation liés sont suspendus.`,
            ...(d.creation ? ['Modifiez-la : la modération l’examinera de nouveau.'] : []),
          ],
        ];
      case 'RETABLIR':
        return [
          `Votre ${nom} est de nouveau visible`,
          [`${cite} est de nouveau visible de tous. Les points de réputation liés sont rétablis.`],
        ];
      case 'SUPPRIMER':
        return [
          `Votre ${nom} a été supprimé${e} par la modération`,
          [`${cite} ne figure plus sur Vysora. Les points de réputation liés sont annulés.`],
        ];
      case 'AVERTIR':
        return [
          'La modération vous adresse un avertissement',
          [
            `Cet avertissement concerne votre ${nom} ${cite}. Un nouvel écart peut entraîner la suspension de votre compte.`,
          ],
        ];
      case 'SUSPENDRE':
        return [
          `Votre compte est suspendu jusqu’au ${fin?.jour ?? ''}`,
          [
            `Cette suspension fait suite à votre ${nom} ${cite}. Vous pouvez lire les contenus et gérer vos paramètres. Publier, voter, commenter et répondre redeviendront possibles le ${fin?.jour ?? ''} à ${fin?.heure ?? ''}.`,
          ],
        ];
      case 'AJOUTER_AVERTISSEMENT_AGENT':
        return [
          'Un avertissement a été ajouté à votre création',
          [
            `La modération a ajouté l’avertissement « instructions pour agent » à ${cite} : les lecteurs sont invités à relire le prompt avant de le confier à un outil qui peut agir sur leurs fichiers, leurs commandes ou leurs services. Seule la modération peut le retirer.`,
          ],
        ];
      case 'RETIRER_AVERTISSEMENT_AGENT':
        return [
          'L’avertissement de votre création a été retiré',
          [`La modération a retiré l’avertissement « instructions pour agent » de ${cite}.`],
        ];
    }
  })();

  // Le bouton mène à ce que l'auteur peut faire : corriger sa création masquée, la revoir, ou
  // contester une mesure qui le prive de son contenu ou le sanctionne.
  const contester = { libelle: 'Contester la décision', url: d.contestation };
  const action =
    d.action === 'SUPPRIMER' || d.action === 'AVERTIR' || d.action === 'SUSPENDRE'
      ? contester
      : !d.creation
        ? d.action === 'RETABLIR'
          ? undefined
          : contester
        : d.action === 'MASQUER'
          ? { libelle: 'Modifier la création', url: d.creation.modifier }
          : { libelle: 'Voir la création', url: d.creation.fiche };

  return {
    a: d.a,
    sujet: typo(titre),
    ...miseEnForme({
      titre: typo(titre),
      paragraphes: [...presentation, CONTESTATION].map(typo),
      details: [
        ['Motif', d.motif],
        ...(fin
          ? [['Fin de la suspension', typo(`${fin.jour} à ${fin.heure}`)] as [string, string]]
          : []),
        ['Référence', referenceDecision(d.id)],
      ],
      action,
    }),
  };
}

export interface DecisionSurMembre {
  a: string;
  id: number;
  action: ActionDecisionAdministrateur;
  motif: string;
  /** Ajustement de la réputation : points ajoutés (positifs) ou retirés (négatifs). */
  points: number | null;
  /** Retrait de badge : son nom. */
  badge: string | null;
  contestation: string;
}

/** F-92, RG-102 : décision d'un administrateur qui vise le membre lui-même. */
export function emailDecisionMembre(d: DecisionSurMembre): EmailAEnvoyer {
  const points = d.points ?? 0;
  const unite = Math.abs(points) > 1 ? 'points' : 'point';
  const [titre, presentation]: [string, string] = (() => {
    switch (d.action) {
      case 'BANNIR':
        return [
          'Votre compte Vysora est fermé',
          'L’équipe de modération a fermé votre compte : vous ne pouvez plus vous connecter à Vysora.',
        ];
      case 'AJUSTER_REPUTATION':
        return [
          'Votre réputation a été corrigée',
          points > 0
            ? `L’équipe de modération a ajouté ${nombre(points)} ${unite} à votre réputation.`
            : `L’équipe de modération a retiré ${nombre(-points)} ${unite} de votre réputation.`,
        ];
      case 'RETIRER_BADGE':
        return [
          `Le badge « ${d.badge ?? ''} » vous a été retiré`,
          `L’équipe de modération a retiré le badge « ${d.badge ?? ''} » de votre profil. Il ne vous sera plus attribué.`,
        ];
    }
  })();
  // Des points ajoutés ne se contestent pas : rien de plus à proposer.
  const action =
    d.action === 'AJUSTER_REPUTATION' && points > 0
      ? undefined
      : { libelle: 'Contester la décision', url: d.contestation };
  return {
    a: d.a,
    sujet: typo(titre),
    ...miseEnForme({
      titre: typo(titre),
      paragraphes: [presentation, CONTESTATION].map(typo),
      details: [
        ['Motif', d.motif],
        ...(d.action === 'AJUSTER_REPUTATION'
          ? [['Points', `${points > 0 ? '+' : '−'}${nombre(Math.abs(points))}`] as [string, string]]
          : []),
        ['Référence', referenceDecision(d.id)],
      ],
      action,
    }),
  };
}
