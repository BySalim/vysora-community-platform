import { limiteQuotidienne, type EtatVisiteur } from '@vysora/shared';
import { and, asc, eq, gt, ne } from 'drizzle-orm';
import type { Executeur } from '../../db/client.js';
import { contenu, creation } from '../../db/schema/index.js';

const JOUR_MS = 24 * 60 * 60_000;

/** Où en est un membre de sa limite de publications (RG-85). */
export interface EtatLimitePublication {
  limite: number;
  /** Créations publiées sur les 24 dernières heures. */
  utilisees: number;
  /** Secondes avant qu'une place se libère ; null si une publication est possible. */
  reessayerDans: number | null;
}

/** RG-85 : créations publiées sur 24 heures glissantes, selon le niveau ; null sans limite (modération,
    administration). Une création publiée, dépubliée puis republiée compte une fois : `sauf` l'écarte. */
export async function limitePublication(
  db: Executeur,
  auteur: { id: number; etat: EtatVisiteur },
  maintenant: Date,
  sauf?: number,
): Promise<EtatLimitePublication | null> {
  const limite = limiteQuotidienne('creations', auteur.etat);
  if (!Number.isFinite(limite)) return null;
  const publiees = await db
    .select({ date: creation.datePublication })
    .from(creation)
    .innerJoin(contenu, eq(contenu.id, creation.id))
    .where(
      and(
        eq(contenu.auteurId, auteur.id),
        gt(creation.datePublication, new Date(maintenant.getTime() - JOUR_MS)),
        sauf === undefined ? undefined : ne(creation.id, sauf),
      ),
    )
    .orderBy(asc(creation.datePublication));
  if (publiees.length < limite) return { limite, utilisees: publiees.length, reessayerDans: null };
  // Une place se libère quand la plus ancienne des publications en trop sort des 24 heures.
  const liberatrice = publiees[publiees.length - limite]?.date ?? maintenant;
  return {
    limite,
    utilisees: publiees.length,
    reessayerDans: Math.max(
      1,
      Math.ceil((liberatrice.getTime() + JOUR_MS - maintenant.getTime()) / 1000),
    ),
  };
}
