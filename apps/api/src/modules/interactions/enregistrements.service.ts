import { Inject, Injectable } from '@nestjs/common';
import type {
  EnregistrementListeApi,
  MembreResumeApi,
  MesEnregistrementsApi,
} from '@vysora/shared';
import { and, count, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  casBonReflexe,
  categorie,
  contenu,
  creation,
  enregistrement,
  message,
  modele,
  outil,
  sujet,
} from '../../db/schema/index.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

/* S-01 : liste « Enregistrés » du membre (F-34, RG-45), présentée par « Mes contenus » (CREA-04).
   Seuls les contenus visibles de tous y figurent (RG-30) : une création dépubliée ou masquée, un cas
   retiré disparaissent de la liste et y reviennent s'ils redeviennent visibles. */
@Injectable()
export class EnregistrementsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  async lister(membreId: number): Promise<MesEnregistrementsApi> {
    const lignes = await this.db
      .select({
        id: contenu.id,
        genre: contenu.typeContenu,
        auteurId: contenu.auteurId,
        date: enregistrement.dateEnregistrement,
        creation: {
          titre: creation.titre,
          slug: creation.slug,
          type: creation.typeCreation,
        },
        categorie: { libelle: categorie.libelle, slug: categorie.slug },
        sujet: {
          titre: sujet.titre,
          slug: sujet.slug,
          typeSujet: sujet.typeSujet,
          messageAccepteId: sujet.messageAccepteId,
          dateFermeture: sujet.dateFermeture,
          outilId: sujet.outilId,
        },
        cas: {
          titre: casBonReflexe.titre,
          slug: casBonReflexe.slug,
          difficulte: casBonReflexe.difficulte,
        },
      })
      .from(enregistrement)
      .innerJoin(contenu, eq(contenu.id, enregistrement.contenuId))
      .leftJoin(creation, eq(creation.id, contenu.id))
      .leftJoin(categorie, eq(categorie.id, creation.categorieId))
      .leftJoin(sujet, eq(sujet.id, contenu.id))
      .leftJoin(casBonReflexe, eq(casBonReflexe.id, contenu.id))
      .where(
        and(
          eq(enregistrement.utilisateurId, membreId),
          eq(contenu.statut, 'VISIBLE'),
          // RG-30 : comme lireCible, une création publiée, un cas validé.
          or(isNull(creation.id), eq(creation.statutPublication, 'PUBLIEE')),
          or(isNull(casBonReflexe.id), eq(casBonReflexe.statutValidation, 'VALIDE')),
          ne(contenu.typeContenu, 'MESSAGE'),
        ),
      )
      .orderBy(desc(enregistrement.dateEnregistrement), desc(enregistrement.contenuId));
    if (!lignes.length) return { elements: [] };

    const idsSujets = lignes.filter((l) => l.sujet).map((l) => l.id);
    const [apercus, membres, reponses, outilsSujets] = await Promise.all([
      apercusDesCreations(
        this.db,
        this.stockage,
        lignes.flatMap((l) => (l.creation ? [{ id: l.id, type: l.creation.type }] : [])),
      ),
      resumerMembres(
        this.db,
        this.stockage,
        lignes.map((l) => l.auteurId),
      ),
      idsSujets.length
        ? this.db
            .select({ id: message.sujetId, n: count() })
            .from(message)
            .innerJoin(contenu, eq(contenu.id, message.id))
            .where(and(inArray(message.sujetId, idsSujets), eq(contenu.statut, 'VISIBLE')))
            .groupBy(message.sujetId)
        : [],
      idsSujets.length
        ? this.db
            .select({
              id: sujet.id,
              outil: {
                id: outil.id,
                nom: outil.nom,
                slug: outil.slug,
                logo: outil.logo,
                logoMonochrome: outil.logoMonochrome,
              },
              modele: modele.nomCourt,
              modeleNonReference: sujet.modeleNonReference,
            })
            .from(sujet)
            .innerJoin(outil, eq(outil.id, sujet.outilId))
            .leftJoin(modele, eq(modele.id, sujet.modeleId))
            .where(inArray(sujet.id, idsSujets))
        : [],
    ]);

    const auteur = (id: number): MembreResumeApi => {
      const resume = membres.get(id);
      if (!resume) throw new Error(`Membre introuvable : ${id}`);
      return resume;
    };
    const elements = lignes.flatMap((l): EnregistrementListeApi[] => {
      const commun = { id: l.id, date: l.date.toISOString(), auteur: auteur(l.auteurId) };
      if (l.creation) {
        const apercu = apercus.get(l.id);
        return [
          {
            ...commun,
            genre: 'CREATION',
            titre: l.creation.titre ?? '',
            slug: l.creation.slug ?? '',
            type: l.creation.type,
            categorie: l.categorie,
            couverture: apercu?.couverture ?? null,
            resultat: apercu?.resultat ?? null,
            outils: apercu?.outils ?? [],
          },
        ];
      }
      if (l.sujet) {
        const configuration = outilsSujets.find((o) => o.id === l.id);
        return [
          {
            ...commun,
            genre: 'SUJET',
            titre: l.sujet.titre,
            slug: l.sujet.slug,
            typeSujet: l.sujet.typeSujet,
            reponses: reponses.find((r) => r.id === l.id)?.n ?? 0,
            // RG-65 avant RG-63 : un sujet fermé l'est, même avec une réponse acceptée.
            etat: l.sujet.dateFermeture ? 'FERME' : l.sujet.messageAccepteId ? 'RESOLU' : 'OUVERT',
            outil: configuration?.outil ?? null,
            modele: configuration
              ? (configuration.modele ?? configuration.modeleNonReference)
              : null,
          },
        ];
      }
      if (l.cas)
        return [
          {
            ...commun,
            genre: 'CAS',
            titre: l.cas.titre,
            slug: l.cas.slug,
            difficulte: l.cas.difficulte,
          },
        ];
      return [];
    });
    return { elements };
  }
}
