import { Inject, Injectable } from '@nestjs/common';
import {
  ETAT_VISITEUR,
  ROLE_AFFICHE,
  compteAffiche,
  niveauPourReputation,
  type CodeNiveau,
  type SessionApi,
} from '@vysora/shared';
import { and, eq, gt, max, sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  decisionModeration,
  mouvementReputation,
  niveau,
  notification,
} from '../../db/schema/index.js';
import { Stockage } from '../medias/stockage.js';
import { DocumentsLegauxService } from './documents-legaux.service.js';
import type { RequeteVysora, SessionOuverte } from './requete.js';

export const SESSION_VISITEUR: SessionApi = {
  etat: ETAT_VISITEUR,
  membre: null,
  nonLues: 0,
  suspensionJusqua: null,
  conditionsDepuis: null,
};

/* État du compte vu par l'interface (prototype/etats.js) et par la garde des droits :
   niveau tiré de la réputation (RG-83, RG-84), lecture seule tant que l'e-mail n'est pas vérifié
   (RG-02), que les documents en vigueur ne sont pas acceptés (F-04) ou pendant une suspension (RG-103). */
@Injectable()
export class EtatCompteService {
  constructor(
    @Inject(BASE) private readonly db: BaseDeDonnees,
    private readonly documents: DocumentsLegauxService,
    private readonly stockage: Stockage,
  ) {}

  /** Calculé au plus une fois par requête (garde des droits, puis contrôleur). */
  pour(requete: RequeteVysora): Promise<SessionApi> {
    requete.etatSession ??= this.calculer(requete.sessionOuverte);
    return requete.etatSession;
  }

  async calculer(ouverte?: SessionOuverte): Promise<SessionApi> {
    if (!ouverte) return SESSION_VISITEUR;
    const membre = ouverte.utilisateur;
    const maintenant = new Date();

    const [[reputation], nonLues, [suspension], aAccepter, niveaux] = await Promise.all([
      this.db
        .select({ points: sql<number>`coalesce(sum(${mouvementReputation.points}), 0)::int` })
        .from(mouvementReputation)
        .where(eq(mouvementReputation.beneficiaireId, membre.id)),
      this.db.$count(
        notification,
        and(eq(notification.destinataireId, membre.id), eq(notification.estLue, false)),
      ),
      this.db
        .select({ fin: max(decisionModeration.dateFinSuspension) })
        .from(decisionModeration)
        .where(
          and(
            eq(decisionModeration.membreViseId, membre.id),
            eq(decisionModeration.action, 'SUSPENDRE'),
            gt(decisionModeration.dateFinSuspension, maintenant),
          ),
        ),
      this.documents.aAccepter(membre.id),
      this.db.select().from(niveau),
    ]);

    const points = Math.max(0, reputation?.points ?? 0);
    const finSuspension = suspension?.fin ?? null;
    const conditionsDepuis =
      aAccepter
        .map((document) => document.dateEffet)
        .toSorted()
        .at(-1) ?? null;

    return {
      etat: {
        session: 'membre',
        role: ROLE_AFFICHE[membre.role],
        niveau: niveauPourReputation(
          points,
          niveaux.map((n) => ({ ...n, code: n.code as CodeNiveau })),
        ).code,
        compte: compteAffiche({
          statut: membre.statutCompte,
          emailVerifie: membre.emailVerifie,
          documentsAAccepter: aAccepter.length > 0,
          suspenduJusqua: finSuspension,
          maintenant,
        }),
      },
      membre: {
        id: membre.id,
        pseudo: membre.pseudo,
        nom: membre.pseudo,
        points,
        avatar: membre.avatar ? this.stockage.adresse(membre.avatar) : null,
      },
      nonLues,
      suspensionJusqua: finSuspension?.toISOString() ?? null,
      conditionsDepuis,
    };
  }
}
