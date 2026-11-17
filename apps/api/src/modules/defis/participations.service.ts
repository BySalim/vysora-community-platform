import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGES_PARTICIPATION,
  participationsOuvertes,
  type SaisieParticipation,
} from '@vysora/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { conflit, erreurValidation, interdit, introuvable } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Transaction } from '../../db/client.js';
import { contenu, media, outil, participation } from '../../db/schema/index.js';
import { defiPublic } from './participation.js';

/** Stockage simulé du navigateur, injecté en tête du jeu : dans un cadre à l'origine opaque,
    localStorage et sessionStorage lèvent une erreur ; le jeu les retrouve en mémoire. */
export const MEMOIRE_JEU =
  "(function(){function M(){var d=Object.create(null);return{getItem:function(k){k=String(k);return k in d?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d=Object.create(null)},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:M(),configurable:true})}catch(_){}}})})();";
const ENTETE = `<script>${MEMOIRE_JEU}</script>`;

/** Le jeu tel qu'il est servi : le script de mémoire est placé avant le code du membre. */
export function preparerJeu(html: string): string {
  const head = /<head(\s[^>]*)?>/i;
  const racine = /<html(\s[^>]*)?>/i;
  const doctype = /^\s*<!doctype[^>]*>/i;
  if (head.test(html)) return html.replace(head, (m) => m + ENTETE);
  if (racine.test(html)) return html.replace(racine, (m) => `${m}<head>${ENTETE}</head>`);
  const d = doctype.exec(html);
  return d ? d[0] + ENTETE + html.slice(d[0].length) : ENTETE + html;
}

/* Participations aux défis (S-17), distinctes des créations : une par personne et par défi,
   publiée, modifiée ou supprimée tant que le défi est en cours ; pendant une pause, ni publication
   ni modification (la suppression reste possible). Le défi est verrouillé pendant la décision. */
@Injectable()
export class ParticipationsService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async publier(
    auteurId: number,
    defiId: number,
    saisie: SaisieParticipation,
    maintenant = new Date(),
  ): Promise<{ id: number }> {
    return this.db.transaction(async (tx) => {
      await this.defiOuvert(tx, defiId, maintenant, false);
      const deja = await this.participationDe(tx, defiId, auteurId);
      if (deja) throw conflit(MESSAGES_PARTICIPATION.uniqueParticipation(deja.titre));
      // Défis d'avant : une création inscrite compte aussi comme la participation de la personne.
      const { rows } = await tx.execute<{ titre: string | null }>(sql`
        select cr.titre from creation cr join contenu c on c.id = cr.id
        where cr.defi_id = ${defiId} and c.auteur_id = ${auteurId}
          and cr.statut_publication = 'PUBLIEE' and c.statut <> 'SUPPRIME' limit 1`);
      if (rows[0]) throw conflit(MESSAGES_PARTICIPATION.unique(rows[0].titre));
      await this.verifierReferences(tx, auteurId, saisie, null);
      const [ligne] = await tx
        .insert(contenu)
        .values({ typeContenu: 'PARTICIPATION', auteurId, dateCreation: maintenant })
        .returning({ id: contenu.id });
      if (!ligne) throw new Error('Participation non enregistrée');
      await tx
        .insert(participation)
        .values({ id: ligne.id, defiId, ...this.colonnes(saisie), datePublication: maintenant });
      if (saisie.couvertureId)
        await tx
          .update(media)
          .set({ contenuId: ligne.id })
          .where(eq(media.id, saisie.couvertureId));
      return { id: ligne.id };
    });
  }

  async modifier(
    auteurId: number,
    defiId: number,
    id: number,
    saisie: SaisieParticipation,
    maintenant = new Date(),
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.defiOuvert(tx, defiId, maintenant, false);
      const actuelle = await this.sienne(tx, defiId, id, auteurId);
      await this.verifierReferences(tx, auteurId, saisie, actuelle.couvertureId);
      await tx.update(participation).set(this.colonnes(saisie)).where(eq(participation.id, id));
      await tx.update(contenu).set({ dateModification: maintenant }).where(eq(contenu.id, id));
      if (actuelle.couvertureId !== saisie.couvertureId) {
        // L'ancienne image n'est plus rattachée : le nettoyage des médias la supprime.
        if (actuelle.couvertureId)
          await tx
            .update(media)
            .set({ contenuId: null })
            .where(eq(media.id, actuelle.couvertureId));
        if (saisie.couvertureId)
          await tx.update(media).set({ contenuId: id }).where(eq(media.id, saisie.couvertureId));
      }
    });
  }

  /** Supprimer sa participation tant que le défi est en cours (pendant une pause aussi). */
  async supprimer(
    auteurId: number,
    defiId: number,
    id: number,
    maintenant = new Date(),
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.defiOuvert(tx, defiId, maintenant, true);
      await this.sienne(tx, defiId, id, auteurId);
      await tx.delete(contenu).where(eq(contenu.id, id));
    });
  }

  /** Le jeu d'une participation visible, prêt à servir ; null sinon. */
  async jeu(id: number): Promise<string | null> {
    const [ligne] = await this.db
      .select({ jeu: participation.jeu })
      .from(participation)
      .innerJoin(contenu, eq(contenu.id, participation.id))
      .where(and(eq(participation.id, id), eq(contenu.statut, 'VISIBLE')));
    return ligne?.jeu ? preparerJeu(ligne.jeu) : null;
  }

  /** Le code du jeu, pour que son auteur le retrouve en modifiant sa participation (JSON : jamais
      interprété par le navigateur). */
  async source(
    auteurId: number,
    defiId: number,
    id: number,
  ): Promise<{ jeu: { nom: string; html: string } | null }> {
    const [ligne] = await this.db
      .select({
        auteurId: contenu.auteurId,
        defiId: participation.defiId,
        jeu: participation.jeu,
        jeuNom: participation.jeuNom,
      })
      .from(participation)
      .innerJoin(contenu, eq(contenu.id, participation.id))
      .where(eq(participation.id, id));
    if (!ligne || ligne.defiId !== defiId)
      throw introuvable('Cette participation est introuvable.');
    if (ligne.auteurId !== auteurId)
      throw interdit('Seule l’autrice ou l’auteur modifie sa participation.');
    return { jeu: ligne.jeu ? { nom: ligne.jeuNom ?? 'jeu.html', html: ligne.jeu } : null };
  }

  private colonnes(saisie: SaisieParticipation) {
    return {
      titre: saisie.titre,
      idee: saisie.idee,
      outilId: saisie.outilId,
      modele: saisie.modele,
      prompts: saisie.prompts,
      essais: saisie.essais,
      moment: saisie.moment,
      jeu: saisie.jeu?.html ?? null,
      jeuNom: saisie.jeu?.nom ?? null,
    };
  }

  /** Défi publié et en cours ; en pause, seule la suppression reste possible. */
  private async defiOuvert(
    tx: Transaction,
    defiId: number,
    maintenant: Date,
    suppression: boolean,
  ) {
    const d = await defiPublic(tx, defiId);
    if (!d) throw introuvable(MESSAGES_PARTICIPATION.introuvable);
    if (!participationsOuvertes(d.statut, d.dateDebut, d.dateFin, maintenant))
      throw conflit(MESSAGES_PARTICIPATION.fermees);
    if (d.enPause && !suppression) throw conflit(MESSAGES_PARTICIPATION.pause);
    return d;
  }

  private async participationDe(tx: Transaction, defiId: number, auteurId: number) {
    const [ligne] = await tx
      .select({ id: participation.id, titre: participation.titre })
      .from(participation)
      .innerJoin(contenu, eq(contenu.id, participation.id))
      .where(and(eq(participation.defiId, defiId), eq(contenu.auteurId, auteurId)));
    return ligne ?? null;
  }

  /** La participation `id` du défi, de cette personne ; sa couverture actuelle. */
  private async sienne(tx: Transaction, defiId: number, id: number, auteurId: number) {
    const [ligne] = await tx
      .select({ auteurId: contenu.auteurId, defiId: participation.defiId })
      .from(participation)
      .innerJoin(contenu, eq(contenu.id, participation.id))
      .where(eq(participation.id, id));
    if (!ligne || ligne.defiId !== defiId)
      throw introuvable('Cette participation est introuvable.');
    if (ligne.auteurId !== auteurId)
      throw interdit('Seule l’autrice ou l’auteur modifie sa participation.');
    const [couverture] = await tx
      .select({ id: media.id })
      .from(media)
      .where(eq(media.contenuId, id))
      .limit(1);
    return { couvertureId: couverture?.id ?? null };
  }

  /** L'outil existe et reste proposé ; l'image appartient à l'auteur et n'est rattachée à rien
      d'autre (sauf à cette participation). */
  private async verifierReferences(
    tx: Transaction,
    auteurId: number,
    saisie: SaisieParticipation,
    couvertureActuelle: number | null,
  ) {
    const [o] = await tx
      .select({ statut: outil.statut })
      .from(outil)
      .where(eq(outil.id, saisie.outilId));
    if (!o || o.statut !== 'ACTIF')
      throw erreurValidation({ outilId: 'Choisissez un outil de la liste.' });
    if (saisie.couvertureId && saisie.couvertureId !== couvertureActuelle) {
      const [m] = await tx
        .select({ id: media.id })
        .from(media)
        .where(
          and(
            eq(media.id, saisie.couvertureId),
            eq(media.televerseurId, auteurId),
            isNull(media.contenuId),
          ),
        );
      if (!m)
        throw erreurValidation({
          couvertureId: 'Cette image est introuvable : ajoutez-la de nouveau.',
        });
    }
  }
}
