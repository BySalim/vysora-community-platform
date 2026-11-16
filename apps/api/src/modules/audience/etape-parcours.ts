import {
  Injectable,
  Logger,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { EvenementParcours } from '@vysora/shared';
import type { Request } from 'express';
import { concatMap, type Observable } from 'rxjs';
import { AudienceService } from './audience.service.js';

const CLE_ETAPE_PARCOURS = 'vysora:etape-parcours';

/** LEG-03 : action dont la réussite s'inscrit dans la visite suivie de la personne, si elle a
    accepté le suivi des parcours (inscription, publication…). Rien n'est relevé en cas d'échec : le
    filtre des erreurs s'en charge. */
export const EtapeParcours = (evenement: EvenementParcours) =>
  SetMetadata(CLE_ETAPE_PARCOURS, evenement);

/** Inscrit l'étape après la réussite de l'action, sans jamais faire échouer la réponse. */
@Injectable()
export class EtapeParcoursInterceptor implements NestInterceptor {
  private readonly journal = new Logger('Audience');

  constructor(
    private readonly reflecteur: Reflector,
    private readonly audience: AudienceService,
  ) {}

  intercept(contexte: ExecutionContext, suite: CallHandler): Observable<unknown> {
    const evenement = this.reflecteur.get<EvenementParcours | undefined>(
      CLE_ETAPE_PARCOURS,
      contexte.getHandler(),
    );
    if (!evenement || contexte.getType() !== 'http') return suite.handle();
    const requete = contexte.switchToHttp().getRequest<Request>();
    return suite.handle().pipe(
      concatMap(async (resultat: unknown) => {
        try {
          await this.audience.enregistrerEvenement(requete, evenement);
        } catch (erreur) {
          this.journal.warn(`Étape du parcours non enregistrée : ${String(erreur)}`);
        }
        return resultat;
      }),
    );
  }
}
