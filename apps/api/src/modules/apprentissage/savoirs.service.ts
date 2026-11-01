import { Inject, Injectable } from '@nestjs/common';
import {
  LIMITES,
  type EtatSavoir,
  type ImportSavoirs,
  type ProgressionSavoirsApi,
} from '@vysora/shared';
import { and, count, eq, sql } from 'drizzle-orm';
import { conflit } from '../../commun/erreurs.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees, Executeur } from '../../db/client.js';
import { progressionSavoir } from '../../db/schema/index.js';

const TROP_DE_SAVOIRS = `Votre progression compte déjà ${LIMITES.savoirsSuivis} savoirs : effacez-la pour recommencer.`;

/** Date du jour (AAAA-MM-JJ, UTC), comme celle que la page d'Apprendre reçoit du serveur. */
const jour = (maintenant: Date) => maintenant.toISOString().slice(0, 10);

/* Progression du membre sur les savoirs d'Apprendre (APP-03) : savoirs acquis et réponses aux questions
   de vérification, retrouvés sur tous ses appareils. Les savoirs sont des contenus éditoriaux du site :
   l'API garde ce que le membre en dit, sans points ni effet sur d'autres membres (les cas Bon réflexe,
   eux, sont corrigés par l'API, RG-72). */
@Injectable()
export class SavoirsService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async progression(membreId: number, db: Executeur = this.db): Promise<ProgressionSavoirsApi> {
    const lignes = await db
      .select()
      .from(progressionSavoir)
      .where(eq(progressionSavoir.utilisateurId, membreId))
      .orderBy(progressionSavoir.savoir);
    const progression: ProgressionSavoirsApi = { acquis: {}, verifications: {} };
    for (const l of lignes) {
      if (l.dateAcquis) progression.acquis[l.savoir] = l.dateAcquis;
      if (l.choix !== null && l.correcte !== null && l.dateVerification)
        progression.verifications[l.savoir] = {
          choix: l.choix,
          correcte: l.correcte,
          date: l.dateVerification,
        };
    }
    return progression;
  }

  /** État d'un savoir : un savoir déjà acquis garde sa date, une réponse inchangée aussi ; sans acquis
      ni réponse, le savoir sort de la progression. */
  async enregistrer(
    membreId: number,
    savoir: string,
    { acquis, verification }: EtatSavoir,
    maintenant = new Date(),
  ): Promise<ProgressionSavoirsApi> {
    const aujourdhui = jour(maintenant);
    return this.db.transaction(async (tx) => {
      const ou = and(
        eq(progressionSavoir.utilisateurId, membreId),
        eq(progressionSavoir.savoir, savoir),
      );
      const [avant] = await tx.select().from(progressionSavoir).where(ou).for('update');
      const dateAcquis = acquis ? (avant?.dateAcquis ?? aujourdhui) : null;
      const memeReponse =
        verification &&
        avant?.choix === verification.choix &&
        avant.correcte === verification.correcte;
      const reponse = verification
        ? {
            choix: verification.choix,
            correcte: verification.correcte,
            dateVerification: memeReponse ? avant.dateVerification : aujourdhui,
          }
        : { choix: null, correcte: null, dateVerification: null };
      if (!dateAcquis && !verification) {
        await tx.delete(progressionSavoir).where(ou);
      } else if (avant) {
        await tx
          .update(progressionSavoir)
          .set({ dateAcquis, ...reponse })
          .where(ou);
      } else {
        await this.verifierPlace(tx, membreId, 1);
        await tx
          .insert(progressionSavoir)
          .values({ utilisateurId: membreId, savoir, dateAcquis, ...reponse });
      }
      return this.progression(membreId, tx);
    });
  }

  /** Progression gardée dans le navigateur avant la connexion, versée au compte : la date d'acquis la
      plus ancienne l'emporte ; une réponse déjà enregistrée dans le compte reste. Une date à venir
      (horloge de l'appareil) devient celle du jour. */
  async importer(
    membreId: number,
    { acquis, verifications }: ImportSavoirs,
    maintenant = new Date(),
  ): Promise<ProgressionSavoirsApi> {
    const aujourdhui = jour(maintenant);
    const auPlusTard = (date: string) => (date > aujourdhui ? aujourdhui : date);
    const savoirs = [...new Set([...Object.keys(acquis), ...Object.keys(verifications)])];
    return this.db.transaction(async (tx) => {
      if (savoirs.length) {
        const connus = await tx
          .select({ savoir: progressionSavoir.savoir })
          .from(progressionSavoir)
          .where(eq(progressionSavoir.utilisateurId, membreId))
          .for('update');
        const deja = new Set(connus.map((c) => c.savoir));
        await this.verifierPlace(tx, membreId, savoirs.filter((s) => !deja.has(s)).length);
        await tx
          .insert(progressionSavoir)
          .values(
            savoirs.map((savoir) => {
              const v = verifications[savoir];
              return {
                utilisateurId: membreId,
                savoir,
                dateAcquis: acquis[savoir] ? auPlusTard(acquis[savoir]) : null,
                choix: v?.choix ?? null,
                correcte: v?.correcte ?? null,
                dateVerification: v ? auPlusTard(v.date) : null,
              };
            }),
          )
          .onConflictDoUpdate({
            target: [progressionSavoir.utilisateurId, progressionSavoir.savoir],
            set: {
              // least() ignore une valeur nulle : la date connue, ou la plus ancienne des deux.
              dateAcquis: sql`least(${progressionSavoir.dateAcquis}, excluded.date_acquis)`,
              choix: sql`case when ${progressionSavoir.choix} is null then excluded.choix else ${progressionSavoir.choix} end`,
              correcte: sql`case when ${progressionSavoir.choix} is null then excluded.correcte else ${progressionSavoir.correcte} end`,
              dateVerification: sql`case when ${progressionSavoir.choix} is null then excluded.date_verification else ${progressionSavoir.dateVerification} end`,
            },
          });
      }
      return this.progression(membreId, tx);
    });
  }

  /** « Effacer ma progression » : savoirs acquis et réponses aux questions ; les réponses aux cas Bon
      réflexe restent (RG-72 : elles sont définitives). */
  async effacer(membreId: number): Promise<ProgressionSavoirsApi> {
    await this.db.delete(progressionSavoir).where(eq(progressionSavoir.utilisateurId, membreId));
    return { acquis: {}, verifications: {} };
  }

  /** Garde-fou : l'API ne connaît pas la liste des savoirs, elle en borne le nombre par membre. */
  private async verifierPlace(tx: Executeur, membreId: number, nouveaux: number): Promise<void> {
    if (!nouveaux) return;
    const [ligne] = await tx
      .select({ n: count() })
      .from(progressionSavoir)
      .where(eq(progressionSavoir.utilisateurId, membreId));
    if ((ligne?.n ?? 0) + nouveaux > LIMITES.savoirsSuivis) throw conflit(TROP_DE_SAVOIRS);
  }
}
