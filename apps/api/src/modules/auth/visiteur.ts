import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ActionReservee, SessionApi } from '@vysora/shared';
import type { Request } from 'express';

/** Personne qui envoie la requête, quand elle a une session ouverte (posée par SessionGuard). */
export interface Visiteur {
  sessionId: string;
  utilisateurId: number;
  /** État calculé, présent quand la route exige un droit (@Exige). */
  session?: SessionApi;
}

declare global {
  namespace Express {
    interface Request {
      visiteur?: Visiteur | null;
    }
  }
}

export const EXIGE = 'vysora:exige';

/** Droit exigé par une route : l'API refuse avec la raison (connexion, e-mail, conditions, suspension, niveau, rôle). */
export const Exige = (action: ActionReservee) => SetMetadata(EXIGE, action);

/** Visiteur de la requête, ou null sans session. Sous @Exige, il est toujours présent. */
export const VisiteurCourant = createParamDecorator(
  (_donnee: unknown, contexte: ExecutionContext): Visiteur | null =>
    contexte.switchToHttp().getRequest<Request>().visiteur ?? null,
);
