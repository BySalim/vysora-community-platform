import { Inject, Injectable } from '@nestjs/common';
import {
  ETAT_VISITEUR,
  ROLE_AFFICHE,
  compteAffiche,
  niveauPourReputation,
  type SessionApi,
} from '@vysora/shared';
import { eq, sql } from 'drizzle-orm';
import { BASE } from '../../db/base-de-donnees.module.js';
import type { BaseDeDonnees } from '../../db/client.js';
import {
  acceptationDocument,
  decisionModeration,
  documentLegal,
  mouvementReputation,
  notification,
  utilisateur,
} from '../../db/schema/index.js';

export const SESSION_VISITEUR: SessionApi = { etat: ETAT_VISITEUR, membre: null, nonLues: 0 };

/** Membre de la requête principale, qualifié : dans une sélection sur une seule table, Drizzle écrit
    les colonnes sans leur table, et « id » désignerait alors celui de la sous-requête. */
const MEMBRE = sql.raw('"utilisateur"."id"');

/* État du visiteur (EtatVisiteur) calculé à partir des données : rôle, niveau (RG-84, d'après la
   réputation RG-83), compte en lecture seule (e-mail à vérifier RG-02, conditions à accepter RG-03,
   suspension F-91) et notifications non lues. Une seule requête, avec des sous-requêtes indexées. */
@Injectable()
export class EtatVisiteurService {
  constructor(@Inject(BASE) private readonly db: BaseDeDonnees) {}

  async pour(utilisateurId: number, maintenant = new Date()): Promise<SessionApi> {
    const [ligne] = await this.db
      .select({
        id: utilisateur.id,
        pseudo: utilisateur.pseudo,
        email: utilisateur.email,
        emailVerifie: utilisateur.emailVerifie,
        role: utilisateur.role,
        statutCompte: utilisateur.statutCompte,
        avatar: utilisateur.avatar,
        points:
          sql<number>`coalesce((select sum(${mouvementReputation.points}) from ${mouvementReputation} where ${mouvementReputation.beneficiaireId} = ${MEMBRE}), 0)`.mapWith(
            Number,
          ),
        suspenduJusqua:
          sql<Date | null>`(select max(${decisionModeration.dateFinSuspension}) from ${decisionModeration} where ${decisionModeration.membreViseId} = ${MEMBRE} and ${decisionModeration.action} = 'SUSPENDRE')`.mapWith(
            decisionModeration.dateFinSuspension,
          ),
        documentsAAccepter: sql<boolean>`exists (${this.documentsNonAcceptes()})`,
        nonLues:
          sql<number>`(select count(*) from ${notification} where ${notification.destinataireId} = ${MEMBRE} and not ${notification.estLue})`.mapWith(
            Number,
          ),
      })
      .from(utilisateur)
      .where(eq(utilisateur.id, utilisateurId));
    if (!ligne?.email) return SESSION_VISITEUR;

    const suspendu =
      ligne.suspenduJusqua && ligne.suspenduJusqua > maintenant ? ligne.suspenduJusqua : null;
    const points = Math.max(0, ligne.points);
    return {
      etat: {
        session: 'membre',
        role: ROLE_AFFICHE[ligne.role],
        niveau: niveauPourReputation(points).code,
        compte: compteAffiche({
          statut: ligne.statutCompte,
          emailVerifie: ligne.emailVerifie,
          documentsAAccepter: ligne.documentsAAccepter,
          suspenduJusqua: suspendu,
          maintenant,
        }),
      },
      membre: {
        id: ligne.id,
        pseudo: ligne.pseudo,
        email: ligne.email,
        points,
        avatar: ligne.avatar,
        suspenduJusqua: suspendu?.toISOString() ?? null,
      },
      nonLues: ligne.nonLues,
    };
  }

  /** RG-03, RG-112 : version en vigueur d'un document à accepter, que le membre n'a pas acceptée. */
  private documentsNonAcceptes() {
    return sql`select 1 from ${documentLegal} d
      where d.acceptation_requise and d.date_effet <= current_date
        and not exists (select 1 from ${documentLegal} plus_recent
          where plus_recent.type = d.type and plus_recent.date_effet <= current_date and plus_recent.date_effet > d.date_effet)
        and not exists (select 1 from ${acceptationDocument} a
          where a.utilisateur_id = ${MEMBRE} and a.document_legal_id = d.id)`;
  }
}
