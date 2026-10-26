import { Inject, Injectable } from '@nestjs/common';
import {
  BAREME_REPUTATION,
  SEUILS,
  type NouvelleReproduction,
  type ReproductionDeclareeApi,
} from '@vysora/shared';
import { and, count, eq } from 'drizzle-orm';
import { conflit, erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { contenu, creation, modele, outil, reproduction } from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { resumerMembres } from '../membres/resumes.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ReputationService } from '../progression/reputation.service.js';
import { lireCible } from './cibles.js';

/* INT-02 : déclarer une reproduction (F-32, RG-42) et les indicateurs qui en découlent (F-33, RG-43).
   Points (RG-80) : +2 au membre pour sa première reproduction d'une création, +5 à l'auteur pour
   la première réussite déclarée par ce membre ; une seule fois par membre et par création. */
@Injectable()
export class ReproductionsService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly stockage: Stockage,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
  ) {}

  async declarer(
    membreId: number,
    creationId: number,
    saisie: NouvelleReproduction,
  ): Promise<ReproductionDeclareeApi> {
    const cible = await lireCible(this.db, creationId);
    if (!cible?.public || cible.type !== 'CREATION')
      throw introuvable('Cette création est introuvable.');
    if (cible.auteurId === membreId)
      throw interdit('Les reproductions viennent des autres membres.');
    const [{ type } = { type: null }] = await this.db
      .select({ type: creation.typeCreation })
      .from(creation)
      .where(eq(creation.id, creationId));
    if (type === 'PROJET')
      throw conflit('Un projet ne se reproduit pas : seuls les prompts et les itérations le sont.');

    const [outilChoisi] = await this.db
      .select({ id: outil.id, statut: outil.statut })
      .from(outil)
      .where(eq(outil.id, saisie.outilId));
    if (!outilChoisi || outilChoisi.statut !== 'ACTIF')
      throw erreurValidation({ outilId: 'Choisissez un outil de la liste.' });
    if (saisie.modeleId) {
      const existe = await this.db.$count(modele, eq(modele.id, saisie.modeleId));
      if (!existe) throw erreurValidation({ modeleId: 'Choisissez un modèle de la liste.' });
    }

    const id = await this.db.transaction(async (tx) => {
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'REPRODUCTION', auteurId: membreId })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Reproduction non enregistrée');
      await tx.insert(reproduction).values({
        id: ligne.id,
        creationId,
        outilId: saisie.outilId,
        modeleId: saisie.modeleId ?? null,
        modeleNonReference: saisie.modeleNonReference,
        resultat: saisie.resultat,
        retour: saisie.retour,
        reponseObtenue: saisie.reponseObtenue,
      });
      await this.reputation.crediterUneFois(tx, {
        beneficiaireId: membreId,
        acteurId: membreId,
        contenuId: creationId,
        motif: 'REPRODUCTION_DECLAREE',
        points: BAREME_REPUTATION.reproductionDeclaree,
      });
      const points =
        saisie.resultat === 'SUCCES'
          ? await this.reputation.crediterUneFois(tx, {
              beneficiaireId: cible.auteurId,
              acteurId: membreId,
              contenuId: creationId,
              motif: 'REPRODUCTION_REUSSIE_RECUE',
              points: BAREME_REPUTATION.reproductionReussieRecue,
            })
          : 0;
      // RG-91 : reproduction de ma création, avec les points qu'elle m'a rapportés.
      await this.notifications.notifier(tx, {
        type: 'REPRODUCTION_RECUE',
        destinataireId: cible.auteurId,
        declencheurId: membreId,
        contenuId: ligne.id,
        donnees: points ? { points } : undefined,
      });
      return ligne.id;
    });
    return this.presenter(id, creationId);
  }

  private async presenter(id: number, creationId: number): Promise<ReproductionDeclareeApi> {
    const [ligne] = await this.db
      .select({
        auteurId: contenu.auteurId,
        date: contenu.dateCreation,
        resultat: reproduction.resultat,
        retour: reproduction.retour,
        outil: {
          id: outil.id,
          nom: outil.nom,
          slug: outil.slug,
          logo: outil.logo,
          logoMonochrome: outil.logoMonochrome,
        },
        modele: modele.nomCourt,
        modeleNonReference: reproduction.modeleNonReference,
      })
      .from(reproduction)
      .innerJoin(contenu, eq(contenu.id, reproduction.id))
      .innerJoin(outil, eq(outil.id, reproduction.outilId))
      .leftJoin(modele, eq(modele.id, reproduction.modeleId))
      .where(eq(reproduction.id, id));
    if (!ligne) throw introuvable();
    const visibles = and(eq(reproduction.creationId, creationId), eq(contenu.statut, 'VISIBLE'));
    const compter = (resultat?: 'SUCCES') =>
      this.db
        .select({ n: count() })
        .from(reproduction)
        .innerJoin(contenu, eq(contenu.id, reproduction.id))
        .where(resultat ? and(visibles, eq(reproduction.resultat, resultat)) : visibles);
    const [[total], [reussies], membres] = await Promise.all([
      compter(),
      compter('SUCCES'),
      resumerMembres(this.db, this.stockage, [ligne.auteurId]),
    ]);
    const auteur = membres.get(ligne.auteurId);
    if (!auteur) throw introuvable();
    const n = total?.n ?? 0;
    const r = reussies?.n ?? 0;
    return {
      reproduction: {
        id,
        auteur,
        date: ligne.date.toISOString(),
        resultat: ligne.resultat,
        outil: ligne.outil,
        modele: ligne.modele ?? ligne.modeleNonReference,
        retour: ligne.retour,
      },
      total: n,
      reussies: r,
      tauxSucces: n >= SEUILS.reproductionsPourTauxDeSucces ? Math.round((r / n) * 100) : null,
    };
  }
}
