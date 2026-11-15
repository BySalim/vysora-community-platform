import { Inject, Injectable } from '@nestjs/common';
import {
  ASSISTANTS_IA,
  NATURES_PASSAGE,
  cheminMesure,
  reconnaitreAssistant,
  type CodeAssistantIa,
  type CompteursPassages,
  type MesureAssistantsApi,
  type NaturePassage,
  type SaisiePassageAssistant,
} from '@vysora/shared';
import { and, gte, lte, sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { passageAssistant } from '../../db/schema/index.js';

const JOUR_MS = 86_400_000;
const PAGES_AFFICHEES = 20;
const jourUtc = (date: Date): string => date.toISOString().slice(0, 10);
const zero = (): CompteursPassages => ({ VISITE: 0, LECTURE: 0, EXPLORATION: 0, ENTRAINEMENT: 0 });
const total = (c: CompteursPassages) => NATURES_PASSAGE.reduce((s, n) => s + c[n], 0);

/* REF-03 : passages des assistants d'IA sur les pages du site. Le serveur du site signale les pages
   servies à un assistant ou à une personne venue de l'un d'eux ; l'API les reconnaît de nouveau
   (le signalement ne fait pas foi) et n'en garde qu'un compteur par jour, assistant, nature et page. */
@Injectable()
export class AssistantsIaService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  /** Compte le passage s'il vient d'un assistant et vise une page mesurée ; sinon, rien. */
  async enregistrer(saisie: SaisiePassageAssistant, maintenant = new Date()): Promise<void> {
    const chemin = cheminMesure(saisie.adresse);
    if (!chemin) return;
    const utmSource = new URL(saisie.adresse, 'http://vysora.invalid').searchParams.get(
      'utm_source',
    );
    const passage = reconnaitreAssistant({
      userAgent: saisie.userAgent,
      referent: saisie.referent,
      utmSource,
    });
    if (!passage) return;
    await this.db
      .insert(passageAssistant)
      .values({ jour: jourUtc(maintenant), ...passage, chemin })
      .onConflictDoUpdate({
        target: [
          passageAssistant.jour,
          passageAssistant.assistant,
          passageAssistant.nature,
          passageAssistant.chemin,
        ],
        set: { nombre: sql`${passageAssistant.nombre} + 1` },
      });
  }

  /** Tableau de l'administration : les `jours` derniers jours, aujourd'hui compris (UTC). */
  async mesure(jours: number, maintenant = new Date()): Promise<MesureAssistantsApi> {
    const au = jourUtc(maintenant);
    const du = jourUtc(new Date(maintenant.getTime() - (jours - 1) * JOUR_MS));
    const periode = and(gte(passageAssistant.jour, du), lte(passageAssistant.jour, au));
    const nombre = sql<number>`sum(${passageAssistant.nombre})::int`;

    const parAssistant = await this.db
      .select({ cle: passageAssistant.assistant, nature: passageAssistant.nature, nombre })
      .from(passageAssistant)
      .where(periode)
      .groupBy(passageAssistant.assistant, passageAssistant.nature);
    const parPage = await this.db
      .select({ cle: passageAssistant.chemin, nature: passageAssistant.nature, nombre })
      .from(passageAssistant)
      .where(periode)
      .groupBy(passageAssistant.chemin, passageAssistant.nature);

    const regrouper = (lignes: { cle: string; nature: string; nombre: number }[]) => {
      const groupes = new Map<string, CompteursPassages>();
      for (const { cle, nature, nombre: n } of lignes) {
        const compteurs = groupes.get(cle) ?? zero();
        compteurs[nature as NaturePassage] += n;
        groupes.set(cle, compteurs);
      }
      return [...groupes];
    };

    const totaux = zero();
    for (const { nature, nombre: n } of parAssistant) totaux[nature as NaturePassage] += n;
    const assistants = regrouper(parAssistant)
      .map(([code, compteurs]) => ({
        code: code as CodeAssistantIa,
        nom: ASSISTANTS_IA[code as CodeAssistantIa].nom,
        ...compteurs,
      }))
      .toSorted((a, b) => total(b) - total(a) || a.nom.localeCompare(b.nom, 'fr'));
    // Pages : ce que les personnes et les assistants consultent ; les robots d'entraînement, que
    // robots.txt refuse, n'y entrent pas.
    const utile = (c: CompteursPassages) => c.VISITE + c.LECTURE + c.EXPLORATION;
    const pages = regrouper(parPage)
      .map(([chemin, compteurs]) => ({ chemin, ...compteurs }))
      .filter((p) => utile(p) > 0)
      .toSorted(
        (a, b) =>
          b.VISITE + b.LECTURE - (a.VISITE + a.LECTURE) ||
          utile(b) - utile(a) ||
          a.chemin.localeCompare(b.chemin),
      )
      .slice(0, PAGES_AFFICHEES);

    return { jours, du, au, totaux, assistants, pages };
  }
}
