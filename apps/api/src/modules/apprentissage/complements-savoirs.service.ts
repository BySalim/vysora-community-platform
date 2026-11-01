import { Inject, Injectable } from '@nestjs/common';
import {
  LIMITES,
  type ComplementsSavoirsApi,
  type IllustrationAdministreeApi,
  type MomentsCreationApi,
  type SaisieIllustrationSavoir,
  type SavoirsAdministresApi,
  type SujetSavoirAdministreApi,
} from '@vysora/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import { conflit, erreurValidation, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import {
  contenu,
  creation,
  etape,
  illustrationSavoir,
  momentCle,
  sujet,
  sujetSavoir,
} from '../../db/schema/index.js';
import { auditer } from '../administration/journal-audit.js';
import { apercusDesCreations } from '../creations/apercus.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';

const CREATION_INVISIBLE =
  'Seule une création publiée et visible de tous illustre un savoir : vérifiez son adresse.';
const SUJET_INVISIBLE = 'Seul un sujet visible de tous se lie à un savoir : vérifiez son adresse.';

/** RG-30 : une création publiée et visible. */
const creationVisible = sql<boolean>`${contenu.statut} = 'VISIBLE' and ${creation.statutPublication} = 'PUBLIEE'`;

/* Compléments des savoirs d'Apprendre (APP-03) : moments clés de la communauté qui illustrent un
   savoir (« Vu dans la communauté ») et sujet du forum lié (« Pour aller plus loin »), choisis par
   l'équipe. Les savoirs sont des contenus éditoriaux du site, désignés par leur identifiant ; seuls
   les contenus visibles de tous sont montrés (RG-30). Chaque changement est inscrit au journal
   d'audit (ENF-09). */
@Injectable()
export class ComplementsSavoirsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
  ) {}

  /** Ce que la page d'Apprendre montre : les illustrations et les sujets visibles de tous. */
  async publics(): Promise<ComplementsSavoirsApi> {
    const { illustrations, sujets } = await this.lire();
    const publics: ComplementsSavoirsApi = { illustrations: {}, sujets: {} };
    for (const [savoir, liste] of Object.entries(illustrations)) {
      const montrees = liste.filter((i) => i.etat === 'MONTREE').map(({ etat: _etat, ...i }) => i);
      if (montrees.length) publics.illustrations[savoir] = montrees;
    }
    for (const [savoir, { visible, ...s }] of Object.entries(sujets))
      if (visible) publics.sujets[savoir] = s;
    return publics;
  }

  /** Tout ce qui est lié aux savoirs, montré ou non, pour l'administration. */
  administres(): Promise<SavoirsAdministresApi> {
    return this.lire();
  }

  /** Moments clés d'une création publiée et visible, dans l'ordre du parcours (choix d'une
      illustration). */
  async momentsDe(creationId: number): Promise<MomentsCreationApi> {
    const [c] = await this.db
      .select({ id: creation.id, slug: creation.slug, titre: creation.titre })
      .from(creation)
      .innerJoin(contenu, eq(contenu.id, creation.id))
      .where(and(eq(creation.id, creationId), creationVisible));
    if (!c) throw introuvable(CREATION_INVISIBLE);
    const moments = await this.db
      .select({
        id: momentCle.id,
        type: momentCle.type,
        titre: momentCle.titre,
        texte: momentCle.explication,
      })
      .from(momentCle)
      .innerJoin(etape, eq(etape.id, momentCle.etapeId))
      .where(eq(etape.creationId, creationId))
      .orderBy(asc(etape.ordre), asc(momentCle.id));
    return {
      creation: { id: c.id, slug: c.slug ?? '', titre: c.titre ?? '' },
      moments: moments.map((m) => ({ ...m, texte: m.texte ?? '' })),
    };
  }

  /** Moment clé (ou création avec une note) ajouté aux illustrations d'un savoir, en dernier. */
  async ajouterIllustration(
    adminId: number,
    savoir: string,
    { creationId, momentId, note }: SaisieIllustrationSavoir,
  ): Promise<SavoirsAdministresApi> {
    await this.db.transaction(async (tx) => {
      // Verrou du savoir : deux ajouts simultanés prennent chacun leur rang.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`savoir:${savoir}`}))`);
      const [c] = await tx
        .select({ id: creation.id })
        .from(creation)
        .innerJoin(contenu, eq(contenu.id, creation.id))
        .where(and(eq(creation.id, creationId), creationVisible));
      if (!c) throw conflit(CREATION_INVISIBLE, { creationId: CREATION_INVISIBLE });
      if (momentId !== null) {
        const [m] = await tx
          .select({ id: momentCle.id })
          .from(momentCle)
          .innerJoin(etape, eq(etape.id, momentCle.etapeId))
          .where(and(eq(momentCle.id, momentId), eq(etape.creationId, creationId)));
        if (!m) throw erreurValidation({ momentId: 'Choisissez un moment clé de cette création.' });
      }
      const existantes = await tx
        .select({
          creationId: illustrationSavoir.creationId,
          momentId: illustrationSavoir.momentCleId,
        })
        .from(illustrationSavoir)
        .where(eq(illustrationSavoir.savoir, savoir));
      if (existantes.some((e) => e.creationId === creationId && e.momentId === momentId))
        throw conflit(
          momentId === null
            ? 'Cette création illustre déjà ce savoir.'
            : 'Ce moment clé illustre déjà ce savoir.',
        );
      if (existantes.length >= LIMITES.illustrationsParSavoir)
        throw conflit(
          `Un savoir compte ${LIMITES.illustrationsParSavoir} illustrations au plus : retirez-en une d’abord.`,
        );
      await tx.insert(illustrationSavoir).values({
        savoir,
        creationId,
        momentCleId: momentId,
        note,
        ordre: existantes.length,
      });
      await auditer(tx, adminId, 'SAVOIR_ILLUSTRATION_AJOUTEE', 'creation', creationId, {
        savoir,
        moment: momentId,
      });
    });
    return this.lire();
  }

  async retirerIllustration(adminId: number, id: number): Promise<SavoirsAdministresApi> {
    await this.db.transaction(async (tx) => {
      const [retiree] = await tx
        .delete(illustrationSavoir)
        .where(eq(illustrationSavoir.id, id))
        .returning({
          savoir: illustrationSavoir.savoir,
          creationId: illustrationSavoir.creationId,
        });
      if (!retiree) throw introuvable('Cette illustration est introuvable.');
      await auditer(tx, adminId, 'SAVOIR_ILLUSTRATION_RETIREE', 'creation', retiree.creationId, {
        savoir: retiree.savoir,
      });
    });
    return this.lire();
  }

  /** Un sujet par savoir : le nouveau remplace l'ancien. */
  async lierSujet(
    adminId: number,
    savoir: string,
    sujetId: number,
  ): Promise<SavoirsAdministresApi> {
    await this.db.transaction(async (tx) => {
      const [s] = await tx
        .select({ id: sujet.id })
        .from(sujet)
        .innerJoin(contenu, eq(contenu.id, sujet.id))
        .where(and(eq(sujet.id, sujetId), eq(contenu.statut, 'VISIBLE')));
      if (!s) throw conflit(SUJET_INVISIBLE, { sujetId: SUJET_INVISIBLE });
      const [avant] = await tx
        .select({ sujetId: sujetSavoir.sujetId })
        .from(sujetSavoir)
        .where(eq(sujetSavoir.savoir, savoir))
        .for('update');
      if (avant?.sujetId === sujetId) return;
      await tx
        .insert(sujetSavoir)
        .values({ savoir, sujetId })
        .onConflictDoUpdate({
          target: sujetSavoir.savoir,
          set: { sujetId, dateAjout: new Date() },
        });
      await auditer(tx, adminId, 'SAVOIR_SUJET_LIE', 'sujet', sujetId, {
        savoir,
        avant: avant?.sujetId ?? null,
      });
    });
    return this.lire();
  }

  async retirerSujet(adminId: number, savoir: string): Promise<SavoirsAdministresApi> {
    await this.db.transaction(async (tx) => {
      const [retire] = await tx
        .delete(sujetSavoir)
        .where(eq(sujetSavoir.savoir, savoir))
        .returning({ sujetId: sujetSavoir.sujetId });
      if (!retire) throw introuvable('Aucun sujet n’est lié à ce savoir.');
      await auditer(tx, adminId, 'SAVOIR_SUJET_RETIRE', 'sujet', retire.sujetId, { savoir });
    });
    return this.lire();
  }

  /** Illustrations (dans leur ordre) et sujets de tous les savoirs, avec leur état. */
  private async lire(db: Executeur = this.db): Promise<SavoirsAdministresApi> {
    const [lignes, liens] = await Promise.all([
      db
        .select({
          id: illustrationSavoir.id,
          savoir: illustrationSavoir.savoir,
          note: illustrationSavoir.note,
          creationId: creation.id,
          slug: creation.slug,
          titre: creation.titre,
          type: creation.typeCreation,
          auteurId: contenu.auteurId,
          visible: creationVisible,
          moment: {
            id: momentCle.id,
            type: momentCle.type,
            titre: momentCle.titre,
            texte: momentCle.explication,
          },
        })
        .from(illustrationSavoir)
        .innerJoin(creation, eq(creation.id, illustrationSavoir.creationId))
        .innerJoin(contenu, eq(contenu.id, creation.id))
        .leftJoin(momentCle, eq(momentCle.id, illustrationSavoir.momentCleId))
        .orderBy(
          asc(illustrationSavoir.savoir),
          asc(illustrationSavoir.ordre),
          asc(illustrationSavoir.id),
        ),
      db
        .select({
          savoir: sujetSavoir.savoir,
          id: sujet.id,
          slug: sujet.slug,
          titre: sujet.titre,
          typeSujet: sujet.typeSujet,
          accepte: sujet.messageAccepteId,
          fermeture: sujet.dateFermeture,
          visible: sql<boolean>`${contenu.statut} = 'VISIBLE'`,
        })
        .from(sujetSavoir)
        .innerJoin(sujet, eq(sujet.id, sujetSavoir.sujetId))
        .innerJoin(contenu, eq(contenu.id, sujet.id)),
    ]);
    const [apercus, membres] = await Promise.all([
      apercusDesCreations(db, this.stockage, [
        ...new Map(lignes.map((l) => [l.creationId, { id: l.creationId, type: l.type }])).values(),
      ]),
      resumerMembres(
        db,
        this.stockage,
        lignes.map((l) => l.auteurId),
      ),
    ]);
    const resultat: SavoirsAdministresApi = { illustrations: {}, sujets: {} };
    for (const l of lignes) {
      const auteur = membres.get(l.auteurId);
      if (!auteur) continue;
      const apercu = apercus.get(l.creationId);
      const illustration: IllustrationAdministreeApi = {
        id: l.id,
        creation: {
          id: l.creationId,
          slug: l.slug ?? '',
          titre: l.titre ?? '',
          type: l.type,
          couverture: apercu?.couverture ?? null,
          resultat: apercu?.resultat ?? null,
          auteur,
          outil: apercu?.outils[0] ?? null,
        },
        moment: l.moment ? { ...l.moment, texte: l.moment.texte ?? '' } : null,
        note: l.note,
        // Une illustration a un moment ou une note : sans l'un ni l'autre, le moment choisi a disparu
        // (l'auteur a réécrit sa création) et il n'y a plus rien à montrer.
        etat: !l.visible
          ? 'CREATION_INVISIBLE'
          : !l.moment && !l.note
            ? 'MOMENT_DISPARU'
            : 'MONTREE',
      };
      (resultat.illustrations[l.savoir] ??= []).push(illustration);
    }
    for (const s of liens)
      resultat.sujets[s.savoir] = {
        id: s.id,
        slug: s.slug,
        titre: s.titre,
        typeSujet: s.typeSujet,
        // RG-65 avant RG-63 : un sujet fermé l'est, même avec une réponse acceptée.
        etat: s.fermeture ? 'FERME' : s.accepte ? 'RESOLU' : 'OUVERT',
        visible: s.visible,
      } satisfies SujetSavoirAdministreApi;
    return resultat;
  }
}
