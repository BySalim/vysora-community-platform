import type { ContenuModereApi, PageDuContenuApi, TypeContenu } from '@vysora/shared';
import { eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import {
  casBonReflexe,
  commentaire,
  contenu,
  creation,
  message,
  reproduction,
  sujet,
} from '../../db/schema/index.js';
import type { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

const LONGUEUR_INTITULE = 140;

const extrait = (texte: string | null): string => {
  const valeur = (texte ?? '').replace(/\s+/g, ' ').trim();
  return valeur.length > LONGUEUR_INTITULE
    ? `${valeur.slice(0, LONGUEUR_INTITULE - 1).trimEnd()}…`
    : valeur;
};

/** Intitulé générique d'un contenu sans texte (brouillon sans titre, essai réussi sans retour). */
const SANS_TITRE: Record<TypeContenu, string> = {
  CREATION: 'Création sans titre',
  COMMENTAIRE: 'Commentaire',
  REPRODUCTION: 'Essai sans retour écrit',
  SUJET: 'Sujet',
  MESSAGE: 'Réponse',
  CAS_BON_REFLEXE: 'Cas Bon réflexe',
};

/** Contenus tels que la modération les présente : intitulé, page où ils se lisent, auteur. */
export async function presenterContenus(
  db: BaseDeDonnees,
  stockage: Stockage,
  ids: number[],
): Promise<Map<number, ContenuModereApi>> {
  if (!ids.length) return new Map();
  const parente = alias(creation, 'creation_parente');
  const sujetParent = alias(sujet, 'sujet_parent');
  const lignes = await db
    .select({
      id: contenu.id,
      type: contenu.typeContenu,
      statut: contenu.statut,
      auteurId: contenu.auteurId,
      dateCreation: contenu.dateCreation,
      dateModification: contenu.dateModification,
      creation: { titre: creation.titre, slug: creation.slug },
      sujet: { titre: sujet.titre, slug: sujet.slug },
      cas: { titre: casBonReflexe.titre, slug: casBonReflexe.slug },
      commentaire: { corps: commentaire.corps },
      reproduction: { retour: reproduction.retour },
      message: { corps: message.corps },
      parente: { id: parente.id, slug: parente.slug },
      sujetParent: { id: sujetParent.id, slug: sujetParent.slug },
    })
    .from(contenu)
    .leftJoin(creation, eq(creation.id, contenu.id))
    .leftJoin(sujet, eq(sujet.id, contenu.id))
    .leftJoin(casBonReflexe, eq(casBonReflexe.id, contenu.id))
    .leftJoin(commentaire, eq(commentaire.id, contenu.id))
    .leftJoin(reproduction, eq(reproduction.id, contenu.id))
    .leftJoin(message, eq(message.id, contenu.id))
    .leftJoin(
      parente,
      or(eq(parente.id, commentaire.creationId), eq(parente.id, reproduction.creationId)),
    )
    .leftJoin(sujetParent, eq(sujetParent.id, message.sujetId))
    .where(inArray(contenu.id, ids));
  const auteurs = await resumerMembres(
    db,
    stockage,
    lignes.map((l) => l.auteurId),
  );

  return new Map(
    lignes.map((l) => {
      const intitule =
        l.type === 'CREATION'
          ? l.creation?.titre
          : l.type === 'SUJET'
            ? l.sujet?.titre
            : l.type === 'CAS_BON_REFLEXE'
              ? l.cas?.titre
              : extrait(
                  l.type === 'COMMENTAIRE'
                    ? (l.commentaire?.corps ?? null)
                    : l.type === 'MESSAGE'
                      ? (l.message?.corps ?? null)
                      : (l.reproduction?.retour ?? null),
                );
      const page: PageDuContenuApi | null =
        l.type === 'CREATION'
          ? { genre: 'CREATION', id: l.id, slug: l.creation?.slug ?? null, ancre: null }
          : l.type === 'SUJET'
            ? { genre: 'SUJET', id: l.id, slug: l.sujet?.slug ?? null, ancre: null }
            : l.type === 'CAS_BON_REFLEXE'
              ? { genre: 'CAS', id: l.id, slug: l.cas?.slug ?? null, ancre: null }
              : l.type === 'MESSAGE'
                ? l.sujetParent && {
                    genre: 'SUJET',
                    id: l.sujetParent.id,
                    slug: l.sujetParent.slug,
                    ancre: `reponse-${l.id}`,
                  }
                : l.parente && {
                    genre: 'CREATION',
                    id: l.parente.id,
                    slug: l.parente.slug,
                    ancre: l.type === 'COMMENTAIRE' ? `commentaire-${l.id}` : 'reproductions',
                  };
      const auteur = auteurs.get(l.auteurId);
      if (!auteur) throw new Error(`Membre introuvable : ${l.auteurId}`);
      return [
        l.id,
        {
          id: l.id,
          type: l.type,
          statut: l.statut,
          intitule: intitule || SANS_TITRE[l.type],
          page,
          auteur,
          dateCreation: l.dateCreation.toISOString(),
          dateModification: l.dateModification?.toISOString() ?? null,
        },
      ];
    }),
  );
}

/** RG-19, RG-82 : un contenu et ceux qui n'existent que par lui (commentaires et reproductions d'une
    création, réponses d'un sujet), dont les points de réputation suivent le sort. */
export async function contenusLies(
  tx: Transaction,
  id: number,
  type: TypeContenu,
): Promise<number[]> {
  if (type === 'CREATION') {
    const [commentaires, reproductions] = [
      await tx
        .select({ id: commentaire.id })
        .from(commentaire)
        .where(eq(commentaire.creationId, id)),
      await tx
        .select({ id: reproduction.id })
        .from(reproduction)
        .where(eq(reproduction.creationId, id)),
    ];
    return [id, ...commentaires.map((c) => c.id), ...reproductions.map((r) => r.id)];
  }
  if (type === 'SUJET') {
    const reponses = await tx
      .select({ id: message.id })
      .from(message)
      .where(eq(message.sujetId, id));
    return [id, ...reponses.map((r) => r.id)];
  }
  return [id];
}
