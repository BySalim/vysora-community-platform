import {
  Catch,
  HttpException,
  Inject,
  Logger,
  Optional,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { typeProbleme, type CodeErreur, type ProblemeApi } from '@vysora/shared';
import type { Request, Response } from 'express';
import { ErreurApplication, STATUT_HTTP, TITRE_ERREUR } from '../erreurs.js';
import { RELEVE_ERREURS, type ReleveErreurs } from './releve-erreurs.js';

const CODE_PAR_STATUT: Record<number, CodeErreur> = {
  400: 'VALIDATION',
  401: 'NON_AUTHENTIFIE',
  403: 'INTERDIT',
  404: 'INTROUVABLE',
  409: 'CONFLIT',
  413: 'VALIDATION',
  429: 'TROP_DE_REQUETES',
};

/* Toute erreur sort au même format (RFC 9457, application/problem+json).
   Une erreur inattendue est journalisée avec sa pile, sans aucun détail technique dans la réponse.
   LEG-03 : l'erreur est relevée pour la mesure d'audience avant la réponse (erreurs internes par
   route ; étape d'une visite suivie), sauf celles de la mesure elle-même. */
@Catch()
export class FiltreErreurs implements ExceptionFilter {
  private readonly journal = new Logger('Erreurs');

  constructor(@Optional() @Inject(RELEVE_ERREURS) private readonly releve?: ReleveErreurs) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const reponse = http.getResponse<Response>();
    const requete = http.getRequest<Request | undefined>();
    const probleme = this.convertir(exception);
    if (probleme.status >= 500) this.journal.error(exception);
    if (this.releve && requete && !requete.path?.startsWith('/api/v1/audience'))
      try {
        await this.releve.enregistrerErreurApi(requete, probleme.status, probleme.code);
      } catch (erreur) {
        this.journal.warn(`Erreur non relevée pour la mesure d’audience : ${String(erreur)}`);
      }
    if (probleme.reessayerDans) reponse.setHeader('Retry-After', String(probleme.reessayerDans));
    reponse.status(probleme.status).type('application/problem+json').json(probleme);
  }

  convertir(exception: unknown): ProblemeApi {
    if (exception instanceof ErreurApplication) {
      return {
        type: typeProbleme(exception.code),
        title: TITRE_ERREUR[exception.code],
        status: STATUT_HTTP[exception.code],
        code: exception.code,
        ...(exception.detail ? { detail: exception.detail } : {}),
        ...(exception.erreurs ? { erreurs: exception.erreurs } : {}),
        ...exception.extensions,
      };
    }
    const statut = statutHttp(exception);
    const code =
      statut && statut < 500 ? (CODE_PAR_STATUT[statut] ?? 'VALIDATION') : 'ERREUR_INTERNE';
    return {
      type: typeProbleme(code),
      title:
        statut === 404 ? 'Cette adresse ne correspond à aucune ressource.' : TITRE_ERREUR[code],
      status: code === 'ERREUR_INTERNE' ? 500 : (statut ?? 500),
      code,
    };
  }
}

/** Statut porté par une exception Nest ou par une erreur de lecture du corps (JSON invalide, corps trop lourd). */
function statutHttp(exception: unknown): number | undefined {
  if (exception instanceof HttpException) return exception.getStatus();
  const erreur = exception as { status?: unknown; statusCode?: unknown; expose?: unknown } | null;
  const statut = Number(erreur?.status ?? erreur?.statusCode);
  return erreur?.expose === true && statut >= 400 && statut < 500 ? statut : undefined;
}
