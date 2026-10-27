import { Inject, Injectable } from '@nestjs/common';
import type { TypeContenu } from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { contenu, vueContenu } from '../../db/schema/index.js';
import { lireCible } from './cibles.js';

/** Qui regarde : le membre connecté, sinon l'appareil (adresse IP et navigateur). */
export interface Visiteur {
  membreId: number | null;
  ip?: string;
  userAgent?: string;
}

/** Contenus qui ont une page à eux et dont les vues se comptent. */
const AVEC_VUES: readonly TypeContenu[] = ['CREATION', 'SUJET', 'CAS_BON_REFLEXE'];

/** Robots d'indexation et aperçus de liens : ils ne lisent pas la page. */
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

/** Jour UTC au format AAAA-MM-JJ. */
const jourUtc = (date: Date): string => date.toISOString().slice(0, 10);

/* INT-04, F-23 : une vue par visiteur et par jour. Le visiteur n'est connu que par une empreinte
   salée qui change chaque jour (membre, ou adresse IP et navigateur) : elle ne permet ni de
   retrouver la personne ni de suivre ses visites d'un jour à l'autre, et la tâche de conservation
   l'efface au bout de deux jours (DELAIS.conservationVuesJours). Seul le compteur du contenu reste.
   L'auteur qui relit son contenu ne compte pas, ni un contenu que tous ne voient pas (RG-30). */
@Injectable()
export class VuesService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  /** Compte la vue si c'est la première du jour pour ce visiteur ; ne dit jamais si elle a compté. */
  async compter(contenuId: number, visiteur: Visiteur, maintenant = new Date()): Promise<void> {
    if (visiteur.userAgent && ROBOT.test(visiteur.userAgent)) return;
    if (visiteur.membreId === null && !visiteur.ip) return;
    const cible = await lireCible(this.db, contenuId);
    if (!cible?.public || !AVEC_VUES.includes(cible.type)) return;
    if (cible.auteurId === visiteur.membreId) return;

    const jour = jourUtc(maintenant);
    const identite =
      visiteur.membreId === null
        ? `visiteur:${visiteur.ip}:${visiteur.userAgent ?? ''}`
        : `membre:${visiteur.membreId}`;
    const empreinte = empreinteSalee(this.config.SEL_EMPREINTES, `vue:${jour}:${identite}`);

    await this.db.transaction(async (tx) => {
      const [nouvelle] = await tx
        .insert(vueContenu)
        .values({ contenuId, empreinteVisiteur: empreinte, jour })
        .onConflictDoNothing()
        .returning({ contenuId: vueContenu.contenuId });
      if (nouvelle)
        await tx
          .update(contenu)
          .set({ nbVues: sql`${contenu.nbVues} + 1` })
          .where(eq(contenu.id, contenuId));
    });
  }
}
