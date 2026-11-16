import {
  imageDeProfil,
  niveauPourReputation,
  type CodeNiveau,
  type MembreResumeApi,
} from '@vysora/shared';
import { inArray, sql } from 'drizzle-orm';
import type { BaseDeDonnees } from '../../db/client.js';
import { mouvementReputation, niveau, utilisateur } from '../../db/schema/index.js';
import type { Stockage } from '../medias/stockage.js';

/** Membres tels que les pages les présentent à côté d'un contenu : nom affiché (à défaut le pseudo),
    image de profil (RG-07 : la photo, à défaut l'avatar choisi), niveau et réputation (RG-83, RG-84). */
export async function resumerMembres(
  db: BaseDeDonnees,
  stockage: Stockage,
  ids: Iterable<number>,
): Promise<Map<number, MembreResumeApi>> {
  const uniques = [...new Set(ids)];
  if (!uniques.length) return new Map();
  const [membres, reputations, niveaux] = await Promise.all([
    db
      .select({
        id: utilisateur.id,
        pseudo: utilisateur.pseudo,
        nomAffiche: utilisateur.nomAffiche,
        avatar: utilisateur.avatar,
        avatarChoisi: utilisateur.avatarChoisi,
      })
      .from(utilisateur)
      .where(inArray(utilisateur.id, uniques)),
    db
      .select({
        id: mouvementReputation.beneficiaireId,
        points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int`,
      })
      .from(mouvementReputation)
      .where(inArray(mouvementReputation.beneficiaireId, uniques))
      .groupBy(mouvementReputation.beneficiaireId),
    db.select().from(niveau),
  ]);
  const points = new Map(reputations.map((r) => [r.id, r.points]));
  const definitions = niveaux.map((n) => ({ ...n, code: n.code as CodeNiveau }));
  return new Map(
    membres.map((m) => {
      const reputation = Math.max(0, points.get(m.id) ?? 0);
      const atteint = niveauPourReputation(reputation, definitions);
      return [
        m.id,
        {
          id: m.id,
          pseudo: m.pseudo,
          nom: m.nomAffiche ?? m.pseudo,
          avatar: imageDeProfil(m.avatar ? stockage.adresse(m.avatar) : null, m.avatarChoisi),
          niveau: { code: atteint.code, libelle: atteint.libelle },
          reputation,
        },
      ];
    }),
  );
}
