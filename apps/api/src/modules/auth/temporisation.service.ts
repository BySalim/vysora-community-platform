import { Inject, Injectable } from '@nestjs/common';
import { DELAIS } from '@vysora/shared';
import { and, desc, eq, gt } from 'drizzle-orm';
import { CONFIG } from '../../config/configuration.module.js';
import type { Configuration } from '../../config/env.js';
import { empreinteSalee } from '../../commun/securite/empreintes.js';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import { tentativeConnexion } from '../../db/schema/index.js';

/** Les échecs plus anciens sont oubliés. */
const FENETRE_MS = 24 * 60 * 60_000;

/** F-03 : secondes d'attente après `echecs` échecs consécutifs (30 s à 5 échecs, doublées ensuite, 15 min au plus). */
export function attenteApres(echecs: number): number {
  const { echecsConnexionAvantTemporisation: seuil, temporisationConnexionSecondes: delais } =
    DELAIS;
  if (echecs < seuil) return 0;
  return Math.min(delais.initiale * 2 ** (echecs - seuil), delais.maximale);
}

/* F-03 : après 5 échecs consécutifs sur une même adresse, les tentatives suivantes sont temporisées.
   Le compte est désigné par l'empreinte de l'adresse saisie, qu'elle corresponde à un compte ou non :
   le comportement est le même dans les deux cas, ce qui ne révèle pas les comptes existants. */
@Injectable()
export class TemporisationService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    @Inject(CONFIG) private readonly config: Configuration,
  ) {}

  empreinte(email: string): string {
    return empreinteSalee(this.config.SEL_EMPREINTES, `connexion:${email.trim().toLowerCase()}`);
  }

  /** Secondes restant à attendre avant une nouvelle tentative (0 : tentative permise). */
  async attente(empreinteIdentifiant: string, maintenant = new Date()): Promise<number> {
    const recentes = await this.db
      .select({ reussie: tentativeConnexion.reussie, date: tentativeConnexion.date })
      .from(tentativeConnexion)
      .where(
        and(
          eq(tentativeConnexion.empreinteIdentifiant, empreinteIdentifiant),
          gt(tentativeConnexion.date, new Date(maintenant.getTime() - FENETRE_MS)),
        ),
      )
      .orderBy(desc(tentativeConnexion.date), desc(tentativeConnexion.id))
      .limit(30);

    const premiereReussie = recentes.findIndex((tentative) => tentative.reussie);
    const echecs = premiereReussie === -1 ? recentes.length : premiereReussie;
    const attente = attenteApres(echecs);
    const dernierEchec = recentes[0]?.date;
    if (!attente || !dernierEchec) return 0;
    const fin = dernierEchec.getTime() + attente * 1000;
    return Math.max(0, Math.ceil((fin - maintenant.getTime()) / 1000));
  }

  async enregistrer(tentative: {
    empreinteIdentifiant: string;
    utilisateurId: number | null;
    ip?: string;
    reussie: boolean;
  }): Promise<void> {
    await this.db.insert(tentativeConnexion).values({
      empreinteIdentifiant: tentative.empreinteIdentifiant,
      utilisateurId: tentative.utilisateurId,
      empreinteIp: tentative.ip ? empreinteSalee(this.config.SEL_EMPREINTES, tentative.ip) : null,
      reussie: tentative.reussie,
      // Même horloge que le calcul de l'attente (celle de la base peut différer de quelques millisecondes).
      date: new Date(),
    });
  }
}
