import { NIVEAUX, slugifier } from '@vysora/shared';
import { sql } from 'drizzle-orm';
import type { BaseDeDonnees } from '../client.js';
import {
  badge,
  categorie,
  documentLegal,
  editeur,
  etiquette,
  licence,
  modele,
  niveau,
  outil,
  outilModele,
  typeVote,
} from '../schema/index.js';
import {
  BADGES,
  CATEGORIES,
  DOCUMENTS_LEGAUX,
  ETIQUETTES,
  LICENCES,
  MODELES,
  OUTILS,
  TYPES_VOTE,
} from './donnees-referentiels.js';

/** Valeur proposée par l'insertion, pour une mise à jour en cas de conflit. */
const propose = (colonne: string) => sql.raw(`excluded.${colonne}`);

/* Charge les référentiels. Idempotent : un élément absent est ajouté d'après sa clé naturelle ;
   un élément existant garde les valeurs réglées par l'administration (seuils, libellés, textes,
   icônes des catégories). Seuls les attributs de présentation repris du prototype (logos, familles
   des outils, icônes des badges) sont remis à jour. */
export async function semer(db: BaseDeDonnees): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(niveau)
      .values(NIVEAUX.map((n) => ({ ...n })))
      .onConflictDoNothing({ target: niveau.rang });

    await tx
      .insert(typeVote)
      .values([...TYPES_VOTE])
      .onConflictDoNothing({ target: typeVote.code });

    await tx
      .insert(licence)
      .values(LICENCES.map((l, ordre) => ({ ...l, ordreAffichage: ordre })))
      .onConflictDoNothing({ target: licence.code });

    await tx
      .insert(categorie)
      .values(
        CATEGORIES.map((c, ordre) => ({ ...c, slug: slugifier(c.libelle), ordreAffichage: ordre })),
      )
      .onConflictDoUpdate({
        // L'adresse ne change jamais ; le libellé, si l'administration le modifie (ADM-02).
        target: categorie.slug,
        // La présentation d'un domaine (DEC-01) n'est remplie que si l'administration ne l'a pas écrite.
        set: {
          icone: sql`coalesce(${categorie.icone}, ${propose('icone')})`,
          description: sql`coalesce(${categorie.description}, ${propose('description')})`,
        },
      });

    const nomsEditeurs = [
      ...new Set([...OUTILS.map((o) => o.editeur), ...MODELES.map((m) => m.editeur)]),
    ];
    // Un éditeur est repéré par sa clé : le nom que l'administration lui a donné reste (ADM-02).
    const editeurs = await tx
      .insert(editeur)
      .values(nomsEditeurs.map((nom) => ({ nom, slug: slugifier(nom) })))
      .onConflictDoUpdate({ target: editeur.slug, set: { slug: propose('slug') } })
      .returning({ id: editeur.id, slug: editeur.slug });
    const idEditeur = new Map(editeurs.map((e) => [e.slug, e.id]));
    const editeurDe = (nom: string) => {
      const id = idEditeur.get(slugifier(nom));
      if (!id) throw new Error(`Éditeur inconnu : ${nom}`);
      return id;
    };

    const modeles = await tx
      .insert(modele)
      .values(
        MODELES.map((m) => ({ editeurId: editeurDe(m.editeur), nom: m.nom, nomCourt: m.nomCourt })),
      )
      .onConflictDoUpdate({
        target: [modele.editeurId, modele.nom],
        set: { nomCourt: propose('nom_court') },
      })
      .returning({ id: modele.id, nom: modele.nom });
    const idModele = new Map(modeles.map((m) => [m.nom, m.id]));

    const outils = await tx
      .insert(outil)
      .values(
        OUTILS.map((o) => ({
          editeurId: editeurDe(o.editeur),
          nom: o.nom,
          slug: slugifier(o.nom),
          type: o.type,
          famille: o.famille,
          logo: o.logo,
          logoMonochrome: o.monochrome ?? false,
          alias: o.alias ?? [],
          estAgent: o.agent ?? false,
        })),
      )
      .onConflictDoUpdate({
        target: outil.nom,
        set: {
          famille: propose('famille'),
          logo: propose('logo'),
          logoMonochrome: propose('logo_monochrome'),
          alias: propose('alias'),
          estAgent: propose('est_agent'),
        },
      })
      .returning({ id: outil.id, nom: outil.nom });
    const idOutil = new Map(outils.map((o) => [o.nom, o.id]));

    const propositions = OUTILS.flatMap((o) =>
      (o.modeles ?? []).map((nomModele, ordre) => {
        const modeleId = idModele.get(nomModele);
        const outilId = idOutil.get(o.nom);
        if (!modeleId || !outilId)
          throw new Error(`Modèle ou outil inconnu : ${o.nom} · ${nomModele}`);
        return { outilId, modeleId, ordre };
      }),
    );
    if (propositions.length)
      await tx.insert(outilModele).values(propositions).onConflictDoNothing();

    await tx
      .insert(badge)
      .values(BADGES.map((b) => ({ ...b, description: b.critere })))
      .onConflictDoUpdate({
        target: badge.code,
        set: { icone: propose('icone'), ton: propose('ton') },
      });

    await tx
      .insert(documentLegal)
      .values(DOCUMENTS_LEGAUX)
      .onConflictDoNothing({ target: [documentLegal.type, documentLegal.version] });

    await tx
      .insert(etiquette)
      .values(ETIQUETTES.map((libelle) => ({ libelle, slug: slugifier(libelle) })))
      .onConflictDoNothing({ target: etiquette.slug });
  });
}
