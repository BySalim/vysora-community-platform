import {
  dansLeDelai,
  limiteQuotidienne,
  type EtatVisiteur,
  type TypeContenu,
} from '@vysora/shared';
import { and, asc, eq, gt, inArray } from 'drizzle-orm';
import { ErreurApplication } from '../../commun/erreurs.js';
import type { Transaction } from '../../db/client.js';
import { contenu, utilisateur } from '../../db/schema/index.js';

const JOUR_MS = 24 * 60 * 60_000;

/** Contenus que chaque limite de RG-85 compte (les créations ont la leur : limitePublication). */
const COMPTES: Record<
  'sujets' | 'reponses',
  { types: TypeContenu[]; message: (n: number) => string }
> = {
  sujets: {
    types: ['SUJET'],
    message: (n) =>
      `Vous avez publié ${n} sujets en 24 heures, la limite de votre niveau. Vous pourrez en publier un autre`,
  },
  reponses: {
    types: ['MESSAGE', 'COMMENTAIRE'],
    message: (n) =>
      `Vous avez publié ${n} réponses et commentaires en 24 heures, la limite de votre niveau. Vous pourrez de nouveau répondre`,
  },
};

/** RG-85 : sujets, ou réponses du forum et commentaires, publiés sur 24 heures glissantes selon le
    niveau ; sans limite pour la modération et l'administration. Un contenu retiré depuis compte
    encore : publier puis supprimer ne contourne pas la limite. Refus avec le délai avant qu'une
    place se libère. */
export async function verifierLimiteQuotidienne(
  tx: Transaction,
  membre: { id: number; etat: EtatVisiteur },
  genre: 'sujets' | 'reponses',
  maintenant: Date,
): Promise<void> {
  const limite = limiteQuotidienne(genre, membre.etat);
  if (!Number.isFinite(limite)) return;
  // Les publications d'un même membre se comptent l'une après l'autre (limite exacte).
  await tx
    .select({ id: utilisateur.id })
    .from(utilisateur)
    .where(eq(utilisateur.id, membre.id))
    .for('update');
  const { types, message } = COMPTES[genre];
  const publies = await tx
    .select({ date: contenu.dateCreation })
    .from(contenu)
    .where(
      and(
        eq(contenu.auteurId, membre.id),
        inArray(contenu.typeContenu, types),
        gt(contenu.dateCreation, new Date(maintenant.getTime() - JOUR_MS)),
      ),
    )
    .orderBy(asc(contenu.dateCreation));
  if (publies.length < limite) return;
  // Une place se libère quand la plus ancienne des publications en trop sort des 24 heures.
  const liberatrice = publies[publies.length - limite]?.date ?? maintenant;
  const reessayerDans = Math.max(
    1,
    Math.ceil((liberatrice.getTime() + JOUR_MS - maintenant.getTime()) / 1000),
  );
  throw new ErreurApplication(
    'LIMITE_ATTEINTE',
    `${message(limite)} ${dansLeDelai(reessayerDans)}.`,
    undefined,
    { reessayerDans },
  );
}
