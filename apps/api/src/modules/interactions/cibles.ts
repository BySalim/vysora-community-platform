import type { TypeContenu, TypeSujet } from '@vysora/shared';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { casBonReflexe, contenu, creation, message, sujet } from '../../db/schema/index.js';

/** Contenu visé par une interaction (vote, enregistrement), avec ce qui décide de sa visibilité. */
export interface Cible {
  id: number;
  type: TypeContenu;
  auteurId: number;
  /** RG-30 : visible de tous (publié, validé, non masqué, sujet parent visible). */
  public: boolean;
  typeSujet: TypeSujet | null;
}

/** Le contenu et sa visibilité publique, ou null s'il n'existe pas. */
export async function lireCible(
  db: BaseDeDonnees | Transaction,
  id: number,
): Promise<Cible | null> {
  const parent = alias(contenu, 'parent');
  const [ligne] = await db
    .select({
      id: contenu.id,
      type: contenu.typeContenu,
      auteurId: contenu.auteurId,
      statut: contenu.statut,
      publication: creation.statutPublication,
      typeSujet: sujet.typeSujet,
      validation: casBonReflexe.statutValidation,
      statutSujetParent: parent.statut,
    })
    .from(contenu)
    .leftJoin(creation, eq(creation.id, contenu.id))
    .leftJoin(sujet, eq(sujet.id, contenu.id))
    .leftJoin(casBonReflexe, eq(casBonReflexe.id, contenu.id))
    .leftJoin(message, eq(message.id, contenu.id))
    .leftJoin(parent, eq(parent.id, message.sujetId))
    .where(eq(contenu.id, id));
  if (!ligne) return null;
  const visible =
    ligne.statut === 'VISIBLE' &&
    (ligne.type !== 'CREATION' || ligne.publication === 'PUBLIEE') &&
    (ligne.type !== 'CAS_BON_REFLEXE' || ligne.validation === 'VALIDE') &&
    (ligne.type !== 'MESSAGE' || ligne.statutSujetParent === 'VISIBLE');
  return {
    id: ligne.id,
    type: ligne.type,
    auteurId: ligne.auteurId,
    public: visible,
    typeSujet: ligne.typeSujet,
  };
}
